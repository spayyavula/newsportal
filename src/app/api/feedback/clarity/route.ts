import "server-only";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitGuard = new Map<string, number>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const last = rateLimitGuard.get(key);
  if (last && now - last < RATE_LIMIT_WINDOW_MS) {
    return true;
  }
  rateLimitGuard.set(key, now);

  if (rateLimitGuard.size > 1024) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    for (const [k, timestamp] of rateLimitGuard.entries()) {
      if (timestamp < cutoff) rateLimitGuard.delete(k);
    }
  }
  return false;
}

function sanitiseComment(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/<[^>]+>/g, "").trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, 1000);
}

function normaliseBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function POST(request: Request) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: "feedback-disabled" }, { status: 503 });
  }

  let payload: { slug?: unknown; clarity?: unknown; comment?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const clarity = payload.clarity;
  const comment = sanitiseComment(payload.comment);

  if (!slug || (clarity !== "yes" && clarity !== "no")) {
    return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const rateKey = `${ip}:${slug}`;
  if (isRateLimited(rateKey)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 200);

  try {
    const response = await fetch(`${normaliseBaseUrl(STRAPI_URL)}/api/article-feedbacks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          articleSlug: slug,
          clarity,
          comment,
          submittedAt: new Date().toISOString(),
          userAgent,
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "downstream-failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "network" }, { status: 502 });
  }
}
