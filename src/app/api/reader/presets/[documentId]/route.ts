import { NextResponse } from "next/server";
import { sanitizeProfile } from "@/lib/news-assistant";
import { deleteFilterPreset, getCurrentUserFromToken, readSessionToken, updateFilterPreset } from "@/lib/reader-account";

type Params = {
  params: Promise<{ documentId: string }>;
};

export async function PUT(request: Request, { params }: Params) {
  const token = await readSessionToken();
  const user = await getCurrentUserFromToken(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    isDefault?: boolean;
    profile?: unknown;
  };

  if (!body.name) {
    return NextResponse.json({ error: "Preset name is required." }, { status: 400 });
  }

  const preset = await updateFilterPreset(user.id, documentId, {
    name: body.name,
    description: body.description ?? "",
    isDefault: Boolean(body.isDefault),
    profile: sanitizeProfile(body.profile as never),
  });

  return NextResponse.json({ preset });
}

export async function DELETE(_: Request, { params }: Params) {
  const token = await readSessionToken();
  const user = await getCurrentUserFromToken(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;
  await deleteFilterPreset(documentId);
  return NextResponse.json({ ok: true });
}