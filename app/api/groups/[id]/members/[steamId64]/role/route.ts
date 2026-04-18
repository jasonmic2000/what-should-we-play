import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getGroupById,
  getMemberRole,
  setMemberRole,
} from "@/lib/db/group-repository";
import { SteamOverlapError, toSteamOverlapError } from "@/lib/steam/errors";
import type { GroupRole } from "@/lib/types";

const VALID_ROLES: GroupRole[] = ["admin", "member"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; steamId64: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new SteamOverlapError("UNAUTHORIZED");

    const { id, steamId64 } = await params;
    const group = await getGroupById(id);
    if (!group) throw new SteamOverlapError("NOT_FOUND");

    // Must be admin to manage roles
    const callerRole = await getMemberRole(id, authUser.id);
    if (callerRole !== "admin" && group.creatorUserId !== authUser.id) {
      throw new SteamOverlapError("FORBIDDEN");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "Request body must be valid JSON",
      });
    }

    const { role } = (body as { role?: unknown }) ?? {};
    if (typeof role !== "string" || !VALID_ROLES.includes(role as GroupRole)) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: 'role must be "admin" or "member"',
      });
    }

    await setMemberRole(id, steamId64, role as GroupRole);

    return NextResponse.json({ success: true });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}
