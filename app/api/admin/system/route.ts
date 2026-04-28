import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Schema info — static list derived from Drizzle schema definitions
// ---------------------------------------------------------------------------
const SCHEMA_INFO = [
  {
    table: "catalog_games",
    columns: [
      { name: "app_id", type: "integer", pk: true },
      { name: "name", type: "text" },
      { name: "is_free", type: "boolean" },
      { name: "price_text", type: "text" },
      { name: "price_currency", type: "text" },
      { name: "has_online_coop", type: "boolean" },
      { name: "has_online_pvp", type: "boolean" },
      { name: "has_lan", type: "boolean" },
      { name: "has_shared_split_screen", type: "boolean" },
      { name: "is_group_playable", type: "boolean" },
      { name: "catalog_last_synced_at", type: "timestamptz" },
      { name: "store_last_synced_at", type: "timestamptz" },
      { name: "created_at", type: "timestamptz" },
      { name: "updated_at", type: "timestamptz" },
    ],
  },
  {
    table: "catalog_sync_status",
    columns: [
      { name: "id", type: "serial", pk: true },
      { name: "job_type", type: "text" },
      { name: "status", type: "text" },
      { name: "started_at", type: "timestamptz" },
      { name: "completed_at", type: "timestamptz" },
      { name: "items_processed", type: "integer" },
      { name: "last_app_id", type: "integer" },
      { name: "last_modified_since", type: "timestamptz" },
      { name: "error_message", type: "text" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    table: "users",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "email", type: "text" },
      { name: "display_name", type: "text" },
      { name: "steam_id64", type: "text" },
      { name: "subscription_tier", type: "text" },
      { name: "stripe_customer_id", type: "text" },
      { name: "created_at", type: "timestamptz" },
      { name: "updated_at", type: "timestamptz" },
    ],
  },
  {
    table: "groups",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "name", type: "text" },
      { name: "creator_user_id", type: "uuid" },
      { name: "created_at", type: "timestamptz" },
      { name: "updated_at", type: "timestamptz" },
    ],
  },
  {
    table: "group_members",
    columns: [
      { name: "group_id", type: "uuid", pk: true },
      { name: "steam_id64", type: "text", pk: true },
      { name: "user_id", type: "uuid" },
      { name: "role", type: "text" },
      { name: "added_at", type: "timestamptz" },
    ],
  },
  {
    table: "group_bookmarks",
    columns: [
      { name: "group_id", type: "uuid", pk: true },
      { name: "app_id", type: "integer", pk: true },
      { name: "added_by_user_id", type: "uuid" },
      { name: "added_at", type: "timestamptz" },
    ],
  },
  {
    table: "shared_links",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "group_id", type: "uuid" },
      { name: "created_by_user_id", type: "uuid" },
      { name: "snapshot_data", type: "jsonb" },
      { name: "expires_at", type: "timestamptz" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    table: "search_history",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "user_id", type: "uuid" },
      { name: "profiles_searched", type: "text[]" },
      { name: "shared_game_count", type: "integer" },
      { name: "searched_at", type: "timestamptz" },
    ],
  },
  {
    table: "cached_member_libraries",
    columns: [
      { name: "group_id", type: "uuid", pk: true },
      { name: "steam_id64", type: "text", pk: true },
      { name: "app_ids", type: "integer[]" },
      { name: "cached_at", type: "timestamptz" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Env vars to check (boolean flags only — never expose values)
// ---------------------------------------------------------------------------
const ENV_VARS_TO_CHECK = [
  "STEAM_API_KEY",
  "DATABASE_URL",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "ADMIN_EMAILS",
  "LOG_LEVEL",
] as const;

// ---------------------------------------------------------------------------
// GET /api/admin/system
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Table row counts
    const tableNames = [
      "catalog_games",
      "catalog_sync_status",
      "users",
      "groups",
      "group_members",
      "group_bookmarks",
      "shared_links",
      "search_history",
      "cached_member_libraries",
    ] as const;

    const countResults = await Promise.all(
      tableNames.map(async (table) => {
        const result = await db.execute(
          sql.raw(`SELECT count(*) as count FROM ${table}`),
        );
        return {
          table,
          count: Number(result[0]?.count ?? 0),
        };
      }),
    );

    const tableCounts: Record<string, number> = {};
    for (const r of countResults) {
      tableCounts[r.table] = r.count;
    }

    // Catalog enrichment progress
    const enrichedResult = await db.execute(
      sql`SELECT count(*) as count FROM catalog_games WHERE store_last_synced_at IS NOT NULL`,
    );
    const enrichedCount = Number(enrichedResult[0]?.count ?? 0);

    // Recent sync jobs
    const syncJobsResult = await db.execute(
      sql`SELECT * FROM catalog_sync_status ORDER BY created_at DESC LIMIT 5`,
    );
    const recentSyncJobs = Array.from(syncJobsResult);

    // Environment variable status
    const envStatus: Record<string, boolean> = {};
    for (const key of ENV_VARS_TO_CHECK) {
      envStatus[key] = Boolean(process.env[key]);
    }

    return NextResponse.json({
      tableCounts,
      enrichment: {
        total: tableCounts["catalog_games"] ?? 0,
        enriched: enrichedCount,
        percentage:
          tableCounts["catalog_games"] > 0
            ? Math.round((enrichedCount / tableCounts["catalog_games"]) * 100)
            : 0,
      },
      recentSyncJobs,
      schema: SCHEMA_INFO,
      envStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
