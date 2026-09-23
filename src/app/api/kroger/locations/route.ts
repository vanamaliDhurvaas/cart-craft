import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { searchLocations } from "@/lib/kroger";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const zip = new URL(req.url).searchParams.get("zip");
  if (!zip) return NextResponse.json({ error: "zip query param is required." }, { status: 400 });

  try {
    const locations = await searchLocations(zip);
    return NextResponse.json(locations);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
