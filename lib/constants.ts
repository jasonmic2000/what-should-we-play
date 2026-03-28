export const MIN_PROFILE_COUNT = 2;
export const MAX_PROFILE_COUNT = 6;

export const STEAM_API_BASE_URL = "https://api.steampowered.com";

export const STEAM_API_ENDPOINTS = {
  resolveVanityUrl: `${STEAM_API_BASE_URL}/ISteamUser/ResolveVanityURL/v0001/`,
  getOwnedGames: `${STEAM_API_BASE_URL}/IPlayerService/GetOwnedGames/v0001/`,
  getPlayerSummaries: `${STEAM_API_BASE_URL}/ISteamUser/GetPlayerSummaries/v0002/`,
  // Phase 4: backend-only, not exposed in MVP response
  getRecentlyPlayedGames: `${STEAM_API_BASE_URL}/IPlayerService/GetRecentlyPlayedGames/v0001/`,
} as const;

export const VANITY_URL_RESOLUTION = {
  SUCCESS: 1,
  NOT_FOUND: 42,
} as const;

export function getGameHeaderImageUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

export function getGameIconUrl(appId: number, iconHash: string): string {
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${iconHash}.jpg`;
}

export function getGameLogoUrl(appId: number, logoHash: string): string {
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${logoHash}.jpg`;
}