import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { critiqueDraft } from "@/lib/voices-llm";
import { rateLimit } from "@/lib/voices-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CRITIQUE_LIMIT_PER_DAY = 20;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionJwt = cookieStore.get("cg-reader-session")?.value;
  if (!sessionJwt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { title?: unknown; body?: unknown; sourceUrls?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const sourceUrls = Array.isArray(payload.sourceUrls)
    ? payload.sourceUrls.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (title.length === 0 || body.length < 100) {
    return NextResponse.json({ error: "draft-too-short" }, { status: 400 });
  }

  const limit = rateLimit(`critique:${sessionJwt}`, CRITIQUE_LIMIT_PER_DAY, ONE_DAY_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "daily-limit", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const result = await critiqueDraft({ title, body, sourceUrls });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ critique: result.critique, model: result.model });
}
