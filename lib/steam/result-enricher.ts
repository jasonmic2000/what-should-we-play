import { getGamesByAppIds } from "@/lib/db/catalog-repository";
import type { SteamGame, EnrichedSharedGame } from "@/lib/types";

/**
 * Enriches shared games with catalog metadata and filters out F2P titles.
 *
 * - Joins each game against the local catalog by appId
 * - Filters out games where isFree === true (MVP default)
 * - If a game isn't in the catalog, it's returned as-is (graceful degradation)
 * - If the DB call fails entirely, returns the original games unenriched
 */
export async function enrichSharedGames(
  sharedGames: SteamGame[],
): Promise<EnrichedSharedGame[]> {
  if (sharedGames.length === 0) {
    return [];
  }

  let catalogMap: Map<number, { isFree: boolean | null; isGroupPlayable: boolean | null }>;

  try {
    const appIds = sharedGames.map((g) => g.appId);
    const rows = await getGamesByAppIds(appIds);

    catalogMap = new Map();
    for (const [appId, row] of rows) {
      catalogMap.set(appId, {
        isFree: row.isFree,
        isGroupPlayable: row.isGroupPlayable,
      });
    }
  } catch (error) {
    console.error("Catalog enrichment failed, returning unenriched games:", error);
    return sharedGames;
  }

  const enriched: EnrichedSharedGame[] = sharedGames.map((game) => {
    const catalog = catalogMap.get(game.appId);
    if (!catalog) {
      return game;
    }
    return {
      ...game,
      isFree: catalog.isFree,
      isGroupPlayable: catalog.isGroupPlayable,
    };
  });

  // Filter out F2P titles by default (MVP)
  return enriched.filter((game) => game.isFree !== true);
}
