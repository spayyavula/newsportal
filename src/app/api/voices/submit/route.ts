import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;

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

  let payload: {
    title?: unknown;
    body?: unknown;
    topicSlug?: unknown;
    sourceUrls?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const topicSlug = typeof payload.topicSlug === "string" ? payload.topicSlug : null;
  const sourceUrls = Array.isArray(payload.sourceUrls)
    ? payload.sourceUrls.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (title.length < 10 || title.length > 200) {
    return NextResponse.json({ error: "title length 10-200" }, { status: 400 });
  }
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 400 || wordCount > 1200) {
    return NextResponse.json({ error: "body must be 400-1200 words" }, { status: 400 });
  }

  for (const url of sourceUrls) {
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: `invalid url: ${url}` }, { status: 400 });
    }
  }

  const meResponse = await fetch(
    `${normaliseBaseUrl(STRAPI_URL)}/api/users/me?populate=role`,
    { headers: { Authorization: `Bearer ${sessionJwt}` } },
  );
  if (!meResponse.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = (await meResponse.json()) as { id: number; username: string; role?: { name?: string } };
  if (user.role?.name !== "Contributor") {
    return NextResponse.json({ error: "not-contributor" }, { status: 403 });
  }

  let topicId: number | null = null;
  if (topicSlug) {
    const topicResponse = await fetch(
      `${normaliseBaseUrl(STRAPI_URL)}/api/topics?filters[slug][$eq]=${encodeURIComponent(topicSlug)}&pagination[limit]=1`,
      { headers: { Authorization: `Bearer ${sessionJwt}` } },
    );
    if (topicResponse.ok) {
      const topicData = (await topicResponse.json()) as { data?: Array<{ id?: number }> };
      topicId = topicData.data?.[0]?.id ?? null;
    }
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 13);
  const slug = `voices-${user.id}-${stamp}`;

  const createResponse = await fetch(`${normaliseBaseUrl(STRAPI_URL)}/api/articles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionJwt}`,
    },
    body: JSON.stringify({
      data: {
        title,
        slug,
        summary: body.slice(0, 240),
        readTime: `${Math.max(2, Math.round(wordCount / 220))} min read`,
        storyType: "opinion",
        body,
        sources: sourceUrls,
        sourceNotes: sourceUrls.map((url) => ({ text: url, url })),
        featured: false,
        deepDive: false,
        format: "light",
        sourceType: "community",
        contributorByline: `${user.id}:${user.username}`,
        publishedOn: now.toISOString(),
        topic: topicId,
        publishedAt: null,
      },
    }),
  });

  if (!createResponse.ok) {
    return NextResponse.json({ error: "downstream-failed" }, { status: 502 });
  }

  return NextResponse.json({ status: "submitted" });
}
