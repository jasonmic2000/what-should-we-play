import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const {
  parseSteamProfileInputMock,
  resolveBatchMock,
  fetchBatchMock,
  fetchPlayerSummariesMock,
  calculateGameOverlapMock,
  enrichSharedGamesMock,
  canRefreshMock,
  invalidateProfileMock,
  recordRefreshMock,
  checkRateLimitMock,
  fetchRecentlyPlayedBatchMock,
  computeRecentlyPlayedRankingMock,
} = vi.hoisted(() => ({
  parseSteamProfileInputMock: vi.fn(),
  resolveBatchMock: vi.fn(),
  fetchBatchMock: vi.fn(),
  fetchPlayerSummariesMock: vi.fn(),
  calculateGameOverlapMock: vi.fn(),
  enrichSharedGamesMock: vi.fn().mockImplementation((games: unknown[]) => Promise.resolve(games)),
  canRefreshMock: vi.fn().mockReturnValue(true),
  invalidateProfileMock: vi.fn(),
  recordRefreshMock: vi.fn(),
  checkRateLimitMock: vi.fn().mockReturnValue({ allowed: true }),
  fetchRecentlyPlayedBatchMock: vi.fn().mockResolvedValue(new Map()),
  computeRecentlyPlayedRankingMock: vi.fn().mockReturnValue(new Map()),
}));

vi.mock("@/lib/steam/input-parser", () => ({
  parseSteamProfileInput: parseSteamProfileInputMock,
}));

vi.mock("@/lib/steam/profile-resolver", () => ({
  resolveBatch: resolveBatchMock,
}));

vi.mock("@/lib/steam/game-fetcher", () => ({
  fetchBatch: fetchBatchMock,
  fetchPlayerSummaries: fetchPlayerSummariesMock,
}));

vi.mock("@/lib/steam/overlap-calculator", () => ({
  calculateGameOverlap: calculateGameOverlapMock,
}));

vi.mock("@/lib/steam/result-enricher", () => ({
  enrichSharedGames: enrichSharedGamesMock,
}));

vi.mock("@/lib/steam/recently-played", () => ({
  fetchRecentlyPlayedBatch: fetchRecentlyPlayedBatchMock,
  computeRecentlyPlayedRanking: computeRecentlyPlayedRankingMock,
}));

