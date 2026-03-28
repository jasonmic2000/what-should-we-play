import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock db module
// ---------------------------------------------------------------------------

const returningMock = vi.fn().mockResolvedValue([{ id: 1 }]);
const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
const updateWhereMock = vi.fn().mockResolvedValue(undefined);
const dbUpdateSetMock = vi.fn().mockReturnValue({ where: updateWhereMock });
const dbUpdateMock = vi.fn().mockReturnValue({ set: dbUpdateSetMock });
const dbInsertValuesMock = vi.fn().mockReturnValue({
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  returning: returningMock,
});
const dbInsertMock = vi.fn().mockReturnValue({ values: dbInsertValuesMock });

const limitMock = vi.fn().mockResolvedValue([]);
const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
const selectWhereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
const selectFromMock = vi.fn().mockReturnValue({ where: selectWhereMock });
const selectMock = vi.fn().mockReturnValue({ from: selectFromMock });

vi.mock("../db/index", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    insert: (...args: unknown[]) => dbInsertMock(...args),
    update: (...args: unknown[]) => dbUpdateMock(...args),
  },
}));

// ---------------------------------------------------------------------------
// Mock catalog-repository
// ---------------------------------------------------------------------------

const upsertGamesMock = vi.fn().mockResolvedValue(undefined);
const getStaleGamesMock = vi.fn().mockResolvedValue([]);

vi.mock("../db/catalog-repository", () => ({
  upsertGames: (...args: unknown[]) => upsertGamesMock(...args),
  getStaleGames: (...args: unknown[]) => getStaleGamesMock(...args),
}));

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// ---------------------------------------------------------------------------
// Set env
// ---------------------------------------------------------------------------

vi.stubEnv("STEAM_API_KEY", "test-key");

import {
  fetchAppList,
  fetchAppDetails,
  runIncrementalSync,
  runDetailEnrichment,
} from "./catalog-sync";

// ===========================================================================
// fetchAppList
// ===========================================================================

describe("fetchAppList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a successful app list response", async () => {
    const mockResponse = {
      response: {
        apps: [
          { appid: 570, name: "Dota 2", last_modified: 1700000000, price_change_number: 1 },
          { appid: 730, name: "CS2", last_modified: 1700000001, price_change_number: 2 },
        ],
        have_more_results: false,
      },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchAppList();

    expect(result.response.apps).toHaveLength(2);
    expect(result.response.apps[0].appid).toBe(570);
    expect(result.response.have_more_results).toBe(false);
  });

  it("passes last_appid for pagination", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ response: { apps: [], have_more_results: false } }),
    });

    await fetchAppList({ lastAppId: 999 });

    const calledUrl = new URL(fetchMock.mock.calls[0][0].toString());
    expect(calledUrl.searchParams.get("last_appid")).toBe("999");
  });

  it("passes if_modified_since for incremental sync", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ response: { apps: [], have_more_results: false } }),
    });

    await fetchAppList({ ifModifiedSince: 1700000000 });

    const calledUrl = new URL(fetchMock.mock.calls[0][0].toString());
    expect(calledUrl.searchParams.get("if_modified_since")).toBe("1700000000");
  });

  it("throws on non-ok response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(fetchAppList()).rejects.toThrow(
      "Steam AppList API returned 500 Internal Server Error",
    );
  });

  it("includes correct filter params", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ response: { apps: [], have_more_results: false } }),
    });

    await fetchAppList();

    const calledUrl = new URL(fetchMock.mock.calls[0][0].toString());
    expect(calledUrl.searchParams.get("include_games")).toBe("true");
    expect(calledUrl.searchParams.get("include_dlc")).toBe("false");
    expect(calledUrl.searchParams.get("include_software")).toBe("false");
    expect(calledUrl.searchParams.get("include_videos")).toBe("false");
    expect(calledUrl.searchParams.get("include_hardware")).toBe("false");
    expect(calledUrl.searchParams.get("max_results")).toBe("50000");
  });
});

// ===========================================================================
// fetchAppDetails
// ===========================================================================

