import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getGroupById, getMemberRole } from "@/lib/db/group-repository";
import { removeBookmark } from "@/lib/db/bookmark-repository";
import { SteamOverlapError, toSteamOverlapError } from "@/lib/steam/errors";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new SteamOverlapError("UNAUTHORIZED");

    const { id, appId: appIdStr } = await params;
    const group = await getGroupById(id);
    if (!group) throw new SteamOverlapError("NOT_FOUND");

    // Must be admin to remove bookmarks
    const role = await getMemberRole(id, authUser.id);
    if (role !== "admin" && group.creatorUserId !== authUser.id) {
      throw new SteamOverlapError("FORBIDDEN");
    }

    const appId = parseInt(appIdStr, 10);
    if (isNaN(appId) || appId <= 0) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "appId must be a positive integer",
      });
    }

    await removeBookmark(id, appId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}
