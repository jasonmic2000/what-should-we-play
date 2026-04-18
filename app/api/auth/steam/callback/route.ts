import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateSteamId } from "@/lib/db/user-repository";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
const STEAM_ID_REGEX =
  /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/auth/login`
    );
  }

  // Extract claimed_id and parse SteamID64
  const claimedId = searchParams.get("openid.claimed_id");
  if (!claimedId) {
    return NextResponse.redirect(
      `${origin}/profile?steam_error=missing_claimed_id`
    );
  }

  const match = claimedId.match(STEAM_ID_REGEX);
  if (!match) {
    return NextResponse.redirect(
      `${origin}/profile?steam_error=invalid_claimed_id`
    );
  }

  const steamId64 = match[1];

  // Verify the OpenID response with Steam
  const verifyParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    verifyParams.set(key, value);
  }
  verifyParams.set("openid.mode", "check_authentication");

  const verifyResponse = await fetch(STEAM_OPENID_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });

  const verifyBody = await verifyResponse.text();

  if (!verifyBody.includes("is_valid:true")) {
    return NextResponse.redirect(
      `${origin}/profile?steam_error=verification_failed`
    );
  }

  // Store the linked SteamID64
  await updateSteamId(user.id, steamId64);

  return NextResponse.redirect(
    `${origin}/profile?steam_linked=true`
  );
}
