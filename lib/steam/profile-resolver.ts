import { VANITY_URL_RESOLUTION } from "../constants";
import { ParsedProfile, ResolvedProfile } from "../types";
import { resolveVanityUrl } from "./api";
import { SteamOverlapError } from "./errors";

export async function resolveProfile(
  parsedProfile: ParsedProfile,
): Promise<ResolvedProfile> {
  if (parsedProfile.type === "steamid64") {
    return {
      originalUrl: parsedProfile.originalInput,
      steamId64: parsedProfile.identifier,
      profileUrl: parsedProfile.normalizedInput,
    };
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

  return {
    originalUrl: parsedProfile.originalInput,
    steamId64: steamid,
    vanityName: parsedProfile.identifier,
    profileUrl: parsedProfile.normalizedInput,
  };
}

export async function resolveBatch(
  parsedProfiles: ParsedProfile[],
): Promise<ResolvedProfile[]> {
  return Promise.all(parsedProfiles.map(resolveProfile));
}
