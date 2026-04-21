import { db } from "./index";
import { searchHistory } from "./schema";
import { eq, desc } from "drizzle-orm";
import type { SearchHistoryEntry } from "@/lib/types";

const DEFAULT_LIMIT = 20;

export async function recordSearch(
  userId: string,
  profilesSearched: string[],
  sharedGameCount: number,
): Promise<void> {
  await db.insert(searchHistory).values({
    userId,
    profilesSearched,
    sharedGameCount,
  });
}

export async function getSearchHistory(
  userId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<SearchHistoryEntry[]> {
  const rows = await db
    .select()
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.searchedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    profilesSearched: row.profilesSearched,
    sharedGameCount: row.sharedGameCount,
    searchedAt: row.searchedAt.toISOString(),
  }));
}
