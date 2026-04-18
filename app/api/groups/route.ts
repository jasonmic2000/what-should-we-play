import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserById } from "@/lib/db/user-repository";
import {
  createGroup,
  getUserGroups,
  countUserCreatedGroups,
} from "@/lib/db/group-repository";
import { SteamOverlapError, toSteamOverlapError } from "@/lib/steam/errors";

export async function POST(request: Request) {
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

    const { name, memberSteamIds } = body as {
      name?: unknown;
      memberSteamIds?: unknown;
    };

    if (typeof name !== "string" || name.trim().length === 0) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "Group name is required",
      });
    }

    if (!Array.isArray(memberSteamIds) || !memberSteamIds.every((s) => typeof s === "string")) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "memberSteamIds must be an array of strings",
      });
    }

    // Check group creation limit
    const user = await getUserById(authUser.id);
    if (!user) throw new SteamOverlapError("UNAUTHORIZED");

    if (user.subscriptionTier === "free") {
      const groupCount = await countUserCreatedGroups(authUser.id);
      if (groupCount >= 1) {
        throw new SteamOverlapError("GROUP_LIMIT_REACHED");
      }
    }

    const group = await createGroup(authUser.id, name.trim(), memberSteamIds);

    return NextResponse.json({ success: true, data: group }, { status: 201 });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new SteamOverlapError("UNAUTHORIZED");

    const userGroups = await getUserGroups(authUser.id);

    return NextResponse.json({ success: true, data: userGroups });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}
