import { NextResponse } from "next/server";
import { registerReader, SESSION_COOKIE } from "@/lib/reader-account";

export async function POST(request: Request) {
  const { name, email, password } = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  try {
    const result = await registerReader(name, email, password);
    const response = NextResponse.json({ user: result.user });
    response.cookies.set(SESSION_COOKIE, result.jwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Registration failed.";
    let detail = raw;
    try {
      const parsed = JSON.parse(raw);
      detail = parsed?.error?.message ?? parsed?.message ?? raw;
    } catch {
      // raw wasn't JSON; keep as-is
    }
    return NextResponse.json({ error: detail }, { status: 400 });
  }
}