import { NextResponse } from "next/server";
import { MAX_PROFILE_COUNT, MIN_PROFILE_COUNT } from "@/lib/constants";
import {
  canRefresh,
  invalidateProfile,
  recordRefresh,
} from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limiter";
import { parseSteamProfileInput } from "@/lib/steam/input-parser";
import { calculateGameOverlap } from "@/lib/steam/overlap-calculator";
import { fetchBatch, fetchPlayerSummaries } from "@/lib/steam/game-fetcher";
import { resolveBatch } from "@/lib/steam/profile-resolver";
import { SteamOverlapError, toSteamOverlapError } from "@/lib/steam/errors";
import { enrichSharedGames } from "@/lib/steam/result-enricher";
import {
  fetchRecentlyPlayedBatch,
  computeRecentlyPlayedRanking,
} from "@/lib/steam/recently-played";
import logger from "@/lib/logger";
import { getAuthUser } from "@/lib/auth";
import { recordSearch } from "@/lib/db/search-history-repository";
import {
  FindOverlapRequest,
  FindOverlapResponse,
  ParsedProfile,
  ResolvedProfile,
  SteamPlayerSummary,
} from "@/lib/types";

function createErrorResponse(error: SteamOverlapError) {
  const response: FindOverlapResponse = {
    success: false,
    error: error.toApiError(),
  };

  return NextResponse.json(response, { status: error.statusCode });
}

function validateRequestBody(body: unknown): FindOverlapRequest {
  if (!body || typeof body !== "object" || !("profiles" in body)) {
    throw new SteamOverlapError("INVALID_INPUT");
  }

  const { profiles, forceRefresh, multiplayerOnly } = body as {
    profiles?: unknown;
    forceRefresh?: unknown;
    multiplayerOnly?: unknown;
  };

  if (!Array.isArray(profiles)) {
    throw new SteamOverlapError("INVALID_INPUT");
  }

  if (
    profiles.length < MIN_PROFILE_COUNT ||
    profiles.length > MAX_PROFILE_COUNT
  ) {
    throw new SteamOverlapError("INVALID_INPUT", {
      message: `Submit between ${MIN_PROFILE_COUNT} and ${MAX_PROFILE_COUNT} Steam profile URLs`,
    });
  }

  if (!profiles.every((profile) => typeof profile === "string")) {
    throw new SteamOverlapError("INVALID_INPUT");
  }

  return {
    profiles,
    forceRefresh: forceRefresh === true,
    multiplayerOnly: multiplayerOnly === true,
  };
}

function parseAndValidateProfiles(profileInputs: string[]): ParsedProfile[] {
  const parsedProfiles = profileInputs.map((input) => {
    const parsed = parseSteamProfileInput(input);

    if (!parsed) {
      throw new SteamOverlapError("INVALID_INPUT");
    }

    return parsed;
  });

  const seenProfiles = new Set<string>();

  for (const profile of parsedProfiles) {
    if (seenProfiles.has(profile.normalizedInput.toLowerCase())) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "This profile has already been added",
        failedProfile: profile.originalInput,
      });
    }

    seenProfiles.add(profile.normalizedInput.toLowerCase());
  }

  return parsedProfiles;
}

function validateResolvedProfiles(profiles: ResolvedProfile[]) {
  const seenSteamIds = new Set<string>();

  for (const profile of profiles) {
    if (seenSteamIds.has(profile.steamId64)) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "This profile has already been added",
        failedProfile: profile.originalUrl,
      });
    }

    seenSteamIds.add(profile.steamId64);
  }
}

