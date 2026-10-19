/**
 * Pure error mapping helper for URL authentication errors returned from
 * OAuth callbacks, Supabase Auth exchanges, and route layout guards.
 */
export function getAuthErrorMessage(
  code: string | null | undefined,
  details?: string | null
): string | null {
  if (!code) {
    return null;
  }

  const cleanCode = code.trim().toLowerCase();

  switch (cleanCode) {
    case "not_an_admin":
      return "Access Denied: Your account authenticated with Google, but does not possess an administrator profile in SketchHUB. Please contact the Operations Director.";

    case "oauth_provider_error":
      return details
        ? `Authentication canceled or failed by provider: ${details}`
        : "Google authentication was canceled or encountered a provider error.";

    case "missing_auth_code":
      return "Authentication error: Missing verification code in authorization callback.";

    case "auth_exchange_failed":
      return details
        ? `Failed to verify authorization token: ${details}`
        : "Failed to exchange authorization token with Supabase Auth.";

    case "preview_oauth_unsupported":
      return "Remote Supabase environment is not configured. Real Google OAuth requires NEXT_PUBLIC_SUPABASE_URL and configured OAuth credentials.";

    case "auth_client_unavailable":
      return "Authentication service is currently unavailable. Please check Supabase environment configuration.";

    default:
      return details
        ? `Authentication error: ${details}`
        : "An unexpected authentication error occurred. Please try again or contact your administrator.";
  }
}
