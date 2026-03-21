import {
  getGameHeaderImageUrl,
  getGameIconUrl,
  getGameLogoUrl,
} from "../constants";
import {
  GameLibrary,
  SteamGame,
  SteamOwnedGame,
  SteamPlayerSummary,
} from "../types";
import { getOwnedGames, getPlayerSummaries } from "./api";
import { SteamOverlapError } from "./errors";

function normalizeOwnedGame(game: SteamOwnedGame): SteamGame {
  return {
    appId: game.appid,
    name: game.name?.trim() || "Unknown Game",
    playtimeForever: game.playtime_forever,
    imgIconUrl: game.img_icon_url
      ? getGameIconUrl(game.appid, game.img_icon_url)
      : "",
    imgLogoUrl: game.img_logo_url
      ? getGameLogoUrl(game.appid, game.img_logo_url)
      : "",
    headerImageUrl: getGameHeaderImageUrl(game.appid),
    rtimeLastPlayed: game.rtime_last_played,
  };
}

export async function fetchGames(steamId64: string): Promise<GameLibrary> {
  const response = await getOwnedGames(steamId64);
  const library = response.response;

  if (!library.games) {
    throw new SteamOverlapError("PRIVATE_LIBRARY", {
      failedProfile: steamId64,
    });
  }

  return {
    steamId64,
    gameCount: library.game_count,
    games: library.games.map(normalizeOwnedGame),
    isPrivate: false,
  };
}

export async function fetchBatch(
  steamIds: string[],
): Promise<Map<string, GameLibrary>> {
  const libraries = await Promise.all(
    steamIds.map(async (steamId64) => [steamId64, await fetchGames(steamId64)]),
  );

  return new Map(libraries);
}

export async function fetchPlayerSummaries(
  steamIds: string[],
): Promise<Map<string, SteamPlayerSummary>> {
  if (steamIds.length === 0) {
    return new Map();
  }

  const response = await getPlayerSummaries(steamIds);
  const players = response.response.players ?? [];

  return new Map(players.map((player) => [player.steamid, player]));
}
