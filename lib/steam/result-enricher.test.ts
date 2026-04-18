import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SteamGame } from "@/lib/types";

const { getGamesByAppIdsMock } = vi.hoisted(() => ({
  getGamesByAppIdsMock: vi.fn(),
}));

vi.mock("@/lib/db/catalog-repository", () => ({
  getGamesByAppIds: getGamesByAppIdsMock,
}));

import { enrichSharedGames } from "./result-enricher";

function makeGame(overrides: Partial<SteamGame> & { appId: number; name: string }): SteamGame {
  return {
    playtimeForever: 0,
    imgIconUrl: "",
    imgLogoUrl: "",
    headerImageUrl: "",
    ...overrides,
  };
}

describe("enrichSharedGames", () => {
  beforeEach(() => {
    getGamesByAppIdsMock.mockReset();
  });

  it("returns empty array for empty input", async () => {
    const result = await enrichSharedGames([]);
    expect(result).toEqual([]);
    expect(getGamesByAppIdsMock).not.toHaveBeenCalled();
  });

  it("enriches games with catalog data", async () => {
    const games = [
      makeGame({ appId: 730, name: "Counter-Strike 2" }),
      makeGame({ appId: 440, name: "Team Fortress 2" }),
    ];

    getGamesByAppIdsMock.mockResolvedValue(
      new Map([
        [730, { appId: 730, name: "Counter-Strike 2", isFree: false, isGroupPlayable: true }],
        [440, { appId: 440, name: "Team Fortress 2", isFree: false, isGroupPlayable: true }],
      ]),
    );

    const result = await enrichSharedGames(games);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ appId: 730, isFree: false, isGroupPlayable: true });
    expect(result[1]).toMatchObject({ appId: 440, isFree: false, isGroupPlayable: true });
  });

  it("filters out F2P games (isFree === true)", async () => {
    const games = [
      makeGame({ appId: 730, name: "Counter-Strike 2" }),
      makeGame({ appId: 570, name: "Dota 2" }),
    ];

    getGamesByAppIdsMock.mockResolvedValue(
      new Map([
        [730, { appId: 730, name: "Counter-Strike 2", isFree: false, isGroupPlayable: true }],
        [570, { appId: 570, name: "Dota 2", isFree: true, isGroupPlayable: true }],
      ]),
    );

    const result = await enrichSharedGames(games);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ appId: 730, name: "Counter-Strike 2" });
  });

  it("returns games not in catalog as-is (graceful degradation)", async () => {
    const games = [
      makeGame({ appId: 730, name: "Counter-Strike 2" }),
      makeGame({ appId: 99999, name: "Unknown Game" }),
    ];

    getGamesByAppIdsMock.mockResolvedValue(
      new Map([
        [730, { appId: 730, name: "Counter-Strike 2", isFree: false, isGroupPlayable: null }],
      ]),
    );

    const result = await enrichSharedGames(games);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ appId: 730, isFree: false });
    expect(result[1]).toMatchObject({ appId: 99999, name: "Unknown Game" });
    expect(result[1]).not.toHaveProperty("isFree");
  });

  it("does NOT filter games where isFree is null (unknown)", async () => {
    const games = [
      makeGame({ appId: 730, name: "Counter-Strike 2" }),
      makeGame({ appId: 440, name: "Team Fortress 2" }),
    ];

    getGamesByAppIdsMock.mockResolvedValue(
      new Map([
        [730, { appId: 730, name: "Counter-Strike 2", isFree: null, isGroupPlayable: null }],
        [440, { appId: 440, name: "Team Fortress 2", isFree: null, isGroupPlayable: null }],
      ]),
    );

    const result = await enrichSharedGames(games);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ appId: 730, isFree: null });
    expect(result[1]).toMatchObject({ appId: 440, isFree: null });
  });

  it("does NOT filter games where isFree is false", async () => {
    const games = [
      makeGame({ appId: 730, name: "Counter-Strike 2" }),
      makeGame({ appId: 440, name: "Team Fortress 2" }),
    ];

    getGamesByAppIdsMock.mockResolvedValue(
      new Map([
        [730, { appId: 730, name: "Counter-Strike 2", isFree: false, isGroupPlayable: true }],
        [440, { appId: 440, name: "Team Fortress 2", isFree: false, isGroupPlayable: null }],
      ]),
    );

    const result = await enrichSharedGames(games);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ appId: 730, isFree: false });
    expect(result[1]).toMatchObject({ appId: 440, isFree: false });
  });

  it("returns unenriched games when DB call fails", async () => {
    const games = [
      makeGame({ appId: 730, name: "Counter-Strike 2" }),
    ];

    getGamesByAppIdsMock.mockRejectedValue(new Error("DB connection failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await enrichSharedGames(games);
    consoleSpy.mockRestore();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ appId: 730, name: "Counter-Strike 2" });
    expect(result[0]).not.toHaveProperty("isFree");
  });

  describe("multiplayerOnly filtering", () => {
    it("filters out games where isGroupPlayable === false when multiplayerOnly is true", async () => {
      const games = [
        makeGame({ appId: 730, name: "Counter-Strike 2" }),
        makeGame({ appId: 440, name: "Team Fortress 2" }),
        makeGame({ appId: 100, name: "Single Player Game" }),
      ];

      getGamesByAppIdsMock.mockResolvedValue(
        new Map([
          [730, { appId: 730, name: "Counter-Strike 2", isFree: false, isGroupPlayable: true }],
          [440, { appId: 440, name: "Team Fortress 2", isFree: false, isGroupPlayable: true }],
          [100, { appId: 100, name: "Single Player Game", isFree: false, isGroupPlayable: false }],
        ]),
      );

      const result = await enrichSharedGames(games, undefined, true);

      expect(result).toHaveLength(2);
      expect(result.map((g) => g.appId)).toEqual([730, 440]);
    });

    it("keeps games where isGroupPlayable is null/undefined when multiplayerOnly is true", async () => {
      const games = [
        makeGame({ appId: 730, name: "Counter-Strike 2" }),
        makeGame({ appId: 440, name: "Unknown Game" }),
        makeGame({ appId: 99999, name: "Not In Catalog" }),
      ];

      getGamesByAppIdsMock.mockResolvedValue(
        new Map([
          [730, { appId: 730, name: "Counter-Strike 2", isFree: false, isGroupPlayable: true }],
          [440, { appId: 440, name: "Unknown Game", isFree: false, isGroupPlayable: null }],
        ]),
      );

      const result = await enrichSharedGames(games, undefined, true);

      expect(result).toHaveLength(3);
      expect(result.map((g) => g.appId)).toEqual([730, 440, 99999]);
    });

    it("keeps games where isGroupPlayable === true when multiplayerOnly is true", async () => {
      const games = [
        makeGame({ appId: 730, name: "Counter-Strike 2" }),
      ];

      getGamesByAppIdsMock.mockResolvedValue(
        new Map([
          [730, { appId: 730, name: "Counter-Strike 2", isFree: false, isGroupPlayable: true }],
        ]),
      );

      const result = await enrichSharedGames(games, undefined, true);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ appId: 730, isGroupPlayable: true });
    });

    it("does not filter by multiplayer when multiplayerOnly is false", async () => {
      const games = [
        makeGame({ appId: 730, name: "Counter-Strike 2" }),
        makeGame({ appId: 100, name: "Single Player Game" }),
      ];

      getGamesByAppIdsMock.mockResolvedValue(
        new Map([
          [730, { appId: 730, name: "Counter-Strike 2", isFree: false, isGroupPlayable: true }],
          [100, { appId: 100, name: "Single Player Game", isFree: false, isGroupPlayable: false }],
        ]),
      );

      const result = await enrichSharedGames(games, undefined, false);

      expect(result).toHaveLength(2);
      expect(result.map((g) => g.appId)).toEqual([730, 100]);
    });
  });
});
