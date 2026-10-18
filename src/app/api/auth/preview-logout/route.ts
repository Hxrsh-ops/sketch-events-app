import { NextResponse } from "next/server";
import { PREVIEW_SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });

  // Clear preview session cookie explicitly
  response.cookies.set({
    name: PREVIEW_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
