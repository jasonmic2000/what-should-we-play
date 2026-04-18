import {
  pgTable,
  integer,
  text,
  boolean,
  serial,
  timestamp,
  uuid,
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
