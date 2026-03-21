import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const {
  parseSteamProfileInputMock,
  resolveBatchMock,
  fetchBatchMock,
  fetchPlayerSummariesMock,
  calculateGameOverlapMock,
} = vi.hoisted(() => ({
  parseSteamProfileInputMock: vi.fn(),
  resolveBatchMock: vi.fn(),
  fetchBatchMock: vi.fn(),
  fetchPlayerSummariesMock: vi.fn(),
  calculateGameOverlapMock: vi.fn(),
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

describe("POST /api/find-overlap", () => {
  beforeEach(() => {
    parseSteamProfileInputMock.mockReset();
    resolveBatchMock.mockReset();
    fetchBatchMock.mockReset();
    fetchPlayerSummariesMock.mockReset();
    calculateGameOverlapMock.mockReset();
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
});