function mergePlayerSummaries(
  profiles: ResolvedProfile[],
  summaries: Map<string, SteamPlayerSummary>,
): ResolvedProfile[] {
  return profiles.map((profile) => {
    const summary = summaries.get(profile.steamId64);

    if (!summary) {
      return profile;
    }

    return {
      ...profile,
      personaName: summary.personaname,
      avatarUrl: summary.avatarfull,
      profileUrl: summary.profileurl || profile.profileUrl,
    };
  });
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Rate limit check — before any body parsing
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
    const rateLimitResult = checkRateLimit(clientIp);

    if (!rateLimitResult.allowed) {
      throw new SteamOverlapError("RATE_LIMIT");
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "Request body must be valid JSON",
      });
    }

    const validatedBody = validateRequestBody(body);

    // Determine effective forceRefresh after rate-limit check
    let effectiveForceRefresh = false;
    if (validatedBody.forceRefresh) {
      const parsedForRateLimit = validatedBody.profiles.map((input) => {
        const parsed = parseSteamProfileInput(input);
        return parsed?.identifier.toLowerCase() ?? input.toLowerCase();
      });

      const allAllowed = parsedForRateLimit.every((key) => canRefresh(key));
      if (!allAllowed) {
        throw new SteamOverlapError("INVALID_INPUT", {
          message:
            "Refresh is rate-limited to once per profile every 5 minutes. Please wait before refreshing again.",
        });
      }

      effectiveForceRefresh = true;

      // Invalidate caches and record refresh timestamps
      for (const key of parsedForRateLimit) {
        invalidateProfile(key);
        recordRefresh(key);
      }
    }

    const parsedProfiles = parseAndValidateProfiles(validatedBody.profiles);
    const resolvedProfiles = await resolveBatch(parsedProfiles, {
      forceRefresh: effectiveForceRefresh,
    });
    validateResolvedProfiles(resolvedProfiles);
    const steamIds = resolvedProfiles.map((profile) => profile.steamId64);

    // Also invalidate game library cache by steamId64 on refresh
    if (effectiveForceRefresh) {
      for (const steamId of steamIds) {
        invalidateProfile(steamId);
        recordRefresh(steamId);
      }
    }

    const [playerSummaries, librariesBySteamId] = await Promise.all([
      fetchPlayerSummaries(steamIds),
      fetchBatch(steamIds, { forceRefresh: effectiveForceRefresh }),
    ]);

    // Best-effort recently played fetch — if it fails, proceed without ranking
    let recentlyPlayedRanking: Map<number, number> | undefined;
    const profilesWithSummaries = mergePlayerSummaries(
      resolvedProfiles,
      playerSummaries,
    );
    const libraries = steamIds.map((steamId) => {
      const library = librariesBySteamId.get(steamId);

      if (!library) {
        throw new SteamOverlapError("API_ERROR", {
          details: `Missing library for steamId ${steamId}`,
        });
      }

      return library;
    });
    const sharedGames = calculateGameOverlap(libraries);

    // Compute recently played ranking if data is available
    try {
      const recentlyPlayedMap = await fetchRecentlyPlayedBatch(steamIds);
      const sharedAppIds = sharedGames.map((g) => g.appId);
      recentlyPlayedRanking = computeRecentlyPlayedRanking(
        recentlyPlayedMap,
        sharedAppIds,
      );
    } catch {
      // Graceful degradation: proceed without ranking
    }

    // Best-effort catalog enrichment — if it fails, fall back to unenriched games
    let enrichedGames;
    try {
      enrichedGames = await enrichSharedGames(sharedGames, recentlyPlayedRanking, validatedBody.multiplayerOnly);
    } catch {
      enrichedGames = sharedGames;
    }

    const response: FindOverlapResponse = {
      success: true,
      data: {
        profiles: profilesWithSummaries,
        sharedGames: enrichedGames,
      },
    };

    logger.info({
      msg: "overlap-request",
      profileCount: validatedBody.profiles.length,
      sharedGameCount: enrichedGames.length,
      durationMs: Date.now() - startTime,
      forceRefresh: effectiveForceRefresh,
    });

    // Fire-and-forget: record search history for authenticated users
    getAuthUser()
      .then((authUser) => {
        if (authUser) {
          recordSearch(authUser.id, steamIds, enrichedGames.length).catch(
            (err) => logger.error({ msg: "search-history-record-error", error: String(err) }),
          );
        }
      })
      .catch(() => {
        // Auth check failed — ignore silently
      });

    return NextResponse.json(response);
  } catch (error) {
    const steamError = toSteamOverlapError(error);

    logger.error({
      msg: "overlap-request-error",
      errorCode: steamError.code,
      durationMs: Date.now() - startTime,
    });

    return createErrorResponse(steamError);
  }
}
