import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserById } from "@/lib/db/user-repository";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const user = await getUserById(authUser.id);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "User profile not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, user });
}
