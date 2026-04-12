import { NextResponse } from "next/server";
import { createNotificationRule, getActiveReaderSession, getCurrentUserFromToken, readSessionToken } from "@/lib/reader-account";
import type { NotificationChannel, NotificationFrequency } from "@/lib/reader-types";

export async function GET() {
  const session = await getActiveReaderSession();
  return NextResponse.json({ rules: session.rules });
}

export async function POST(request: Request) {
  const token = await readSessionToken();
  const user = await getCurrentUserFromToken(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const rule = await createNotificationRule(user.id, {
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