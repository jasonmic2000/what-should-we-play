import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserById } from "@/lib/db/user-repository";
import {
  recordSearch,
  getSearchHistory,
} from "@/lib/db/search-history-repository";
import { SteamOverlapError, toSteamOverlapError } from "@/lib/steam/errors";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new SteamOverlapError("UNAUTHORIZED");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "Request body must be valid JSON",
      });
    }

    if (!body || typeof body !== "object") {
      throw new SteamOverlapError("INVALID_INPUT");
    }

    const { profilesSearched, sharedGameCount } = body as {
      profilesSearched?: unknown;
      sharedGameCount?: unknown;
    };

    if (
      !Array.isArray(profilesSearched) ||
      !profilesSearched.every((p) => typeof p === "string") ||
      profilesSearched.length === 0
    ) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "profilesSearched must be a non-empty array of strings",
      });
    }

    if (typeof sharedGameCount !== "number" || sharedGameCount < 0) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "sharedGameCount must be a non-negative number",
      });
    }

    await recordSearch(authUser.id, profilesSearched, sharedGameCount);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new SteamOverlapError("UNAUTHORIZED");

    // Gate retrieval behind paid tier
    const user = await getUserById(authUser.id);
    if (!user || user.subscriptionTier === "free") {
      throw new SteamOverlapError("FORBIDDEN", {
        message:
          "Search history is a paid feature. Upgrade to view your past searches.",
      });
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.max(1, Math.min(100, Number(limitParam))) : undefined;

    const history = await getSearchHistory(authUser.id, limit || undefined);

    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}
