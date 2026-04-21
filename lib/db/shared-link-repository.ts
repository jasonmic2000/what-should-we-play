import { db } from "./index";
import { sharedLinks } from "./schema";
import { eq, and, gt } from "drizzle-orm";
import type { OverlapSnapshot } from "@/lib/types";

const EXPIRY_HOURS = 24;

export async function createSharedLink(
  groupId: string,
  userId: string,
  snapshotData: OverlapSnapshot,
): Promise<string> {
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

  const [row] = await db
    .insert(sharedLinks)
    .values({
      groupId,
      createdByUserId: userId,
      snapshotData,
      expiresAt,
    })
    .returning({ id: sharedLinks.id });

  return row.id;
}

export async function getSharedLink(
  linkId: string,
): Promise<{
  snapshotData: OverlapSnapshot;
  expiresAt: string;
  groupId: string;
} | null> {
  const rows = await db
    .select({
      snapshotData: sharedLinks.snapshotData,
      expiresAt: sharedLinks.expiresAt,
      groupId: sharedLinks.groupId,
    })
    .from(sharedLinks)
    .where(
      and(
        eq(sharedLinks.id, linkId),
        gt(sharedLinks.expiresAt, new Date()),
      ),
    );

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    snapshotData: row.snapshotData as OverlapSnapshot,
    expiresAt: row.expiresAt.toISOString(),
    groupId: row.groupId,
  };
}
