import { NextRequest, NextResponse } from "next/server";
import { getSharedLink } from "@/lib/db/shared-link-repository";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;
  const link = await getSharedLink(linkId);

  if (!link) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "This shared link has expired or does not exist.",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      snapshotData: link.snapshotData,
      expiresAt: link.expiresAt,
      groupId: link.groupId,
    },
  });
}
