import { NextRequest, NextResponse } from "next/server";
import { getAppEnv } from "@/lib/env";
import { PREVIEW_SESSION_COOKIE } from "@/lib/auth/session";
import { MOCK_ADMIN_USER } from "@/lib/mock-data";

export async function POST(request: NextRequest) {
  const env = getAppEnv();

  // Security guard: This endpoint is strictly forbidden when in production mode
  if (env.mode === "production") {
    return NextResponse.json(
      { error: "PREVIEW_AUTH_FORBIDDEN", message: "Preview authentication is forbidden in production mode." },
      { status: 403 }
    );
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const email = body.email || MOCK_ADMIN_USER.email;
  const role = body.role || "master_admin";

  const sessionPayload = {
    id: MOCK_ADMIN_USER.id,
    name: MOCK_ADMIN_USER.name,
    email,
    role,
    avatarUrl: MOCK_ADMIN_USER.avatarUrl,
    createdAt: new Date().toISOString(),
  };

  const response = NextResponse.json({ success: true, user: sessionPayload });

  // Set HTTP-only session cookie for the browser
  response.cookies.set({
    name: PREVIEW_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(sessionPayload)),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}
