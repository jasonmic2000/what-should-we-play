import {
  pgTable,
  primaryKey,
  integer,
  text,
  boolean,
  serial,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// catalog_games — locally cached Steam app metadata
// ---------------------------------------------------------------------------
export const catalogGames = pgTable("catalog_games", {
  appId: integer("app_id").primaryKey(),
  name: text("name").notNull(),
  isFree: boolean("is_free"),
  priceText: text("price_text"),
  priceCurrency: text("price_currency"),
  hasOnlineCoop: boolean("has_online_coop"),
  hasOnlinePvp: boolean("has_online_pvp"),
  hasLan: boolean("has_lan"),
  hasSharedSplitScreen: boolean("has_shared_split_screen"),
  isGroupPlayable: boolean("is_group_playable"),
  catalogLastSyncedAt: timestamp("catalog_last_synced_at", {
    withTimezone: true,
  }),
  storeLastSyncedAt: timestamp("store_last_synced_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// catalog_sync_status — tracks background sync jobs
// ---------------------------------------------------------------------------
export const catalogSyncStatus = pgTable("catalog_sync_status", {
  id: serial("id").primaryKey(),
  jobType: text("job_type").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  itemsProcessed: integer("items_processed").notNull().default(0),
  lastAppId: integer("last_app_id"),
  lastModifiedSince: timestamp("last_modified_since", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// users — extends Supabase auth.users with app-specific profile data
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: text("email").notNull(),
  displayName: text("display_name"),
  steamId64: text("steam_id64").unique(),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// groups — named collections of Steam profiles
// ---------------------------------------------------------------------------
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  creatorUserId: uuid("creator_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// group_members — members of a group (composite PK: group + steam profile)
// ---------------------------------------------------------------------------
export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    steamId64: text("steam_id64").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    role: text("role").notNull().default("member"), // 'admin' | 'member'
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.steamId64] })],
);

// ---------------------------------------------------------------------------
// group_bookmarks — favorited games within a group (composite PK)
// ---------------------------------------------------------------------------
export const groupBookmarks = pgTable(
  "group_bookmarks",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    appId: integer("app_id").notNull(),
    addedByUserId: uuid("added_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.appId] })],
);

// ---------------------------------------------------------------------------
// shared_links — temporary shareable snapshots of group overlap results
// ---------------------------------------------------------------------------
export const sharedLinks = pgTable("shared_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  snapshotData: jsonb("snapshot_data").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// search_history — per-user overlap search history
// ---------------------------------------------------------------------------
export const searchHistory = pgTable("search_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  profilesSearched: text("profiles_searched").array().notNull(),
  sharedGameCount: integer("shared_game_count").notNull(),
  searchedAt: timestamp("searched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// cached_member_libraries — cached library snapshots for notification diffs
// ---------------------------------------------------------------------------
export const cachedMemberLibraries = pgTable(
  "cached_member_libraries",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    steamId64: text("steam_id64").notNull(),
    appIds: integer("app_ids").array().notNull(),
    cachedAt: timestamp("cached_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.steamId64] })],
);
