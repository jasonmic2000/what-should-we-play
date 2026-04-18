import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getGroupById,
  getMemberRole,
  addMember,
  removeMember,
} from "@/lib/db/group-repository";
import { SteamOverlapError, toSteamOverlapError } from "@/lib/steam/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new SteamOverlapError("UNAUTHORIZED");

    const { id } = await params;
    const group = await getGroupById(id);
    if (!group) throw new SteamOverlapError("NOT_FOUND");

    // Must be admin to add members
    const role = await getMemberRole(id, authUser.id);
    if (role !== "admin" && group.creatorUserId !== authUser.id) {
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

    const { steamId64 } = (body as { steamId64?: unknown }) ?? {};
    if (typeof steamId64 !== "string" || steamId64.trim().length === 0) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "steamId64 is required",
      });
    }

    await addMember(id, steamId64.trim());

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new SteamOverlapError("UNAUTHORIZED");

    const { id } = await params;
    const group = await getGroupById(id);
    if (!group) throw new SteamOverlapError("NOT_FOUND");

    // Must be admin to remove members
    const role = await getMemberRole(id, authUser.id);
    if (role !== "admin" && group.creatorUserId !== authUser.id) {
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

    const { steamId64 } = (body as { steamId64?: unknown }) ?? {};
    if (typeof steamId64 !== "string" || steamId64.trim().length === 0) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "steamId64 is required",
      });
    }

    await removeMember(id, steamId64.trim());

    return NextResponse.json({ success: true });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}
