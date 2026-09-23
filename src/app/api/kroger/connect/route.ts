import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUserId } from "@/lib/session";
import { getAuthorizeUrl } from "@/lib/kroger";

/**
 * Redirects the user to Kroger's authorization page. `state` embeds the
 * user id (signed-ish via a random nonce stored in a cookie) so the callback
 * knows who to attach the resulting tokens to.
 */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", "http://localhost"));

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${userId}.${nonce}`;

  const res = NextResponse.redirect(getAuthorizeUrl(state));
  res.cookies.set("kroger_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/"
  });
  return res;
}
