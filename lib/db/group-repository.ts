import { db } from "./index";
import { groups, groupMembers, users } from "./schema";
import { eq, and, or, count } from "drizzle-orm";
import type { Group, GroupMember, GroupWithMembers, GroupRole } from "@/lib/types";

// ---------------------------------------------------------------------------
// Row → domain model mappers
// ---------------------------------------------------------------------------

function rowToGroup(row: typeof groups.$inferSelect): Group {
  return {
    id: row.id,
    name: row.name,
    creatorUserId: row.creatorUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function rowToGroupMember(row: typeof groupMembers.$inferSelect): GroupMember {
  return {
    groupId: row.groupId,
    steamId64: row.steamId64,
    userId: row.userId ?? undefined,
    role: row.role as GroupRole,
    addedAt: row.addedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

export async function createGroup(
  creatorUserId: string,
  name: string,
  memberSteamIds: string[],
): Promise<GroupWithMembers> {
  // Look up creator's steamId64
  const creatorRows = await db
    .select({ steamId64: users.steamId64 })
    .from(users)
    .where(eq(users.id, creatorUserId));
  const creatorSteamId = creatorRows[0]?.steamId64 ?? null;

  // Insert the group
  const [groupRow] = await db
    .insert(groups)
    .values({ name, creatorUserId })
    .returning();

  const groupId = groupRow.id;

  // Build member rows — creator as admin, others as member
  const memberRows: (typeof groupMembers.$inferInsert)[] = [];

  // Add creator if they have a linked Steam profile
  if (creatorSteamId) {
    memberRows.push({
      groupId,
      steamId64: creatorSteamId,
      userId: creatorUserId,
      role: "admin",
    });
  }

  // Add other members (deduplicate against creator's steamId)
  for (const steamId of memberSteamIds) {
    if (steamId === creatorSteamId) continue; // already added as admin
    memberRows.push({
      groupId,
      steamId64: steamId,
      role: "member",
    });
  }

  if (memberRows.length > 0) {
    await db.insert(groupMembers).values(memberRows);
  }

  // Fetch inserted members
  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  return {
    ...rowToGroup(groupRow),
    members: members.map(rowToGroupMember),
  };
}

export async function getGroupById(
  groupId: string,
): Promise<GroupWithMembers | null> {
  const groupRows = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId));

  if (groupRows.length === 0) return null;

  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  return {
    ...rowToGroup(groupRows[0]),
    members: members.map(rowToGroupMember),
  };
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  // Groups where user is creator OR user is a member (via userId in group_members)
  const createdGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.creatorUserId, userId));

  const memberGroupRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const memberGroupIds = memberGroupRows.map((r) => r.groupId);

  // Merge, deduplicating by id
  const groupMap = new Map<string, Group>();
  for (const row of createdGroups) {
    groupMap.set(row.id, rowToGroup(row));
  }

  if (memberGroupIds.length > 0) {
    for (const gId of memberGroupIds) {
      if (groupMap.has(gId)) continue;
      const rows = await db.select().from(groups).where(eq(groups.id, gId));
      if (rows.length > 0) {
        groupMap.set(rows[0].id, rowToGroup(rows[0]));
      }
    }
  }

  return Array.from(groupMap.values());
}

export async function updateGroup(
  groupId: string,
  updates: { name?: string },
): Promise<void> {
  await db
    .update(groups)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(groups.id, groupId));
}

export async function deleteGroup(groupId: string): Promise<void> {
  await db.delete(groups).where(eq(groups.id, groupId));
}

export async function addMember(
  groupId: string,
  steamId64: string,
  userId?: string,
): Promise<void> {
  await db
    .insert(groupMembers)
    .values({ groupId, steamId64, userId, role: "member" });
}

export async function removeMember(
  groupId: string,
  steamId64: string,
): Promise<void> {
  await db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.steamId64, steamId64),
      ),
    );
}

export async function setMemberRole(
  groupId: string,
  steamId64: string,
  role: GroupRole,
): Promise<void> {
  await db
    .update(groupMembers)
    .set({ role })
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.steamId64, steamId64),
      ),
    );
}

export async function getMemberRole(
  groupId: string,
  userId: string,
): Promise<GroupRole | null> {
  // Look up by userId first
  const byUserId = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
      ),
    );

  if (byUserId.length > 0) return byUserId[0].role as GroupRole;

  // Fall back: look up user's steamId64 and check by that
  const userRows = await db
    .select({ steamId64: users.steamId64 })
    .from(users)
    .where(eq(users.id, userId));

  const steamId = userRows[0]?.steamId64;
  if (!steamId) return null;

  const bySteamId = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.steamId64, steamId),
      ),
    );

  if (bySteamId.length > 0) return bySteamId[0].role as GroupRole;

  return null;
}

export async function countUserCreatedGroups(
  userId: string,
): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(groups)
    .where(eq(groups.creatorUserId, userId));

  return result[0]?.value ?? 0;
}
