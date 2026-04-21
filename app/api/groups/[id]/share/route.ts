import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getGroupById, getMemberRole } from "@/lib/db/group-repository";
import { createSharedLink } from "@/lib/db/shared-link-repository";
import { SteamOverlapError, toSteamOverlapError } from "@/lib/steam/errors";
import type { OverlapSnapshot } from "@/lib/types";

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

    // Must be a member or creator
    const role = await getMemberRole(id, authUser.id);
    if (!role && group.creatorUserId !== authUser.id) {
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

    const { snapshotData } = (body as { snapshotData?: OverlapSnapshot }) ?? {};
    if (
      !snapshotData ||
      !Array.isArray(snapshotData.profiles) ||
      !Array.isArray(snapshotData.sharedGames) ||
      typeof snapshotData.generatedAt !== "string"
    ) {
      throw new SteamOverlapError("INVALID_INPUT", {
        message:
          "snapshotData must include profiles, sharedGames, and generatedAt",
      });
    }

    const linkId = await createSharedLink(id, authUser.id, snapshotData);
    const url = `/shared/${linkId}`;

    return NextResponse.json(
      { success: true, data: { linkId, url } },
      { status: 201 },
    );
  } catch (error) {
    const steamError = toSteamOverlapError(error);
    return NextResponse.json(
      { success: false, error: steamError.toApiError() },
      { status: steamError.statusCode },
    );
  }
}
