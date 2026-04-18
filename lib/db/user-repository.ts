import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import type { AppUser } from "@/lib/types";

function rowToAppUser(row: typeof users.$inferSelect): AppUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName ?? undefined,
    steamId64: row.steamId64 ?? undefined,
    subscriptionTier: row.subscriptionTier as "free" | "paid",
    stripeCustomerId: row.stripeCustomerId ?? undefined,
  };
}

export async function getUserById(
  userId: string
): Promise<AppUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, userId));
  if (rows.length === 0) return null;
  return rowToAppUser(rows[0]);
}

export async function updateSteamId(
  userId: string,
  steamId64: string | null
): Promise<void> {
  await db
    .update(users)
    .set({ steamId64, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function createUser(user: {
  id: string;
  email: string;
}): Promise<void> {
  await db
    .insert(users)
    .values({ id: user.id, email: user.email })
    .onConflictDoNothing({ target: users.id });
}
