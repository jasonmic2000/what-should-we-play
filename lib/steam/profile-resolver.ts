import { VANITY_URL_RESOLUTION } from "../constants";
import { vanityCache } from "../cache";
import { ParsedProfile, ResolvedProfile } from "../types";
import { resolveVanityUrl } from "./api";
import { SteamOverlapError } from "./errors";

export interface ResolveOptions {
  forceRefresh?: boolean;
}

export async function resolveProfile(
  parsedProfile: ParsedProfile,
  options: ResolveOptions = {},
): Promise<ResolvedProfile> {
  if (parsedProfile.type === "steamid64") {
    return {
      originalUrl: parsedProfile.originalInput,
      steamId64: parsedProfile.identifier,
      profileUrl: parsedProfile.normalizedInput,
    };
  }

  const vanityKey = parsedProfile.identifier.toLowerCase();

  // Check cache unless caller requested a forced refresh
  if (!options.forceRefresh) {
    const cached = vanityCache.get(vanityKey);
    if (cached) {
      return {
        originalUrl: parsedProfile.originalInput,
        steamId64: cached,
        vanityName: parsedProfile.identifier,
        profileUrl: parsedProfile.normalizedInput,
      };
    }
  }

  const response = await resolveVanityUrl(parsedProfile.identifier);
  const { success, steamid } = response.response;

  if (success === VANITY_URL_RESOLUTION.NOT_FOUND || !steamid) {
    throw new SteamOverlapError("PROFILE_RESOLUTION_FAILED", {
      failedProfile: parsedProfile.originalInput,
    });
  }

  if (success !== VANITY_URL_RESOLUTION.SUCCESS) {
    throw new SteamOverlapError("API_ERROR", {
      details: `Unexpected vanity resolution status: ${success}`,
      failedProfile: parsedProfile.originalInput,
    });
  }

  // Store in cache
  vanityCache.set(vanityKey, steamid);

  return {
    originalUrl: parsedProfile.originalInput,
    steamId64: steamid,
    vanityName: parsedProfile.identifier,
    profileUrl: parsedProfile.normalizedInput,
  };
}

export async function resolveBatch(
  parsedProfiles: ParsedProfile[],
  options: ResolveOptions = {},
): Promise<ResolvedProfile[]> {
  return Promise.all(parsedProfiles.map((p) => resolveProfile(p, options)));
}
