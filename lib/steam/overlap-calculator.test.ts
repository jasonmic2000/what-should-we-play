import { describe, expect, it } from "vitest";
import { calculateGameOverlap } from "./overlap-calculator";
import { SteamOverlapError } from "./errors";

describe("calculateGameOverlap", () => {
  it("returns only games owned by every library", () => {
    const sharedGames = calculateGameOverlap([
      {
        steamId64: "1",
        gameCount: 2,
        isPrivate: false,
        games: [
          {
            appId: 20,
            name: "Alpha",
            playtimeForever: 10,
            imgIconUrl: "",
            imgLogoUrl: "",
            headerImageUrl: "",
          },
          {
            appId: 30,
            name: "Bravo",
            playtimeForever: 20,
            imgIconUrl: "",
            imgLogoUrl: "",
            headerImageUrl: "",
          },
        ],
      },
      {
        steamId64: "2",
        gameCount: 2,
        isPrivate: false,
        games: [
          {
            appId: 30,
            name: "Bravo",
            playtimeForever: 5,
            imgIconUrl: "",
            imgLogoUrl: "",
            headerImageUrl: "",
          },
          {
            appId: 40,
            name: "Charlie",
            playtimeForever: 50,
            imgIconUrl: "",
            imgLogoUrl: "",
            headerImageUrl: "",
          },
        ],
      },
    ]);

    expect(sharedGames).toEqual([
      {
        appId: 30,
        name: "Bravo",
        playtimeForever: 20,
        imgIconUrl: "",
        imgLogoUrl: "",
        headerImageUrl: "",
      },
    ]);
  });

  it("sorts shared games alphabetically", () => {
    const sharedGames = calculateGameOverlap([
      {
        steamId64: "1",
        gameCount: 2,
        isPrivate: false,
        games: [
          {
            appId: 2,
            name: "Zulu",
            playtimeForever: 10,
            imgIconUrl: "",
            imgLogoUrl: "",
            headerImageUrl: "",
          },
          {
            appId: 1,
            name: "Alpha",
            playtimeForever: 20,
            imgIconUrl: "",
            imgLogoUrl: "",
            headerImageUrl: "",
          },
        ],
      },
      {
        steamId64: "2",
        gameCount: 2,
        isPrivate: false,
        games: [
          {
            appId: 1,
            name: "Alpha",
            playtimeForever: 5,
            imgIconUrl: "",
            imgLogoUrl: "",
            headerImageUrl: "",
          },
          {
            appId: 2,
            name: "Zulu",
            playtimeForever: 50,
            imgIconUrl: "",
            imgLogoUrl: "",
            headerImageUrl: "",
          },
        ],
      },
    ]);

    expect(sharedGames.map((game) => game.name)).toEqual(["Alpha", "Zulu"]);
  });

  it("returns an empty list when there is no overlap", () => {
    expect(
      calculateGameOverlap([
        {
          steamId64: "1",
          gameCount: 1,
          isPrivate: false,
          games: [
            {
              appId: 10,
              name: "Only Here",
              playtimeForever: 1,
              imgIconUrl: "",
              imgLogoUrl: "",
              headerImageUrl: "",
            },
          ],
        },
        {
          steamId64: "2",
          gameCount: 1,
          isPrivate: false,
          games: [
            {
              appId: 20,
              name: "Only There",
              playtimeForever: 1,
              imgIconUrl: "",
              imgLogoUrl: "",
              headerImageUrl: "",
            },
          ],
        },
      ]),
    ).toEqual([]);
  });

  it("fails fast for private libraries", () => {
    expect(() =>
      calculateGameOverlap([
        {
          steamId64: "1",
          gameCount: 0,
          isPrivate: true,
          games: [],
        },
      ]),
    ).toThrowError(SteamOverlapError);
  });
});