vi.mock("@/lib/cache", () => ({
  canRefresh: canRefreshMock,
  invalidateProfile: invalidateProfileMock,
  recordRefresh: recordRefreshMock,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db/search-history-repository", () => ({
  recordSearch: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/find-overlap", () => {
  beforeEach(() => {
    parseSteamProfileInputMock.mockReset();
    resolveBatchMock.mockReset();
    fetchBatchMock.mockReset();
    fetchPlayerSummariesMock.mockReset();
    calculateGameOverlapMock.mockReset();
    enrichSharedGamesMock.mockReset().mockImplementation((games: unknown[]) => Promise.resolve(games));
    canRefreshMock.mockReset().mockReturnValue(true);
    invalidateProfileMock.mockReset();
    recordRefreshMock.mockReset();
    checkRateLimitMock.mockReset().mockReturnValue({ allowed: true });
    fetchRecentlyPlayedBatchMock.mockReset().mockResolvedValue(new Map());
    computeRecentlyPlayedRankingMock.mockReset().mockReturnValue(new Map());
  });

  it("returns invalid input for malformed json", async () => {
    const request = new Request("http://localhost/api/find-overlap", {
      method: "POST",
      body: "{bad json",
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "INVALID_INPUT",
      },
    });
  });

  it("rejects duplicate users after profile resolution", async () => {
    parseSteamProfileInputMock
      .mockReturnValueOnce({
        type: "vanity",
        identifier: "alice",
        originalInput: "https://steamcommunity.com/id/alice",
        normalizedInput: "https://steamcommunity.com/id/alice",
      })
      .mockReturnValueOnce({
        type: "steamid64",
        identifier: "76561198000000000",
        originalInput:
          "https://steamcommunity.com/profiles/76561198000000000",
        normalizedInput:
          "https://steamcommunity.com/profiles/76561198000000000",
      });

    resolveBatchMock.mockResolvedValue([
      {
        originalUrl: "https://steamcommunity.com/id/alice",
        steamId64: "76561198000000000",
        profileUrl: "https://steamcommunity.com/id/alice",
      },
      {
        originalUrl: "https://steamcommunity.com/profiles/76561198000000000",
        steamId64: "76561198000000000",
        profileUrl: "https://steamcommunity.com/profiles/76561198000000000",
      },
    ]);

    const request = new Request("http://localhost/api/find-overlap", {
      method: "POST",
      body: JSON.stringify({
        profiles: [
          "https://steamcommunity.com/id/alice",
          "https://steamcommunity.com/profiles/76561198000000000",
        ],
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "This profile has already been added",
      },
    });
  });

  it("returns overlap results on success", async () => {
    parseSteamProfileInputMock
      .mockReturnValueOnce({
        type: "steamid64",
        identifier: "76561198000000000",
        originalInput:
          "https://steamcommunity.com/profiles/76561198000000000",
        normalizedInput:
          "https://steamcommunity.com/profiles/76561198000000000",
      })
      .mockReturnValueOnce({
        type: "steamid64",
        identifier: "76561198000000001",
        originalInput:
          "https://steamcommunity.com/profiles/76561198000000001",
        normalizedInput:
          "https://steamcommunity.com/profiles/76561198000000001",
      });

    resolveBatchMock.mockResolvedValue([
      {
        originalUrl: "https://steamcommunity.com/profiles/76561198000000000",
        steamId64: "76561198000000000",
        profileUrl: "https://steamcommunity.com/profiles/76561198000000000",
      },
      {
        originalUrl: "https://steamcommunity.com/profiles/76561198000000001",
        steamId64: "76561198000000001",
        profileUrl: "https://steamcommunity.com/profiles/76561198000000001",
      },
    ]);

    fetchPlayerSummariesMock.mockResolvedValue(
      new Map([
        [
          "76561198000000000",
          {
            steamid: "76561198000000000",
            personaname: "Alice",
            profileurl: "https://steamcommunity.com/id/alice",
            avatar: "",
            avatarmedium: "",
            avatarfull: "avatar-a",
          },
        ],
      ]),
    );

    fetchBatchMock.mockResolvedValue(
      new Map([
        [
          "76561198000000000",
          {
            steamId64: "76561198000000000",
            gameCount: 1,
            isPrivate: false,
            games: [],
          },
        ],
        [
          "76561198000000001",
          {
            steamId64: "76561198000000001",
            gameCount: 1,
            isPrivate: false,
            games: [],
          },
        ],
      ]),
    );

    calculateGameOverlapMock.mockReturnValue([
      {
        appId: 570,
        name: "Dota 2",
        playtimeForever: 100,
        imgIconUrl: "",
        imgLogoUrl: "",
        headerImageUrl: "",
      },
    ]);

    const request = new Request("http://localhost/api/find-overlap", {
      method: "POST",
      body: JSON.stringify({
        profiles: [
          "https://steamcommunity.com/profiles/76561198000000000",
          "https://steamcommunity.com/profiles/76561198000000001",
        ],
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: {
        profiles: [
          {
            steamId64: "76561198000000000",
            personaName: "Alice",
            avatarUrl: "avatar-a",
            profileUrl: "https://steamcommunity.com/id/alice",
          },
          {
            steamId64: "76561198000000001",
          },
        ],
        sharedGames: [
          {
            appId: 570,
            name: "Dota 2",
          },
        ],
      },
    });
  });

  it("calls enrichSharedGames with overlap result and uses enriched data", async () => {
    parseSteamProfileInputMock.mockImplementation((input: string) => {
      if (input.includes("76561198000000000")) {
        return {
          type: "steamid64",
          identifier: "76561198000000000",
          originalInput: "https://steamcommunity.com/profiles/76561198000000000",
          normalizedInput: "https://steamcommunity.com/profiles/76561198000000000",
        };
      }
      return {
        type: "steamid64",
        identifier: "76561198000000001",
        originalInput: "https://steamcommunity.com/profiles/76561198000000001",
        normalizedInput: "https://steamcommunity.com/profiles/76561198000000001",
      };
    });

    resolveBatchMock.mockResolvedValue([
      { originalUrl: "https://steamcommunity.com/profiles/76561198000000000", steamId64: "76561198000000000", profileUrl: "https://steamcommunity.com/profiles/76561198000000000" },
      { originalUrl: "https://steamcommunity.com/profiles/76561198000000001", steamId64: "76561198000000001", profileUrl: "https://steamcommunity.com/profiles/76561198000000001" },
    ]);

    fetchPlayerSummariesMock.mockResolvedValue(new Map());
    fetchBatchMock.mockResolvedValue(
      new Map([
        ["76561198000000000", { steamId64: "76561198000000000", gameCount: 1, isPrivate: false, games: [] }],
        ["76561198000000001", { steamId64: "76561198000000001", gameCount: 1, isPrivate: false, games: [] }],
      ]),
    );

    const overlapGames = [
      { appId: 730, name: "Counter-Strike 2", playtimeForever: 500, imgIconUrl: "", imgLogoUrl: "", headerImageUrl: "" },
    ];
    calculateGameOverlapMock.mockReturnValue(overlapGames);

    const enrichedGames = [
      { appId: 730, name: "Counter-Strike 2", playtimeForever: 500, imgIconUrl: "", imgLogoUrl: "", headerImageUrl: "", isFree: false, isGroupPlayable: true },
    ];
    enrichSharedGamesMock.mockResolvedValue(enrichedGames);

    const request = new Request("http://localhost/api/find-overlap", {
      method: "POST",
      body: JSON.stringify({
        profiles: [
          "https://steamcommunity.com/profiles/76561198000000000",
          "https://steamcommunity.com/profiles/76561198000000001",
        ],
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(enrichSharedGamesMock).toHaveBeenCalledWith(overlapGames, expect.any(Map), false);
    expect(body.data.sharedGames).toEqual(enrichedGames);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    checkRateLimitMock.mockReturnValue({ allowed: false, retryAfterSeconds: 30 });

    const request = new Request("http://localhost/api/find-overlap", {
      method: "POST",
      body: JSON.stringify({
        profiles: [
          "https://steamcommunity.com/profiles/76561198000000000",
          "https://steamcommunity.com/profiles/76561198000000001",
        ],
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      success: false,
      error: { code: "RATE_LIMIT" },
    });
    // Should not attempt to parse profiles when rate-limited
    expect(parseSteamProfileInputMock).not.toHaveBeenCalled();
  });

  it("passes forceRefresh through to resolveBatch and fetchBatch", async () => {
    parseSteamProfileInputMock.mockImplementation((input: string) => {
      if (input.includes("76561198000000000")) {
        return {
          type: "steamid64",
          identifier: "76561198000000000",
          originalInput: "https://steamcommunity.com/profiles/76561198000000000",
          normalizedInput: "https://steamcommunity.com/profiles/76561198000000000",
        };
      }
      return {
        type: "steamid64",
        identifier: "76561198000000001",
        originalInput: "https://steamcommunity.com/profiles/76561198000000001",
        normalizedInput: "https://steamcommunity.com/profiles/76561198000000001",
      };
    });

    resolveBatchMock.mockResolvedValue([
      { originalUrl: "https://steamcommunity.com/profiles/76561198000000000", steamId64: "76561198000000000", profileUrl: "https://steamcommunity.com/profiles/76561198000000000" },
      { originalUrl: "https://steamcommunity.com/profiles/76561198000000001", steamId64: "76561198000000001", profileUrl: "https://steamcommunity.com/profiles/76561198000000001" },
    ]);

    fetchPlayerSummariesMock.mockResolvedValue(new Map());
    fetchBatchMock.mockResolvedValue(
      new Map([
        ["76561198000000000", { steamId64: "76561198000000000", gameCount: 0, isPrivate: false, games: [] }],
        ["76561198000000001", { steamId64: "76561198000000001", gameCount: 0, isPrivate: false, games: [] }],
      ]),
    );
    calculateGameOverlapMock.mockReturnValue([]);

    const request = new Request("http://localhost/api/find-overlap", {
      method: "POST",
      body: JSON.stringify({
        profiles: [
          "https://steamcommunity.com/profiles/76561198000000000",
          "https://steamcommunity.com/profiles/76561198000000001",
        ],
        forceRefresh: true,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // resolveBatch should receive forceRefresh: true
    expect(resolveBatchMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ forceRefresh: true }),
    );

    // fetchBatch should receive forceRefresh: true
    expect(fetchBatchMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ forceRefresh: true }),
    );

    // invalidateProfile and recordRefresh should be called for each profile
    expect(invalidateProfileMock).toHaveBeenCalled();
    expect(recordRefreshMock).toHaveBeenCalled();
  });

  it("passes multiplayerOnly through to enrichSharedGames", async () => {
    parseSteamProfileInputMock.mockImplementation((input: string) => {
      if (input.includes("76561198000000000")) {
        return {
          type: "steamid64",
          identifier: "76561198000000000",
          originalInput: "https://steamcommunity.com/profiles/76561198000000000",
          normalizedInput: "https://steamcommunity.com/profiles/76561198000000000",
        };
      }
      return {
        type: "steamid64",
        identifier: "76561198000000001",
        originalInput: "https://steamcommunity.com/profiles/76561198000000001",
        normalizedInput: "https://steamcommunity.com/profiles/76561198000000001",
      };
    });

    resolveBatchMock.mockResolvedValue([
      { originalUrl: "https://steamcommunity.com/profiles/76561198000000000", steamId64: "76561198000000000", profileUrl: "https://steamcommunity.com/profiles/76561198000000000" },
      { originalUrl: "https://steamcommunity.com/profiles/76561198000000001", steamId64: "76561198000000001", profileUrl: "https://steamcommunity.com/profiles/76561198000000001" },
    ]);

    fetchPlayerSummariesMock.mockResolvedValue(new Map());
    fetchBatchMock.mockResolvedValue(
      new Map([
        ["76561198000000000", { steamId64: "76561198000000000", gameCount: 0, isPrivate: false, games: [] }],
        ["76561198000000001", { steamId64: "76561198000000001", gameCount: 0, isPrivate: false, games: [] }],
      ]),
    );
    calculateGameOverlapMock.mockReturnValue([]);

    const request = new Request("http://localhost/api/find-overlap", {
      method: "POST",
      body: JSON.stringify({
        profiles: [
          "https://steamcommunity.com/profiles/76561198000000000",
          "https://steamcommunity.com/profiles/76561198000000001",
        ],
        multiplayerOnly: true,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(enrichSharedGamesMock).toHaveBeenCalledWith([], expect.any(Map), true);
  });

  it("rejects forceRefresh when refresh cooldown has not elapsed", async () => {
    canRefreshMock.mockReturnValue(false);

    parseSteamProfileInputMock.mockReturnValue({
      type: "steamid64",
      identifier: "76561198000000000",
      originalInput: "https://steamcommunity.com/profiles/76561198000000000",
      normalizedInput: "https://steamcommunity.com/profiles/76561198000000000",
    });

    const request = new Request("http://localhost/api/find-overlap", {
      method: "POST",
      body: JSON.stringify({
        profiles: [
          "https://steamcommunity.com/profiles/76561198000000000",
          "https://steamcommunity.com/profiles/76561198000000001",
        ],
        forceRefresh: true,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: expect.stringContaining("rate-limited"),
      },
    });
    // Should not proceed to resolve profiles
    expect(resolveBatchMock).not.toHaveBeenCalled();
  });
});
