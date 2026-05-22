import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/voices-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const APPLY_LIMIT_WINDOW_MS = 30 * ONE_DAY_MS;

function normaliseBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function POST(request: Request) {
  if (!STRAPI_URL) {
    return NextResponse.json({ error: "service-unavailable" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const sessionJwt = cookieStore.get("cg-reader-session")?.value;
  if (!sessionJwt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { displayName?: unknown; pitch?: unknown; priorWriting?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const displayName = typeof payload.displayName === "string" ? payload.displayName.trim() : "";
  const pitch = typeof payload.pitch === "string" ? payload.pitch.trim() : "";
  const priorWriting =
    typeof payload.priorWriting === "string" ? payload.priorWriting.trim() : undefined;

  if (displayName.length === 0 || displayName.length > 80) {
    return NextResponse.json({ error: "displayName invalid" }, { status: 400 });
  }
  if (pitch.length < 100 || pitch.length > 1500) {
    return NextResponse.json({ error: "pitch length must be 100-1500" }, { status: 400 });
  }

  const meResponse = await fetch(`${normaliseBaseUrl(STRAPI_URL)}/api/users/me`, {
    headers: { Authorization: `Bearer ${sessionJwt}` },
  });
  if (!meResponse.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = (await meResponse.json()) as { id: number; email: string };

  const limit = rateLimit(`apply:${user.id}`, 1, APPLY_LIMIT_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "already-applied", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const createResponse = await fetch(
    `${normaliseBaseUrl(STRAPI_URL)}/api/contributor-applications`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionJwt}`,
      },
      body: JSON.stringify({
        data: {
          user: user.id,
          email: user.email,
          displayName,
          pitch,
          priorWriting,
          status: "pending",
          submittedAt: new Date().toISOString(),
        },
      }),
    },
  );

  if (!createResponse.ok) {
    return NextResponse.json({ error: "downstream-failed" }, { status: 502 });
  }

  return NextResponse.json({ status: "pending" });
}
