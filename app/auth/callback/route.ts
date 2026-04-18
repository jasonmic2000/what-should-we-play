import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUser } from "@/lib/db/user-repository";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Upsert user record in the users table
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        await createUser({ id: user.id, email: user.email });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
