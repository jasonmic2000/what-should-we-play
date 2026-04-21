import { db } from "./index";
import { groupBookmarks, catalogGames } from "./schema";
import { eq, and } from "drizzle-orm";
import type { BookmarkedGame } from "@/lib/types";

export async function addBookmark(
  groupId: string,
  appId: number,
  userId: string,
): Promise<void> {
  await db
    .insert(groupBookmarks)
    .values({ groupId, appId, addedByUserId: userId })
    .onConflictDoNothing();
}

export async function removeBookmark(
  groupId: string,
  appId: number,
): Promise<void> {
  await db
    .delete(groupBookmarks)
    .where(
      and(
        eq(groupBookmarks.groupId, groupId),
        eq(groupBookmarks.appId, appId),
      ),
    );
}

export async function getBookmarks(
  groupId: string,
): Promise<BookmarkedGame[]> {
  const rows = await db
    .select({
      groupId: groupBookmarks.groupId,
      appId: groupBookmarks.appId,
      addedByUserId: groupBookmarks.addedByUserId,
      addedAt: groupBookmarks.addedAt,
      name: catalogGames.name,
    })
    .from(groupBookmarks)
    .leftJoin(catalogGames, eq(groupBookmarks.appId, catalogGames.appId))
    .where(eq(groupBookmarks.groupId, groupId));

  return rows.map((row) => ({
    groupId: row.groupId,
    appId: row.appId,
    addedByUserId: row.addedByUserId,
    addedAt: row.addedAt.toISOString(),
    name: row.name ?? `App ${row.appId}`,
    headerImageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${row.appId}/header.jpg`,
  }));
}
