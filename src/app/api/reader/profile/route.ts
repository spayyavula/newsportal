import { NextResponse } from "next/server";
import { sanitizeProfile } from "@/lib/news-assistant";
import { getCurrentUserFromToken, readSessionToken, upsertReaderProfile } from "@/lib/reader-account";

export async function PUT(request: Request) {
  const token = await readSessionToken();
  const user = await getCurrentUserFromToken(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { profile?: unknown };
  const profile = sanitizeProfile(body.profile as never);
  const savedProfile = await upsertReaderProfile(user.id, profile);
  return NextResponse.json({ profile: savedProfile });
}