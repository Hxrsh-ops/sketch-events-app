import { NextResponse } from "next/server";

/**
 * POST /api/auth/preview-login
 *
 * Security boundary: Temporary development login and preview auth bypass
 * have been permanently removed. All administrative logins must proceed
 * through legitimate Supabase Auth or Google OAuth.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "AUTH_BYPASS_DISABLED",
      message:
        "Temporary development authentication and bypass have been permanently disabled. Please authenticate using registered Supabase administrator credentials or Google OAuth.",
    },
    { status: 403 }
  );
}
