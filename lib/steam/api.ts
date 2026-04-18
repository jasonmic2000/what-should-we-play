import { STEAM_API_ENDPOINTS } from "../constants";
import {
  SteamOwnedGamesResponse,
  SteamPlayerSummariesResponse,
  SteamRecentlyPlayedGamesResponse,
  SteamResolveVanityURLResponse,
} from "../types";
import { SteamOverlapError } from "./errors";

type SteamEndpoint = keyof typeof STEAM_API_ENDPOINTS;

function getSteamApiKey(): string {
  const apiKey = process.env.STEAM_API_KEY?.trim();

  if (!apiKey) {
    throw new SteamOverlapError("API_ERROR", {
      message:
        "STEAM_API_KEY is not configured. Add it to your environment before using the overlap API",
    });
  }

  return apiKey;
}

export async function steamApiFetch<T>(
  endpoint: SteamEndpoint,
  params: Record<string, string>,
): Promise<T> {
  const apiKey = getSteamApiKey();
  const url = new URL(STEAM_API_ENDPOINTS[endpoint]);

  url.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      cache: "no-store",
    });
  } catch (error) {
    throw new SteamOverlapError("API_ERROR", {
      details: error instanceof Error ? error.message : error,
    });
  }

  if (!response.ok) {
    throw new SteamOverlapError("API_ERROR", {
      details: `Steam API returned ${response.status} ${response.statusText}`,
    });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new SteamOverlapError("API_ERROR", {
      details: error instanceof Error ? error.message : error,
    });
  }
}

export function resolveVanityUrl(vanityName: string) {
  return steamApiFetch<SteamResolveVanityURLResponse>("resolveVanityUrl", {
    vanityurl: vanityName,
  });
}

export function getOwnedGames(steamId64: string) {
  return steamApiFetch<SteamOwnedGamesResponse>("getOwnedGames", {
    steamid: steamId64,
    include_appinfo: "1",
    include_played_free_games: "1",
    format: "json",
  });
}

export function getPlayerSummaries(steamIds: string[]) {
  return steamApiFetch<SteamPlayerSummariesResponse>("getPlayerSummaries", {
    steamids: steamIds.join(","),
  });
}

export function getRecentlyPlayedGames(steamId64: string) {
  return steamApiFetch<SteamRecentlyPlayedGamesResponse>(
    "getRecentlyPlayedGames",
    {
      steamid: steamId64,
      format: "json",
    },
  );
}
