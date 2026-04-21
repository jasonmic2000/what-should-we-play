import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupMember, GameLibrary, SteamPlayerSummary } from "../types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetCachedLibraries = vi.fn();
const mockUpdateCachedLibrary = vi.fn();

vi.mock("../db/notification-repository", () => ({
  getCachedLibraries: (...args: unknown[]) => mockGetCachedLibraries(...args),
  updateCachedLibrary: (...args: unknown[]) => mockUpdateCachedLibrary(...args),
}));

const mockFetchGames = vi.fn();
const mockFetchPlayerSummaries = vi.fn();

vi.mock("./game-fetcher", () => ({
  fetchGames: (...args: unknown[]) => mockFetchGames(...args),
  fetchPlayerSummaries: (...args: unknown[]) =>
    mockFetchPlayerSummaries(...args),
}));

import { checkForNewGames } from "./notification-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLibrary(
  steamId64: string,
  appIds: number[],
  names?: string[],
): GameLibrary {
  return {
    steamId64,
    gameCount: appIds.length,
    isPrivate: false,
    games: appIds.map((appId, i) => ({
      appId,
      name: names?.[i] ?? `Game ${appId}`,
      playtimeForever: 100,
      imgIconUrl: "",
      imgLogoUrl: "",
      headerImageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
    })),
  };
}

function makeMembers(...steamIds: string[]): GroupMember[] {
  return steamIds.map((steamId64) => ({
    groupId: "group-1",
    steamId64,
    role: "member" as const,
    addedAt: new Date().toISOString(),
  }));
}

const STEAM_ID_1 = "76561198000000001";
const STEAM_ID_2 = "76561198000000002";

