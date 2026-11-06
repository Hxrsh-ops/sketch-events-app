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

    case "backend_unavailable":
    case "service_unavailable":
    case "project_paused":
    case "network_error":
      return details
        ? `Backend Service Unavailable: ${details}. The Supabase project may be paused, undergoing maintenance, or unreachable.`
        : "Backend Service Unavailable: The Supabase project is currently paused or unreachable. Please verify project status in the Supabase Dashboard.";

    case "oauth_provider_error":
      return details
        ? `Authentication canceled or failed by provider: ${details}`
        : "Google authentication was canceled or encountered a provider error.";

    case "access_denied":
      return details
        ? `Access Denied: ${details}`
        : "Google authentication was canceled or access was denied.";

    case "missing_auth_code":
      return "Authentication error: Missing verification code in authorization callback.";

    case "auth_exchange_failed":
      if (details?.toLowerCase().includes("invalid api key")) {
        return "Failed to verify authorization token: Invalid API key. The configured NEXT_PUBLIC_SUPABASE_ANON_KEY was rejected by the Supabase project gateway. Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local belong to the same project (Project Settings > API in Supabase Dashboard).";
      }
      if (
        details?.toLowerCase().includes("fetch failed") ||
        details?.toLowerCase().includes("network") ||
        details?.toLowerCase().includes("enotfound") ||
        details?.toLowerCase().includes("503") ||
        details?.toLowerCase().includes("paused")
      ) {
        return "Backend Connection Failure: Unable to exchange authorization token with Supabase Auth. The Supabase project may be paused or unreachable.";
      }
      return details
        ? `Failed to verify authorization token: ${details}`
        : "Failed to exchange authorization token with Supabase Auth.";

    case "expired_session":
    case "session_expired":
      return "Your authentication session has expired. Please sign in again.";

    case "invalid_callback":
    case "invalid_oauth_callback":
      return details
        ? `Invalid authentication callback: ${details}`
        : "The authentication callback was invalid or expired. Please sign in again.";

    case "server_error":
    case "temporarily_unavailable":
      return details
        ? `Authentication server error: ${details}`
        : "The authentication server is temporarily unavailable. Please try again or verify Supabase project health.";

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
