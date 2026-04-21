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
  | "RATE_LIMIT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "GROUP_LIMIT_REACHED";

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
  multiplayerOnly?: boolean;
}

export interface EnrichedSharedGame extends SteamGame {
  isFree?: boolean | null;
  isGroupPlayable?: boolean | null;
  recentPlaytimeScore?: number;
}

export interface FindOverlapData {
  profiles: ResolvedProfile[];
  sharedGames: EnrichedSharedGame[];
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
// Recently Played Types
// ============================================================================

export interface SteamRecentlyPlayedGame {
  appid: number;
  name: string;
  playtime_2weeks: number;
  playtime_forever: number;
  img_icon_url: string;
}

export interface SteamRecentlyPlayedGamesResponse {
  response: {
    total_count: number;
    games?: SteamRecentlyPlayedGame[];
  };
}

export interface RecentlyPlayedLibrary {
  steamId64: string;
  totalCount: number;
  games: Array<{
    appId: number;
    playtime2Weeks: number;
    playtimeForever: number;
  }>;
}

// ============================================================================
// Catalog Types (Drizzle-derived)
// ============================================================================

import type { catalogGames } from "./db/schema";

export type CatalogGameRow = typeof catalogGames.$inferSelect;
export type CatalogGameInsert = typeof catalogGames.$inferInsert;

// ============================================================================
// Auth / User Types
// ============================================================================

export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  steamId64?: string;
  subscriptionTier: "free" | "paid";
  stripeCustomerId?: string;
}

// ============================================================================
// Group Types
// ============================================================================

export type GroupRole = "admin" | "member";

export interface Group {
  id: string;
  name: string;
  creatorUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  groupId: string;
  steamId64: string;
  userId?: string;
  role: GroupRole;
  addedAt: string;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

export interface GroupBookmark {
  groupId: string;
  appId: number;
  addedByUserId: string;
  addedAt: string;
}

export interface BookmarkedGame extends GroupBookmark {
  name: string;
  headerImageUrl: string;
}

export interface SharedLink {
  id: string;
  groupId: string;
  createdByUserId: string;
  snapshotData: OverlapSnapshot;
  expiresAt: string;
  createdAt: string;
}

export interface OverlapSnapshot {
  profiles: ResolvedProfile[];
  sharedGames: EnrichedSharedGame[];
  generatedAt: string;
}

export interface SearchHistoryEntry {
  id: string;
  userId: string;
  profilesSearched: string[];
  sharedGameCount: number;
  searchedAt: string;
}

export interface CachedMemberLibrary {
  groupId: string;
  steamId64: string;
  appIds: number[];
  cachedAt: string;
}
