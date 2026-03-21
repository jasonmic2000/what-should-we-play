import { GameLibrary, SteamGame } from "../types";
import { SteamOverlapError } from "./errors";

export function calculateGameOverlap(libraries: GameLibrary[]): SteamGame[] {
  if (libraries.length === 0) {
    return [];
  }

  for (const library of libraries) {
    if (library.isPrivate) {
      throw new SteamOverlapError("PRIVATE_LIBRARY", {
        failedProfile: library.steamId64,
      });
    }
  }

  const ownershipCounts = new Map<number, number>();

  for (const library of libraries) {
    const uniqueAppIds = new Set(library.games.map((game) => game.appId));

    for (const appId of uniqueAppIds) {
      ownershipCounts.set(appId, (ownershipCounts.get(appId) ?? 0) + 1);
    }
  }

  const requiredOwnershipCount = libraries.length;

  return libraries[0].games
    .filter((game) => ownershipCounts.get(game.appId) === requiredOwnershipCount)
    .sort((left, right) => left.name.localeCompare(right.name));
}
