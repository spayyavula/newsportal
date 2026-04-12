import { NextResponse } from "next/server";
import { getActiveReaderSession } from "@/lib/reader-account";

export async function GET() {
  const session = await getActiveReaderSession();
  return NextResponse.json(session);
}