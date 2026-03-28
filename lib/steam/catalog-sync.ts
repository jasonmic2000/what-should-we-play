import { db } from "../db/index";
import { catalogSyncStatus } from "../db/schema";
import { upsertGames, getStaleGames } from "../db/catalog-repository";
import type {
  SteamAppListResponse,
  SyncResult,
  CatalogGameInsert,
} from "../types";
import { desc, eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APP_LIST_URL =
  "https://api.steampowered.com/IStoreService/GetAppList/v1/";
const STORE_DETAILS_URL =
  "https://store.steampowered.com/api/appdetails";
const MAX_RESULTS_PER_PAGE = 50000;
const ENRICHMENT_DELAY_MS = 1500; // ~1.5s between store API calls

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSteamApiKey(): string {
  const key = process.env.STEAM_API_KEY?.trim();
  if (!key) {
    throw new Error("STEAM_API_KEY is not configured");
  }
  return key;
}

// ---------------------------------------------------------------------------
// fetchAppList — paginated IStoreService/GetAppList/v1
// ---------------------------------------------------------------------------

export async function fetchAppList(options?: {
  lastAppId?: number;
  ifModifiedSince?: number;
}): Promise<SteamAppListResponse> {
  const url = new URL(APP_LIST_URL);
  url.searchParams.set("key", getSteamApiKey());
  url.searchParams.set("max_results", String(MAX_RESULTS_PER_PAGE));
  url.searchParams.set("include_games", "true");
  url.searchParams.set("include_dlc", "false");
  url.searchParams.set("include_software", "false");
  url.searchParams.set("include_videos", "false");
  url.searchParams.set("include_hardware", "false");

  if (options?.lastAppId) {
    url.searchParams.set("last_appid", String(options.lastAppId));
  }
  if (options?.ifModifiedSince) {
    url.searchParams.set(
      "if_modified_since",
      String(options.ifModifiedSince),
    );
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      `Steam AppList API returned ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as SteamAppListResponse;
}

// ---------------------------------------------------------------------------
// fetchAppDetails — Store API (no API key needed)
// ---------------------------------------------------------------------------

export interface AppDetailsData {
  type: string;
  name: string;
  is_free: boolean;
  price_overview?: {
    currency: string;
    final_formatted: string;
  };
  categories?: Array<{ id: number; description: string }>;
}

export async function fetchAppDetails(
  appId: number,
): Promise<AppDetailsData | null> {
  try {
    const url = new URL(STORE_DETAILS_URL);
    url.searchParams.set("appids", String(appId));

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    const entry = json[String(appId)];

    if (!entry?.success || !entry.data) {
      return null;
    }

    return entry.data as AppDetailsData;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Multiplayer category IDs from Steam
// ---------------------------------------------------------------------------

const CATEGORY_ONLINE_COOP = 38;
const CATEGORY_ONLINE_PVP = 36;
const CATEGORY_LAN_COOP = 48;
const CATEGORY_LAN_PVP = 47;
const CATEGORY_SHARED_SPLIT_SCREEN_COOP = 39;
const CATEGORY_SHARED_SPLIT_SCREEN_PVP = 42;

function hasCategory(
  categories: Array<{ id: number }> | undefined,
  ...ids: number[]
): boolean {
  if (!categories) return false;
  return categories.some((c) => ids.includes(c.id));
}

// ---------------------------------------------------------------------------
// runBackfillSync — full catalog backfill with pagination
// ---------------------------------------------------------------------------

export async function runBackfillSync(): Promise<SyncResult> {
  let itemsProcessed = 0;
  let lastAppId: number | undefined;

  try {
    // Record job start
    const [job] = await db
      .insert(catalogSyncStatus)
      .values({ jobType: "backfill", status: "running", itemsProcessed: 0 })
      .returning();

    let hasMore = true;

    while (hasMore) {
      const data = await fetchAppList({ lastAppId });
      const apps = data.response.apps ?? [];

      if (apps.length > 0) {
        const now = new Date();
        const games: CatalogGameInsert[] = apps.map((app) => ({
          appId: app.appid,
          name: app.name,
          catalogLastSyncedAt: now,
        }));

        await upsertGames(games);
        itemsProcessed += apps.length;
        lastAppId = data.response.last_appid ?? undefined;
      }

      hasMore = data.response.have_more_results === true;
    }

    // Record job completion
    await db
      .update(catalogSyncStatus)
      .set({
        status: "completed",
        completedAt: new Date(),
        itemsProcessed,
        lastAppId: lastAppId ?? null,
      })
      .where(eq(catalogSyncStatus.id, job.id));

    return { jobType: "backfill", status: "completed", itemsProcessed };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown backfill error";
    return {
      jobType: "backfill",
      status: "failed",
      itemsProcessed,
      errorMessage: message,
    };
  }
}

// ---------------------------------------------------------------------------
// runIncrementalSync — daily sync using if_modified_since
// ---------------------------------------------------------------------------

export async function runIncrementalSync(): Promise<SyncResult> {
  let itemsProcessed = 0;

  try {
    // Find the last successful sync timestamp
    const lastSync = await db
      .select()
      .from(catalogSyncStatus)
      .where(
        and(
          eq(catalogSyncStatus.jobType, "incremental"),
          eq(catalogSyncStatus.status, "completed"),
        ),
      )
      .orderBy(desc(catalogSyncStatus.completedAt))
      .limit(1);

    const ifModifiedSince = lastSync[0]?.completedAt
      ? Math.floor(lastSync[0].completedAt.getTime() / 1000)
      : undefined;

    // Record job start
    const [job] = await db
      .insert(catalogSyncStatus)
      .values({
        jobType: "incremental",
        status: "running",
        itemsProcessed: 0,
        lastModifiedSince: lastSync[0]?.completedAt ?? null,
      })
      .returning();

    let lastAppId: number | undefined;
    let hasMore = true;

    while (hasMore) {
      const data = await fetchAppList({ lastAppId, ifModifiedSince });
      const apps = data.response.apps ?? [];

      if (apps.length > 0) {
        const now = new Date();
        const games: CatalogGameInsert[] = apps.map((app) => ({
          appId: app.appid,
          name: app.name,
          catalogLastSyncedAt: now,
        }));

        await upsertGames(games);
        itemsProcessed += apps.length;
        lastAppId = data.response.last_appid ?? undefined;
      }

      hasMore = data.response.have_more_results === true;
    }

    // Record job completion
    await db
      .update(catalogSyncStatus)
      .set({
        status: "completed",
        completedAt: new Date(),
        itemsProcessed,
        lastAppId: lastAppId ?? null,
      })
      .where(eq(catalogSyncStatus.id, job.id));

    return { jobType: "incremental", status: "completed", itemsProcessed };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown incremental sync error";
    return {
      jobType: "incremental",
      status: "failed",
      itemsProcessed,
      errorMessage: message,
    };
  }
}

// ---------------------------------------------------------------------------
// runDetailEnrichment — weekly store API enrichment
// ---------------------------------------------------------------------------

export async function runDetailEnrichment(
  limit: number,
): Promise<SyncResult> {
  let itemsProcessed = 0;

  try {
    const [job] = await db
      .insert(catalogSyncStatus)
      .values({ jobType: "enrichment", status: "running", itemsProcessed: 0 })
      .returning();

    const staleGames = await getStaleGames(limit);

    for (const game of staleGames) {
      const details = await fetchAppDetails(game.appId);

      if (details) {
        const now = new Date();
        const categories = details.categories;

        const update: CatalogGameInsert = {
          appId: game.appId,
          name: details.name || game.name,
          isFree: details.is_free,
          priceText: details.price_overview?.final_formatted ?? null,
          priceCurrency: details.price_overview?.currency ?? null,
          hasOnlineCoop: hasCategory(categories, CATEGORY_ONLINE_COOP),
          hasOnlinePvp: hasCategory(categories, CATEGORY_ONLINE_PVP),
          hasLan: hasCategory(
            categories,
            CATEGORY_LAN_COOP,
            CATEGORY_LAN_PVP,
          ),
          hasSharedSplitScreen: hasCategory(
            categories,
            CATEGORY_SHARED_SPLIT_SCREEN_COOP,
            CATEGORY_SHARED_SPLIT_SCREEN_PVP,
          ),
          isGroupPlayable: hasCategory(
            categories,
            CATEGORY_ONLINE_COOP,
            CATEGORY_ONLINE_PVP,
            CATEGORY_LAN_COOP,
            CATEGORY_LAN_PVP,
            CATEGORY_SHARED_SPLIT_SCREEN_COOP,
            CATEGORY_SHARED_SPLIT_SCREEN_PVP,
          ),
          storeLastSyncedAt: now,
          catalogLastSyncedAt: game.catalogLastSyncedAt,
        };

        await upsertGames([update]);
        itemsProcessed++;
      }

      // Rate-limit: ~1.5s between calls to stay under 200/5min
      if (staleGames.indexOf(game) < staleGames.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, ENRICHMENT_DELAY_MS),
        );
      }
    }

    await db
      .update(catalogSyncStatus)
      .set({
        status: "completed",
        completedAt: new Date(),
        itemsProcessed,
      })
      .where(eq(catalogSyncStatus.id, job.id));

    return { jobType: "enrichment", status: "completed", itemsProcessed };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown enrichment error";
    return {
      jobType: "enrichment",
      status: "failed",
      itemsProcessed,
      errorMessage: message,
    };
  }
}
