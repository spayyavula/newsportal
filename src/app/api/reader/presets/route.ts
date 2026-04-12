import { NextResponse } from "next/server";
import { sanitizeProfile } from "@/lib/news-assistant";
import { createFilterPreset, getActiveReaderSession, getCurrentUserFromToken, readSessionToken } from "@/lib/reader-account";

export async function GET() {
  const session = await getActiveReaderSession();
  return NextResponse.json({ presets: session.presets });
}

export async function POST(request: Request) {
  const token = await readSessionToken();
  const user = await getCurrentUserFromToken(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    isDefault?: boolean;
    profile?: unknown;
  };

  if (!body.name) {
    return NextResponse.json({ error: "Preset name is required." }, { status: 400 });
  }

  const preset = await createFilterPreset(user.id, {
    name: body.name,
    description: body.description ?? "",
    isDefault: Boolean(body.isDefault),
    profile: sanitizeProfile(body.profile as never),
  });

  return NextResponse.json({ preset });
}