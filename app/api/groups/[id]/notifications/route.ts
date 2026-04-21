import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getGroupById, getMemberRole } from "@/lib/db/group-repository";
import { getUserById } from "@/lib/db/user-repository";
import { checkForNewGames } from "@/lib/steam/notification-service";
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

    // Must be a member or creator
    const role = await getMemberRole(id, authUser.id);
    if (!role && group.creatorUserId !== authUser.id) {
      throw new SteamOverlapError("FORBIDDEN");
    }

    // Gate behind paid tier
    const user = await getUserById(authUser.id);
    if (!user || user.subscriptionTier === "free") {
      throw new SteamOverlapError("FORBIDDEN", {
        message: "Notifications are a paid feature. Upgrade to see what's new.",
      });
    }

    const notifications = await checkForNewGames(id, group.members);
    return NextResponse.json({ success: true, data: { notifications } });
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}
