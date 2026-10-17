/**
 * SKETCH Application Client-Safe Environment Guard
 *
 * Exposes ONLY non-sensitive public configuration:
 * - Application mode ('preview' or 'production')
 * - Public Supabase endpoint and anonymous public key
 * - Application base URL
 *
 * Backend secrets (e.g. service role keys, email provider keys) are
 * STRICTLY forbidden from this file. For privileged backend configuration,
 * import from `@/lib/env.server`.
 */

export type AppMode = "preview" | "production";

export interface AppEnv {
  mode: AppMode;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  appUrl: string;
}

let cachedEnv: AppEnv | null = null;

/**
 * Validates and parses the application mode with strict fail-fast error checking.
 */
function parseAppMode(): AppMode {
  const rawMode = process.env.APP_MODE || process.env.NEXT_PUBLIC_APP_MODE;

  if (!rawMode) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? "production" : "preview";
  }

  if (rawMode !== "preview" && rawMode !== "production") {
    throw new Error(
      `[SKETCH CONFIG ERROR] Invalid APP_MODE "${rawMode}". Allowed values are "preview" or "production".`
    );
  }

  return rawMode;
}

/**
 * Retrieves the client-safe environment configuration.
 * Safe to import in Server Components, Client Components, and Route Handlers.
 */
export function getAppEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const appMode = parseAppMode();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Production Safety Verification for public variables
  if (appMode === "production") {
    const missing: string[] = [];
    if (!supabaseUrl || supabaseUrl.includes("your-project.supabase.co")) {
      missing.push("NEXT_PUBLIC_SUPABASE_URL");
    }
    if (!supabaseAnonKey || supabaseAnonKey === "your-anon-key-here") {
      missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    if (missing.length > 0) {
      throw new Error(
        `[SKETCH SECURITY VIOLATION] Application is configured in PRODUCTION mode but is missing required variables: ${missing.join(", ")}. Mock fallback is disallowed in production.`
      );
    }
  }

  cachedEnv = {
    mode: appMode,
    supabaseUrl,
    supabaseAnonKey,
    appUrl,
  };

  return cachedEnv;
}

/**
 * Resets the client environment cache (for tests)
 */
export function resetAppEnvCache(): void {
  cachedEnv = null;
}

/**
 * Safe client-side check to determine if the application is running in preview mode
 */
export function isPreviewMode(): boolean {
  try {
    const env = getAppEnv();
    return env.mode === "preview";
  } catch {
    return false;
  }
}
