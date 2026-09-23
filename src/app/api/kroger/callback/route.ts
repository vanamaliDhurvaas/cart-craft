import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForUserToken } from "@/lib/kroger";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("kroger_oauth_state="))
    ?.split("=")[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.json({ error: "Invalid or expired Kroger authorization state." }, { status: 400 });
  }

  const userId = state.split(".")[0];

  let token;
  try {
    token = await exchangeCodeForUserToken(code);
  } catch (err) {
    return NextResponse.json({ error: `Kroger token exchange failed: ${(err as Error).message}` }, { status: 502 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      krogerAccessToken: token.access_token,
      krogerRefreshToken: token.refresh_token,
      krogerTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000)
    }
  });

  const res = NextResponse.redirect(new URL("/settings/kroger?connected=1", req.url));
  res.cookies.delete("kroger_oauth_state");
  return res;
}
