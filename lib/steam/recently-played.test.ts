import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecentlyPlayedLibrary } from "@/lib/types";

const { getRecentlyPlayedGamesMock } = vi.hoisted(() => ({
  getRecentlyPlayedGamesMock: vi.fn(),
}));

vi.mock("./api", () => ({
  getRecentlyPlayedGames: getRecentlyPlayedGamesMock,
}));

import {
  fetchRecentlyPlayed,
  fetchRecentlyPlayedBatch,
  computeRecentlyPlayedRanking,
} from "./recently-played";

describe("fetchRecentlyPlayed", () => {
  beforeEach(() => {
    getRecentlyPlayedGamesMock.mockReset();
  });

  it("normalizes a response with games", async () => {
    getRecentlyPlayedGamesMock.mockResolvedValue({
      response: {
        total_count: 2,
        games: [
          { appid: 730, name: "CS2", playtime_2weeks: 120, playtime_forever: 5000, img_icon_url: "abc" },
          { appid: 570, name: "Dota 2", playtime_2weeks: 60, playtime_forever: 3000, img_icon_url: "def" },
        ],
      },
    });

    const result = await fetchRecentlyPlayed("76561198000000000");

    expect(result).toEqual({
      steamId64: "76561198000000000",
      totalCount: 2,
      games: [
        { appId: 730, playtime2Weeks: 120, playtimeForever: 5000 },
        { appId: 570, playtime2Weeks: 60, playtimeForever: 3000 },
      ],
    });
    expect(getRecentlyPlayedGamesMock).toHaveBeenCalledWith("76561198000000000");
  });

  it("returns empty games array when no recent games", async () => {
    getRecentlyPlayedGamesMock.mockResolvedValue({
      response: {
        total_count: 0,
      },
    });

    const result = await fetchRecentlyPlayed("76561198000000000");

    expect(result).toEqual({
      steamId64: "76561198000000000",
      totalCount: 0,
      games: [],
    });
  });
});

describe("fetchRecentlyPlayedBatch", () => {
  beforeEach(() => {
    getRecentlyPlayedGamesMock.mockReset();
  });

  it("fetches concurrently for multiple steam IDs", async () => {
    getRecentlyPlayedGamesMock
      .mockResolvedValueOnce({
        response: {
          total_count: 1,
          games: [{ appid: 730, name: "CS2", playtime_2weeks: 100, playtime_forever: 2000, img_icon_url: "" }],
        },
      })
      .mockResolvedValueOnce({
        response: {
          total_count: 0,
        },
      });

    const result = await fetchRecentlyPlayedBatch(["id1", "id2"]);

    expect(result.size).toBe(2);
    expect(result.get("id1")!.games).toHaveLength(1);
    expect(result.get("id2")!.games).toHaveLength(0);
    expect(getRecentlyPlayedGamesMock).toHaveBeenCalledTimes(2);
  });
});

describe("computeRecentlyPlayedRanking", () => {
  it("sums playtime_2weeks across users for shared games", () => {
    const recentlyPlayed = new Map<string, RecentlyPlayedLibrary>([
      [
        "user1",
        {
          steamId64: "user1",
          totalCount: 2,
          games: [
            { appId: 730, playtime2Weeks: 100, playtimeForever: 5000 },
            { appId: 570, playtime2Weeks: 50, playtimeForever: 3000 },
          ],
        },
      ],
      [
        "user2",
        {
          steamId64: "user2",
          totalCount: 1,
          games: [
            { appId: 730, playtime2Weeks: 80, playtimeForever: 2000 },
          ],
        },
      ],
    ]);

    const ranking = computeRecentlyPlayedRanking(recentlyPlayed, [730, 570, 440]);

    expect(ranking.get(730)).toBe(180); // 100 + 80
    expect(ranking.get(570)).toBe(50);  // only user1
    expect(ranking.get(440)).toBe(0);   // not in anyone's recently played
  });

  it("returns 0 for all games when no one played recently", () => {
    const recentlyPlayed = new Map<string, RecentlyPlayedLibrary>([
      ["user1", { steamId64: "user1", totalCount: 0, games: [] }],
    ]);

    const ranking = computeRecentlyPlayedRanking(recentlyPlayed, [730, 570]);

    expect(ranking.get(730)).toBe(0);
    expect(ranking.get(570)).toBe(0);
  });

  it("ignores recently played games not in the shared list", () => {
    const recentlyPlayed = new Map<string, RecentlyPlayedLibrary>([
      [
        "user1",
        {
          steamId64: "user1",
          totalCount: 1,
          games: [{ appId: 999, playtime2Weeks: 200, playtimeForever: 1000 }],
        },
      ],
    ]);

    const ranking = computeRecentlyPlayedRanking(recentlyPlayed, [730]);

    expect(ranking.get(730)).toBe(0);
    expect(ranking.has(999)).toBe(false);
  });
});
