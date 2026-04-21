import { db } from "./index";
import { cachedMemberLibraries } from "./schema";
import { eq, and } from "drizzle-orm";

export async function getCachedLibraries(
  groupId: string,
): Promise<Map<string, number[]>> {
  const rows = await db
    .select()
    .from(cachedMemberLibraries)
    .where(eq(cachedMemberLibraries.groupId, groupId));

  const map = new Map<string, number[]>();
  for (const row of rows) {
    map.set(row.steamId64, row.appIds);
  }
  return map;
}

export async function updateCachedLibrary(
  groupId: string,
  steamId64: string,
  appIds: number[],
): Promise<void> {
  await db
    .insert(cachedMemberLibraries)
    .values({ groupId, steamId64, appIds, cachedAt: new Date() })
    .onConflictDoUpdate({
      target: [cachedMemberLibraries.groupId, cachedMemberLibraries.steamId64],
      set: { appIds, cachedAt: new Date() },
    });
}
