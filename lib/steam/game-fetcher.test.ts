import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchBatch,
  fetchGames,
  fetchPlayerSummaries,
} from "./game-fetcher";
import { SteamOverlapError } from "./errors";

const { getOwnedGamesMock, getPlayerSummariesMock } = vi.hoisted(() => ({
  getOwnedGamesMock: vi.fn(),
  getPlayerSummariesMock: vi.fn(),
}));

vi.mock("./api", () => ({
  getOwnedGames: getOwnedGamesMock,
  getPlayerSummaries: getPlayerSummariesMock,
}));

describe("fetchGames", () => {
  beforeEach(() => {
    getOwnedGamesMock.mockReset();
    getPlayerSummariesMock.mockReset();
  });

  it("normalizes owned game data from steam", async () => {
    getOwnedGamesMock.mockResolvedValue({
      response: {
        game_count: 1,
        games: [
          {
            appid: 570,
            playtime_forever: 1234,
            rtime_last_played: 1700000000,
            name: "Dota 2",
            img_icon_url: "iconhash",
            img_logo_url: "logohash",
          },
        ],
      },
    });

    await expect(fetchGames("76561198000000000")).resolves.toEqual({
      steamId64: "76561198000000000",
      gameCount: 1,
      isPrivate: false,
      games: [
        {
          appId: 570,
          name: "Dota 2",
          playtimeForever: 1234,
          imgIconUrl:
            "https://media.steampowered.com/steamcommunity/public/images/apps/570/iconhash.jpg",
          imgLogoUrl:
            "https://media.steampowered.com/steamcommunity/public/images/apps/570/logohash.jpg",
          headerImageUrl:
            "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg",
          rtimeLastPlayed: 1700000000,
        },
      ],
    });
  });

  it("falls back when app info is missing", async () => {
    getOwnedGamesMock.mockResolvedValue({
      response: {
        game_count: 1,
        games: [
          {
            appid: 730,
            playtime_forever: 40,
          },
        ],
      },
    });

    await expect(fetchGames("76561198000000000")).resolves.toMatchObject({
      games: [
        {
          name: "Unknown Game",
          imgIconUrl: "",
          imgLogoUrl: "",
        },
      ],
    });
  });

  it("treats missing games arrays as private libraries", async () => {
    getOwnedGamesMock.mockResolvedValue({
      response: {
        game_count: 0,
      },
    });

    await expect(fetchGames("76561198000000000")).rejects.toMatchObject({
      code: "PRIVATE_LIBRARY",
      failedProfile: "76561198000000000",
    } as Partial<SteamOverlapError>);
  });
});

describe("fetchBatch", () => {
  beforeEach(() => {
    getOwnedGamesMock.mockReset();
  });

  it("returns a map keyed by steam id", async () => {
    getOwnedGamesMock.mockResolvedValue({
      response: {
        game_count: 0,
        games: [],
      },
    });

    const result = await fetchBatch([
      "76561198000000000",
      "76561198000000001",
    ]);

    expect(result).toBeInstanceOf(Map);
    expect([...result.keys()]).toEqual([
      "76561198000000000",
      "76561198000000001",
    ]);
  });
});

describe("fetchPlayerSummaries", () => {
  beforeEach(() => {
    getPlayerSummariesMock.mockReset();
  });

  it("returns a map of steam id to summary", async () => {
    getPlayerSummariesMock.mockResolvedValue({
      response: {
        players: [
          {
            steamid: "76561198000000000",
            personaname: "Alice",
            profileurl: "https://steamcommunity.com/id/alice",
            avatar: "a",
            avatarmedium: "b",
            avatarfull: "c",
          },
        ],
      },
    });

    const result = await fetchPlayerSummaries(["76561198000000000"]);

    expect(result.get("76561198000000000")).toMatchObject({
      personaname: "Alice",
      avatarfull: "c",
    });
  });

  it("returns an empty map without calling steam for empty input", async () => {
    const result = await fetchPlayerSummaries([]);

    expect(result.size).toBe(0);
    expect(getPlayerSummariesMock).not.toHaveBeenCalled();
  });
});
