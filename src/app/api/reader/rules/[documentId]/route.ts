import { NextResponse } from "next/server";
import { deleteNotificationRule, getCurrentUserFromToken, readSessionToken, updateNotificationRule } from "@/lib/reader-account";
import type { NotificationChannel, NotificationFrequency } from "@/lib/reader-types";

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
    active?: boolean;
    frequency?: NotificationFrequency;
    channel?: NotificationChannel;
    deliveryHour?: number;
    timezone?: string;
    instruction?: string;
    presetDocumentId?: string | null;
  };

  if (!body.name) {
    return NextResponse.json({ error: "Rule name is required." }, { status: 400 });
  }

  const rule = await updateNotificationRule(user.id, documentId, {
    name: body.name,
    active: body.active ?? true,
    frequency: body.frequency ?? "daily",
    channel: body.channel ?? "in-app",
    deliveryHour: typeof body.deliveryHour === "number" ? body.deliveryHour : 8,
    timezone: body.timezone ?? "UTC",
    instruction: body.instruction ?? "",
    presetDocumentId: body.presetDocumentId ?? null,
  });

  return NextResponse.json({ rule });
}

export async function DELETE(_: Request, { params }: Params) {
  const token = await readSessionToken();
  const user = await getCurrentUserFromToken(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;
  await deleteNotificationRule(documentId);
  return NextResponse.json({ ok: true });
}