describe("fetchAppDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a successful app details response", async () => {
    const mockResponse = {
      "570": {
        success: true,
        data: {
          type: "game",
          name: "Dota 2",
          is_free: true,
          categories: [
            { id: 36, description: "Online PvP" },
            { id: 38, description: "Online Co-op" },
          ],
        },
      },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchAppDetails(570);

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Dota 2");
    expect(result!.is_free).toBe(true);
    expect(result!.categories).toHaveLength(2);
  });

  it("returns null when app does not exist", async () => {
    const mockResponse = {
      "99999": { success: false },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchAppDetails(99999);
    expect(result).toBeNull();
  });

  it("returns null on fetch failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchAppDetails(570);
    expect(result).toBeNull();
  });

  it("returns null on non-ok HTTP response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    const result = await fetchAppDetails(570);
    expect(result).toBeNull();
  });

  it("parses price_overview when present", async () => {
    const mockResponse = {
      "440": {
        success: true,
        data: {
          type: "game",
          name: "Team Fortress 2",
          is_free: false,
          price_overview: {
            currency: "USD",
            final_formatted: "$9.99",
          },
          categories: [],
        },
      },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchAppDetails(440);

    expect(result).not.toBeNull();
    expect(result!.price_overview?.currency).toBe("USD");
    expect(result!.price_overview?.final_formatted).toBe("$9.99");
  });
});

// ===========================================================================
// runIncrementalSync
// ===========================================================================

describe("runIncrementalSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset db mock chain for select (reading last sync)
    limitMock.mockResolvedValue([]);
    // Reset db mock chain for insert (creating job record)
    returningMock.mockResolvedValue([{ id: 42 }]);
  });

  it("calls fetchAppList and upserts results", async () => {
    const mockApps = {
      response: {
        apps: [
          { appid: 570, name: "Dota 2", last_modified: 1700000000, price_change_number: 1 },
        ],
        have_more_results: false,
      },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApps),
    });

    const result = await runIncrementalSync();

    expect(result.jobType).toBe("incremental");
    expect(result.status).toBe("completed");
    expect(result.itemsProcessed).toBe(1);
    expect(upsertGamesMock).toHaveBeenCalledOnce();
  });

  it("uses if_modified_since from last successful sync", async () => {
    const lastCompletedAt = new Date("2024-06-01T00:00:00Z");
    limitMock.mockResolvedValueOnce([{ completedAt: lastCompletedAt }]);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ response: { apps: [], have_more_results: false } }),
    });

    const result = await runIncrementalSync();

    expect(result.status).toBe("completed");
    const calledUrl = new URL(fetchMock.mock.calls[0][0].toString());
    expect(calledUrl.searchParams.get("if_modified_since")).toBe(
      String(Math.floor(lastCompletedAt.getTime() / 1000)),
    );
  });

  it("returns failed status on fetch error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network failure"));

    const result = await runIncrementalSync();

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("Network failure");
  });
});

// ===========================================================================
// runDetailEnrichment
// ===========================================================================

describe("runDetailEnrichment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    returningMock.mockResolvedValue([{ id: 99 }]);
  });

  it("enriches stale games with store API data", async () => {
    getStaleGamesMock.mockResolvedValueOnce([
      {
        appId: 570,
        name: "Dota 2",
        isFree: null,
        catalogLastSyncedAt: new Date(),
        storeLastSyncedAt: null,
      },
    ]);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          "570": {
            success: true,
            data: {
              type: "game",
              name: "Dota 2",
              is_free: true,
              categories: [{ id: 36, description: "Online PvP" }],
            },
          },
        }),
    });

    const result = await runDetailEnrichment(10);

    expect(result.jobType).toBe("enrichment");
    expect(result.status).toBe("completed");
    expect(result.itemsProcessed).toBe(1);
    expect(upsertGamesMock).toHaveBeenCalledOnce();

    const upsertedGame = upsertGamesMock.mock.calls[0][0][0];
    expect(upsertedGame.isFree).toBe(true);
    expect(upsertedGame.hasOnlinePvp).toBe(true);
  });

  it("skips games where fetchAppDetails returns null", async () => {
    getStaleGamesMock.mockResolvedValueOnce([
      {
        appId: 99999,
        name: "Unknown Game",
        isFree: null,
        catalogLastSyncedAt: new Date(),
        storeLastSyncedAt: null,
      },
    ]);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ "99999": { success: false } }),
    });

    const result = await runDetailEnrichment(10);

    expect(result.status).toBe("completed");
    expect(result.itemsProcessed).toBe(0);
    expect(upsertGamesMock).not.toHaveBeenCalled();
  });

  it("returns failed status on error", async () => {
    getStaleGamesMock.mockRejectedValueOnce(new Error("DB error"));

    const result = await runDetailEnrichment(10);

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("DB error");
  });
});
