import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateSteamId } from "@/lib/db/user-repository";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  await updateSteamId(user.id, null);

  return NextResponse.json({ success: true });
}
