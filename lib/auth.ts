import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  return { id: user.id, email: user.email };
}
