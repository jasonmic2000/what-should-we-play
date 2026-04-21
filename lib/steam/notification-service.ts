import type { GroupMember, NewGameNotification, GameLibrary } from "../types";
import { getGameHeaderImageUrl } from "../constants";
import { fetchGames, fetchPlayerSummaries } from "./game-fetcher";
import {
  getCachedLibraries,
  updateCachedLibrary,
} from "../db/notification-repository";

/**
 * Check for new games that match the group's overlap criteria since last visit.
 * Compares current libraries against cached snapshots, finds new overlap games,
 * then updates the cache. Returns empty array on any failure (graceful degradation).
 */
export async function checkForNewGames(
  groupId: string,
  members: GroupMember[],
): Promise<NewGameNotification[]> {
  try {
    if (members.length < 2) return [];

    const steamIds = members.map((m) => m.steamId64);

    // Fetch cached libraries from DB
    const cachedLibraries = await getCachedLibraries(groupId);

    // If no cached data exists, this is the first visit — seed the cache and return empty
    if (cachedLibraries.size === 0) {
      await seedCachedLibraries(groupId, steamIds);
      return [];
    }

    // Fetch current libraries from Steam (uses existing 10min TTL cache)
    const currentLibraries = new Map<string, number[]>();
    const fetchedLibraries = new Map<string, GameLibrary>();
    for (const steamId of steamIds) {
      try {
        const library = await fetchGames(steamId);
        fetchedLibraries.set(steamId, library);
        currentLibraries.set(
          steamId,
          library.games.map((g) => g.appId),
        );
      } catch {
        // If we can't fetch a member's library, skip them
        continue;
      }
    }

    if (currentLibraries.size < 2) return [];

    // Find new appIds per member (in current but not in cached)
    const newAppIdsByMember = new Map<string, Set<number>>();
    for (const [steamId, currentAppIds] of currentLibraries) {
      const cachedAppIds = cachedLibraries.get(steamId);
      if (!cachedAppIds) {
        // New member since last cache — all their games are "new"
        newAppIdsByMember.set(steamId, new Set(currentAppIds));
        continue;
      }
      const cachedSet = new Set(cachedAppIds);
      const newIds = currentAppIds.filter((id) => !cachedSet.has(id));
      if (newIds.length > 0) {
        newAppIdsByMember.set(steamId, new Set(newIds));
      }
    }

    // If nobody has new games, update cache and return empty
    if (newAppIdsByMember.size === 0) {
      await updateAllCachedLibraries(groupId, currentLibraries);
      return [];
    }

    // Check which new appIds appear in ALL members' current libraries (new overlap games)
    const allCurrentAppIdSets = Array.from(currentLibraries.values()).map(
      (ids) => new Set(ids),
    );
    const allNewAppIds = new Set<number>();
    for (const newIds of newAppIdsByMember.values()) {
      for (const id of newIds) {
        allNewAppIds.add(id);
      }
    }

    const newOverlapAppIds: number[] = [];
    for (const appId of allNewAppIds) {
      if (allCurrentAppIdSets.every((set) => set.has(appId))) {
        newOverlapAppIds.push(appId);
      }
    }

    if (newOverlapAppIds.length === 0) {
      await updateAllCachedLibraries(groupId, currentLibraries);
      return [];
    }

    // Build notification objects — need game names and who added the game
    const summaries = await fetchPlayerSummaries(steamIds);

    // Build a map of appId → game name from already-fetched libraries
    const gameNames = new Map<string, Map<number, string>>();
    for (const [steamId, library] of fetchedLibraries) {
      const nameMap = new Map<number, string>();
      for (const game of library.games) {
        nameMap.set(game.appId, game.name);
      }
      gameNames.set(steamId, nameMap);
    }

    const notifications: NewGameNotification[] = [];
    for (const appId of newOverlapAppIds) {
      // Find who added this game (who has it as "new")
      let addedBy = "Unknown";
      for (const [steamId, newIds] of newAppIdsByMember) {
        if (newIds.has(appId)) {
          const summary = summaries.get(steamId);
          addedBy = summary?.personaname ?? steamId;
          break;
        }
      }

      // Get game name from any member's library
      let name = `App ${appId}`;
      for (const nameMap of gameNames.values()) {
        const gameName = nameMap.get(appId);
        if (gameName) {
          name = gameName;
          break;
        }
      }

      notifications.push({
        appId,
        name,
        headerImageUrl: getGameHeaderImageUrl(appId),
        addedBy,
      });
    }

    // Update cached libraries after diff
    await updateAllCachedLibraries(groupId, currentLibraries);

    return notifications;
  } catch {
    // Graceful degradation — never break the group page
    return [];
  }
}

async function seedCachedLibraries(
  groupId: string,
  steamIds: string[],
): Promise<void> {
  for (const steamId of steamIds) {
    try {
      const library = await fetchGames(steamId);
      const appIds = library.games.map((g) => g.appId);
      await updateCachedLibrary(groupId, steamId, appIds);
    } catch {
      // Skip members whose libraries can't be fetched
      continue;
    }
  }
}

async function updateAllCachedLibraries(
  groupId: string,
  currentLibraries: Map<string, number[]>,
): Promise<void> {
  for (const [steamId, appIds] of currentLibraries) {
    await updateCachedLibrary(groupId, steamId, appIds);
  }
}
