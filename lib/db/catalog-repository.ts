import { eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "./index";
import { catalogGames } from "./schema";
import type { CatalogGameInsert, CatalogGameRow } from "../types";

const BATCH_SIZE = 500;

/**
 * Splits an array into chunks of the given size.
 * PostgreSQL has parameter limits, so large IN-clauses need chunking.
 */
function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Batch lookup catalog games by appId.
 * Returns a Map keyed by appId for O(1) lookups during enrichment.
 */
export async function getGamesByAppIds(
  appIds: number[],
): Promise<Map<number, CatalogGameRow>> {
  if (appIds.length === 0) {
    return new Map();
  }

  const result = new Map<number, CatalogGameRow>();
  const batches = chunk(appIds, BATCH_SIZE);

  for (const batch of batches) {
    const rows = await db
      .select()
      .from(catalogGames)
      .where(inArray(catalogGames.appId, batch));

    for (const row of rows) {
      result.set(row.appId, row);
    }
  }

  return result;
}

/**
 * Batch upsert catalog games.
 * On conflict (appId), updates name, isFree, catalogLastSyncedAt,
 * and any other provided fields. Also bumps updatedAt.
 */
export async function upsertGames(games: CatalogGameInsert[]): Promise<void> {
  if (games.length === 0) {
    return;
  }

  const batches = chunk(games, BATCH_SIZE);

  for (const batch of batches) {
    await db
      .insert(catalogGames)
      .values(batch)
      .onConflictDoUpdate({
        target: catalogGames.appId,
        set: {
          name: sql`excluded.name`,
          isFree: sql`excluded.is_free`,
          catalogLastSyncedAt: sql`excluded.catalog_last_synced_at`,
          priceText: sql`excluded.price_text`,
          priceCurrency: sql`excluded.price_currency`,
          hasOnlineCoop: sql`excluded.has_online_coop`,
          hasOnlinePvp: sql`excluded.has_online_pvp`,
          hasLan: sql`excluded.has_lan`,
          hasSharedSplitScreen: sql`excluded.has_shared_split_screen`,
          isGroupPlayable: sql`excluded.is_group_playable`,
          storeLastSyncedAt: sql`excluded.store_last_synced_at`,
          updatedAt: sql`now()`,
        },
      });
  }
}

/**
 * Returns games that haven't been enriched via the store API yet,
 * or whose store data is older than `olderThan`.
 * Ordered by storeLastSyncedAt ASC (nulls first), limited to `limit`.
 * Used by the weekly detail enrichment job.
 */
export async function getStaleGames(
  limit: number,
  olderThan?: Date,
): Promise<CatalogGameRow[]> {
  const conditions = olderThan
    ? or(
        isNull(catalogGames.storeLastSyncedAt),
        lte(catalogGames.storeLastSyncedAt, olderThan),
      )
    : isNull(catalogGames.storeLastSyncedAt);

  return db
    .select()
    .from(catalogGames)
    .where(conditions)
    .orderBy(sql`${catalogGames.storeLastSyncedAt} ASC NULLS FIRST`)
    .limit(limit);
}