describe("notification-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCachedLibrary.mockResolvedValue(undefined);
    mockFetchPlayerSummaries.mockResolvedValue(new Map());
  });

  it("returns empty array when fewer than 2 members", async () => {
    const result = await checkForNewGames(
      "group-1",
      makeMembers(STEAM_ID_1),
    );
    expect(result).toEqual([]);
  });

  it("seeds cache and returns empty on first visit (no cached data)", async () => {
    mockGetCachedLibraries.mockResolvedValue(new Map());
    mockFetchGames
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_1, [440, 730]))
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_2, [440, 570]));

    const result = await checkForNewGames(
      "group-1",
      makeMembers(STEAM_ID_1, STEAM_ID_2),
    );

    expect(result).toEqual([]);
    // Should have seeded cache for both members
    expect(mockUpdateCachedLibrary).toHaveBeenCalledTimes(2);
  });

  it("returns empty when no new games since last visit", async () => {
    mockGetCachedLibraries.mockResolvedValue(
      new Map([
        [STEAM_ID_1, [440, 730]],
        [STEAM_ID_2, [440, 570]],
      ]),
    );
    mockFetchGames
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_1, [440, 730]))
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_2, [440, 570]));

    const result = await checkForNewGames(
      "group-1",
      makeMembers(STEAM_ID_1, STEAM_ID_2),
    );

    expect(result).toEqual([]);
  });

  it("detects new overlap games when a member adds a game both own", async () => {
    // Cached: member1 has [440], member2 has [440, 730]
    mockGetCachedLibraries.mockResolvedValue(
      new Map([
        [STEAM_ID_1, [440]],
        [STEAM_ID_2, [440, 730]],
      ]),
    );
    // Current: member1 now also has 730
    mockFetchGames
      .mockResolvedValueOnce(
        makeLibrary(STEAM_ID_1, [440, 730], ["TF2", "CS2"]),
      )
      .mockResolvedValueOnce(
        makeLibrary(STEAM_ID_2, [440, 730], ["TF2", "CS2"]),
      );

    const summaries = new Map<string, SteamPlayerSummary>();
    summaries.set(STEAM_ID_1, {
      steamid: STEAM_ID_1,
      personaname: "Player1",
      profileurl: "",
      avatar: "",
      avatarmedium: "",
      avatarfull: "",
    });
    mockFetchPlayerSummaries.mockResolvedValue(summaries);

    const result = await checkForNewGames(
      "group-1",
      makeMembers(STEAM_ID_1, STEAM_ID_2),
    );

    expect(result).toHaveLength(1);
    expect(result[0].appId).toBe(730);
    expect(result[0].name).toBe("CS2");
    expect(result[0].addedBy).toBe("Player1");
    expect(result[0].headerImageUrl).toContain("730");
  });

  it("does not report new games that are not in all members' libraries", async () => {
    mockGetCachedLibraries.mockResolvedValue(
      new Map([
        [STEAM_ID_1, [440]],
        [STEAM_ID_2, [440]],
      ]),
    );
    // Member1 gets game 730, but member2 doesn't have it
    mockFetchGames
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_1, [440, 730]))
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_2, [440]));

    const result = await checkForNewGames(
      "group-1",
      makeMembers(STEAM_ID_1, STEAM_ID_2),
    );

    expect(result).toEqual([]);
  });

  it("returns empty array on error (graceful degradation)", async () => {
    mockGetCachedLibraries.mockRejectedValue(new Error("DB error"));

    const result = await checkForNewGames(
      "group-1",
      makeMembers(STEAM_ID_1, STEAM_ID_2),
    );

    expect(result).toEqual([]);
  });

  it("detects new overlap across 3 members", async () => {
    const STEAM_ID_3 = "76561198000000003";
    mockGetCachedLibraries.mockResolvedValue(
      new Map([
        [STEAM_ID_1, [440]],
        [STEAM_ID_2, [440, 730]],
        [STEAM_ID_3, [440, 730]],
      ]),
    );
    // Member1 now also has 730 — all 3 share it
    mockFetchGames
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_1, [440, 730], ["TF2", "CS2"]))
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_2, [440, 730], ["TF2", "CS2"]))
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_3, [440, 730], ["TF2", "CS2"]));

    const summaries = new Map<string, SteamPlayerSummary>();
    summaries.set(STEAM_ID_1, {
      steamid: STEAM_ID_1,
      personaname: "Player1",
      profileurl: "",
      avatar: "",
      avatarmedium: "",
      avatarfull: "",
    });
    mockFetchPlayerSummaries.mockResolvedValue(summaries);

    const result = await checkForNewGames(
      "group-1",
      makeMembers(STEAM_ID_1, STEAM_ID_2, STEAM_ID_3),
    );

    expect(result).toHaveLength(1);
    expect(result[0].appId).toBe(730);
  });

  it("handles partial fetch failure gracefully when enough members remain", async () => {
    mockGetCachedLibraries.mockResolvedValue(
      new Map([
        [STEAM_ID_1, [440]],
        [STEAM_ID_2, [440]],
      ]),
    );
    // Member1 fetch fails, member2 succeeds
    mockFetchGames
      .mockRejectedValueOnce(new Error("Steam API down"))
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_2, [440, 730]));

    const result = await checkForNewGames(
      "group-1",
      makeMembers(STEAM_ID_1, STEAM_ID_2),
    );

    // Only 1 member fetched successfully — fewer than 2, so empty result
    expect(result).toEqual([]);
  });

  it("treats a new member with no cached data as having all-new games", async () => {
    const STEAM_ID_3 = "76561198000000003";
    // Only 2 members cached; member3 is new
    mockGetCachedLibraries.mockResolvedValue(
      new Map([
        [STEAM_ID_1, [440, 730]],
        [STEAM_ID_2, [440, 730]],
      ]),
    );
    // All 3 now have game 570 — but only member3 is "new" for it
    mockFetchGames
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_1, [440, 730, 570], ["TF2", "CS2", "Dota 2"]))
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_2, [440, 730, 570], ["TF2", "CS2", "Dota 2"]))
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_3, [440, 730, 570], ["TF2", "CS2", "Dota 2"]));

    const summaries = new Map<string, SteamPlayerSummary>();
    summaries.set(STEAM_ID_3, {
      steamid: STEAM_ID_3,
      personaname: "Player3",
      profileurl: "",
      avatar: "",
      avatarmedium: "",
      avatarfull: "",
    });
    mockFetchPlayerSummaries.mockResolvedValue(summaries);

    const result = await checkForNewGames(
      "group-1",
      makeMembers(STEAM_ID_1, STEAM_ID_2, STEAM_ID_3),
    );

    // 570 is new overlap (member3 has all games as "new", and 570 is in all libraries)
    expect(result.some((n) => n.appId === 570)).toBe(true);
  });

  it("updates cached libraries after computing diff", async () => {
    mockGetCachedLibraries.mockResolvedValue(
      new Map([
        [STEAM_ID_1, [440, 730]],
        [STEAM_ID_2, [440, 570]],
      ]),
    );
    mockFetchGames
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_1, [440, 730]))
      .mockResolvedValueOnce(makeLibrary(STEAM_ID_2, [440, 570]));

    await checkForNewGames(
      "group-1",
      makeMembers(STEAM_ID_1, STEAM_ID_2),
    );

    // Cache should be updated for both members even when no new games
    expect(mockUpdateCachedLibrary).toHaveBeenCalledTimes(2);
  });
});
