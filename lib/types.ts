// ============================================================================
// Input / Parsing Types
// ============================================================================

export type ParsedProfileType = "vanity" | "steamid64";

export interface ParsedProfile {
  type: ParsedProfileType;
  identifier: string;
  originalInput: string;
  normalizedInput: string;
}

// ============================================================================
// Steam API Response Types
// ============================================================================

export interface SteamResolveVanityURLResponse {
  response: {
    steamid?: string;
    success: 1 | 42; // 1 = success, 42 = vanity not found
  };
}

export interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
}

export interface SteamPlayerSummariesResponse {
  response: {
    players: SteamPlayerSummary[];
  };
}

export interface SteamOwnedGame {
  appid: number;
  playtime_forever: number;
  rtime_last_played?: number;
  name?: string;
  img_icon_url?: string;
  img_logo_url?: string;
}

export interface SteamOwnedGamesResponse {
  response: {
    game_count: number;
    games?: SteamOwnedGame[];
  };
}

// ============================================================================
// Normalized App Types
// ============================================================================

export interface ResolvedProfile {
  originalUrl: string;
  steamId64: string;
  profileUrl: string;
  vanityName?: string;
  personaName?: string;
  avatarUrl?: string;
}

export interface SteamGame {
  appId: number;
  name: string;
  playtimeForever: number;
  imgIconUrl: string;
  imgLogoUrl: string;
  headerImageUrl: string;
  rtimeLastPlayed?: number;
}

export interface GameLibrary {
  steamId64: string;
  gameCount: number;
  games: SteamGame[];
  isPrivate: boolean;
}

// ============================================================================
// API Types
// ============================================================================

export type APIErrorCode =
  | "INVALID_INPUT"
  | "PROFILE_RESOLUTION_FAILED"
  | "PRIVATE_LIBRARY"
  | "API_ERROR"
  | "RATE_LIMIT";

export interface APIError {
  code: APIErrorCode;
  message: string;
  failedProfile?: string;
  details?: unknown;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
}

export interface FindOverlapRequest {
  profiles: string[];
  forceRefresh?: boolean;
}

export interface FindOverlapData {
  profiles: ResolvedProfile[];
  sharedGames: SteamGame[];
}

export type FindOverlapResponse = APIResponse<FindOverlapData>;

// ============================================================================
// Steam Catalog API Types
// ============================================================================

export interface SteamAppListApp {
  appid: number;
  name: string;
  last_modified: number;
  price_change_number: number;
}

export interface SteamAppListResponse {
  response: {
    apps: SteamAppListApp[];
    have_more_results?: boolean;
    last_appid?: number;
  };
}

export interface SyncResult {
  jobType: string;
  status: "completed" | "failed";
  itemsProcessed: number;
  errorMessage?: string;
}

// ============================================================================
// Catalog Types (Drizzle-derived)
// ============================================================================

import type { catalogGames } from "./db/schema";

export type CatalogGameRow = typeof catalogGames.$inferSelect;
export type CatalogGameInsert = typeof catalogGames.$inferInsert;
