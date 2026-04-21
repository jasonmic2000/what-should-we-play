import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getGroupById, getMemberRole } from "@/lib/db/group-repository";
import { getUserById } from "@/lib/db/user-repository";
import { addBookmark, getBookmarks } from "@/lib/db/bookmark-repository";
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

    // Must be a member or creator to view bookmarks
    const role = await getMemberRole(id, authUser.id);
    if (!role && group.creatorUserId !== authUser.id) {
      throw new SteamOverlapError("FORBIDDEN");
    }

    const bookmarks = await getBookmarks(id);
    return NextResponse.json({ success: true, data: bookmarks });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}

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

    // Must be admin to add bookmarks
    const role = await getMemberRole(id, authUser.id);
    if (role !== "admin" && group.creatorUserId !== authUser.id) {
      throw new SteamOverlapError("FORBIDDEN");
    }

    // Gate behind paid tier
    const user = await getUserById(authUser.id);
    if (!user || user.subscriptionTier === "free") {
      throw new SteamOverlapError("FORBIDDEN", {
        message: "Bookmarks are a paid feature. Upgrade to access.",
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "Request body must be valid JSON",
      });
    }

    const { appId } = (body as { appId?: unknown }) ?? {};
    if (typeof appId !== "number" || !Number.isInteger(appId) || appId <= 0) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message: "appId must be a positive integer",
      });
    }

    await addBookmark(id, appId, authUser.id);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}
