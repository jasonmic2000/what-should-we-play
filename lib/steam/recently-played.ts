import { getRecentlyPlayedGames } from "./api";
import type { RecentlyPlayedLibrary } from "../types";

/**
 * Fetch recently played games for a single Steam user and normalize the response.
 */
export async function fetchRecentlyPlayed(
  steamId64: string,
): Promise<RecentlyPlayedLibrary> {
  const response = await getRecentlyPlayedGames(steamId64);
  const data = response.response;

  return {
    steamId64,
    totalCount: data.total_count ?? 0,
    games: (data.games ?? []).map((g) => ({
      appId: g.appid,
      playtime2Weeks: g.playtime_2weeks,
      playtimeForever: g.playtime_forever,
    })),
  };
}

/**
 * Fetch recently played games for multiple users concurrently.
 */
export async function fetchRecentlyPlayedBatch(
  steamIds: string[],
): Promise<Map<string, RecentlyPlayedLibrary>> {
  const entries = await Promise.all(
    steamIds.map(
      async (id): Promise<[string, RecentlyPlayedLibrary]> => [
        id,
        await fetchRecentlyPlayed(id),
      ],
    ),
  );
  return new Map(entries);
}

/**
 * For each shared appId, sum playtime_2weeks across all users who played it recently.
 * Games not in any user's recently played list get a score of 0.
 */
export function computeRecentlyPlayedRanking(
  recentlyPlayed: Map<string, RecentlyPlayedLibrary>,
  sharedAppIds: number[],
): Map<number, number> {
  const ranking = new Map<number, number>();

  for (const appId of sharedAppIds) {
    ranking.set(appId, 0);
  }

  for (const library of recentlyPlayed.values()) {
    for (const game of library.games) {
      if (ranking.has(game.appId)) {
        ranking.set(game.appId, ranking.get(game.appId)! + game.playtime2Weeks);
      }
    }
  }

  return ranking;
}
