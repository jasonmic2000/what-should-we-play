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
});
