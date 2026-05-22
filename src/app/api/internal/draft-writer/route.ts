import "server-only";
import { NextResponse } from "next/server";
import { runDrafterPipeline } from "@/lib/draft-writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Kill switch
  if (process.env.DRAFT_WRITER_ENABLED !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 503 });
  }

  // 2. Shared-secret auth
  const expected = process.env.DRAFT_WRITER_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "secret-not-configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 3. Run pipeline
  const result = await runDrafterPipeline();
  return NextResponse.json(result);
}
