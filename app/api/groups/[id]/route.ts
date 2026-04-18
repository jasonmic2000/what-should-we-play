import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getGroupById,
  getMemberRole,
  updateGroup,
  deleteGroup,
} from "@/lib/db/group-repository";
import { SteamOverlapError, toSteamOverlapError } from "@/lib/steam/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new SteamOverlapError("UNAUTHORIZED");

    const { id } = await params;
    const group = await getGroupById(id);
    if (!group) throw new SteamOverlapError("NOT_FOUND");

    // Must be a member (or creator) to view
    const role = await getMemberRole(id, authUser.id);
    if (!role && group.creatorUserId !== authUser.id) {
      throw new SteamOverlapError("FORBIDDEN");
    }

    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new SteamOverlapError("UNAUTHORIZED");

    const { id } = await params;
    const group = await getGroupById(id);
    if (!group) throw new SteamOverlapError("NOT_FOUND");

    // Must be admin to update
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

    if (!body || typeof body !== "object") {
      throw new SteamOverlapError("INVALID_INPUT");
    }

    const { name } = body as { name?: unknown };
    const updates: { name?: string } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        throw new SteamOverlapError("INVALID_INPUT", {
          message: "Group name must be a non-empty string",
        });
      }
      updates.name = name.trim();
    }

    await updateGroup(id, updates);
    const updated = await getGroupById(id);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new SteamOverlapError("UNAUTHORIZED");

    const { id } = await params;
    const group = await getGroupById(id);
    if (!group) throw new SteamOverlapError("NOT_FOUND");

    // Must be admin or creator to delete
    const role = await getMemberRole(id, authUser.id);
    if (role !== "admin" && group.creatorUserId !== authUser.id) {
      throw new SteamOverlapError("FORBIDDEN");
    }

    await deleteGroup(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}
