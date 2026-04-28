import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getVanityCacheSize, getLibraryCacheSize } from "@/lib/cache";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Endpoint Registry — static list of all API routes
// ---------------------------------------------------------------------------
const ENDPOINT_REGISTRY = [
  { method: "POST", path: "/api/find-overlap", auth: "none", rateLimit: "10/min per IP", description: "Find shared games between Steam profiles" },
  { method: "POST", path: "/api/groups", auth: "session", rateLimit: "none", description: "Create group" },
  { method: "GET", path: "/api/groups", auth: "session", rateLimit: "none", description: "List user groups" },
  { method: "GET", path: "/api/groups/:id", auth: "session", rateLimit: "none", description: "Get group details" },
  { method: "PUT", path: "/api/groups/:id", auth: "session", rateLimit: "none", description: "Update group" },
  { method: "DELETE", path: "/api/groups/:id", auth: "session", rateLimit: "none", description: "Delete group" },
  { method: "POST", path: "/api/groups/:id/members", auth: "session", rateLimit: "none", description: "Add group member" },
  { method: "DELETE", path: "/api/groups/:id/members/:steamId64", auth: "session", rateLimit: "none", description: "Remove group member" },
  { method: "PUT", path: "/api/groups/:id/members/:steamId64/role", auth: "session", rateLimit: "none", description: "Update member role" },
  { method: "POST", path: "/api/groups/:id/bookmarks", auth: "session (paid)", rateLimit: "none", description: "Add bookmark" },
  { method: "GET", path: "/api/groups/:id/bookmarks", auth: "session", rateLimit: "none", description: "List bookmarks" },
  { method: "DELETE", path: "/api/groups/:id/bookmarks/:appId", auth: "session (paid)", rateLimit: "none", description: "Remove bookmark" },
  { method: "POST", path: "/api/groups/:id/share", auth: "session", rateLimit: "none", description: "Create shareable link" },
  { method: "GET", path: "/api/shared/:linkId", auth: "none", rateLimit: "none", description: "View shared link" },
  { method: "GET", path: "/api/groups/:id/notifications", auth: "session (paid)", rateLimit: "none", description: "Get new game notifications" },
  { method: "POST", path: "/api/search-history", auth: "session (paid)", rateLimit: "none", description: "Record search history" },
  { method: "GET", path: "/api/search-history", auth: "session (paid)", rateLimit: "none", description: "Get search history" },
  { method: "GET", path: "/api/auth/me", auth: "session", rateLimit: "none", description: "Get current user" },
  { method: "POST", path: "/api/auth/logout", auth: "session", rateLimit: "none", description: "Log out" },
  { method: "GET", path: "/api/auth/steam/link", auth: "session", rateLimit: "none", description: "Start Steam OpenID link" },
  { method: "GET", path: "/api/auth/steam/callback", auth: "none", rateLimit: "none", description: "Steam OpenID callback" },
  { method: "POST", path: "/api/auth/steam/unlink", auth: "session", rateLimit: "none", description: "Unlink Steam account" },
  { method: "POST", path: "/api/cron/sync-catalog", auth: "cron secret", rateLimit: "none", description: "Catalog sync cron job" },
  { method: "GET", path: "/api/admin/check", auth: "admin", rateLimit: "none", description: "Check admin status" },
  { method: "GET", path: "/api/admin/system", auth: "admin", rateLimit: "none", description: "System overview data" },
  { method: "GET", path: "/api/admin/health", auth: "admin", rateLimit: "none", description: "API health dashboard data" },
];

// ---------------------------------------------------------------------------
// Feature Gating Map — static list of features with tier and auth info
// ---------------------------------------------------------------------------
const FEATURE_GATING_MAP = [
  { feature: "Overlap search", tier: "free", auth: false },
  { feature: "Multiplayer filter", tier: "free", auth: false },
  { feature: "Shareable links", tier: "free", auth: true },
  { feature: "1 saved group", tier: "free", auth: true },
  { feature: "Multiple groups", tier: "paid", auth: true },
  { feature: "Bookmarks", tier: "paid", auth: true },
  { feature: "Notifications", tier: "paid", auth: true },
  { feature: "Search history", tier: "paid", auth: true },
];

// ---------------------------------------------------------------------------
// External dependency check helpers
// ---------------------------------------------------------------------------
async function checkSteamApi(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(
      "https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/",
      { signal: AbortSignal.timeout(5000) },
    );
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

async function checkSupabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/health
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // External dependency checks (run in parallel)
    const [steamCheck, supabaseCheck] = await Promise.all([
      checkSteamApi(),
      checkSupabase(),
    ]);

    const externalDependencies = {
      steamApi: steamCheck,
      supabase: supabaseCheck,
      sentry: { configured: Boolean(process.env.SENTRY_DSN) },
      posthog: { configured: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) },
    };

    // Cache status
    const cacheStatus = {
      vanityCacheSize: getVanityCacheSize(),
      libraryCacheSize: getLibraryCacheSize(),
      vanityTtl: "24h",
      libraryTtl: "10min",
    };

    return NextResponse.json({
      endpoints: ENDPOINT_REGISTRY,
      cacheStatus,
      externalDependencies,
      featureGating: FEATURE_GATING_MAP,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
