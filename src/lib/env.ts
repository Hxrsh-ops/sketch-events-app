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
 * Strips quotes, removes trailing subpaths (/rest/v1, /auth/v1), guarantees protocol,
 * and normalizes the Supabase project endpoint.
 */
export function sanitizeSupabaseUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl) return "";
  let url = rawUrl.trim();

  // Strip wrapping quotes
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }

  // Strip trailing slashes
  url = url.replace(/\/+$/, "");

  // Strip mistakenly appended REST/Auth subpaths (e.g. /rest/v1 or /auth/v1)
  url = url.replace(/\/(rest|auth)(\/v\d+)?\/?$/i, "");

  // Prepend protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      url = `http://${url}`;
    } else {
      url = `https://${url}`;
    }
  }

  // Remove trailing slashes again after protocol resolution
  url = url.replace(/\/+$/, "");

  // Validate standard URL format
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) {
      throw new Error("Protocol must be http or https");
    }
  } catch {
    throw new Error(
      `[SKETCH CONFIG ERROR] Invalid NEXT_PUBLIC_SUPABASE_URL "${rawUrl}". Must be a valid HTTP or HTTPS project root URL (e.g. "https://<project-ref>.supabase.co"). Do not append "/rest/v1" or trailing paths.`
    );
  }

  return url;
}

/**
 * Strips wrapping quotes and extraneous whitespace from keys.
 */
export function sanitizeSupabaseKey(rawKey: string | undefined | null): string {
  if (!rawKey) return "";
  let key = rawKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

/**
 * Decodes JWT payload without verifying signature (for safe configuration inspection).
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload =
      typeof atob === "function"
        ? atob(base64)
        : Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Validates and parses the application mode with strict fail-fast error checking.
 * Harmonizes APP_MODE and NEXT_PUBLIC_APP_MODE so client and server remain synchronized.
 */
function parseAppMode(): AppMode {
  const publicMode = process.env.NEXT_PUBLIC_APP_MODE?.trim();
  const serverMode = process.env.APP_MODE?.trim();

  if (publicMode && serverMode && publicMode !== serverMode) {
    console.warn(
      `[SKETCH CONFIG WARNING] Conflicting environment modes: APP_MODE="${serverMode}" vs NEXT_PUBLIC_APP_MODE="${publicMode}". Using NEXT_PUBLIC_APP_MODE="${publicMode}" to maintain client-server parity.`
    );
  }

  // Prioritize NEXT_PUBLIC_APP_MODE for client-server consistency
  const rawMode = publicMode || serverMode;

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
  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

  let supabaseUrl = rawSupabaseUrl ? sanitizeSupabaseUrl(rawSupabaseUrl) : undefined;
  let supabaseAnonKey = rawSupabaseAnonKey ? sanitizeSupabaseKey(rawSupabaseAnonKey) : undefined;

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

    // Inspect anon key to ensure service_role key was not mistakenly exposed to client
    if (supabaseAnonKey) {
      const payload = decodeJwtPayload(supabaseAnonKey);
      if (payload && payload.role === "service_role") {
        throw new Error(
          `[SKETCH SECURITY VIOLATION] NEXT_PUBLIC_SUPABASE_ANON_KEY contains a privileged service_role key. Service role keys must never be exposed publicly in browser bundles. Please configure the anon public key.`
        );
      }

      // Check for project reference mismatch between URL and Key
      if (payload && payload.ref && supabaseUrl) {
        const urlMatch = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
        if (urlMatch && urlMatch[1] && urlMatch[1] !== payload.ref) {
          console.warn(
            `[SKETCH CONFIG WARNING] NEXT_PUBLIC_SUPABASE_ANON_KEY belongs to project "${payload.ref}", but NEXT_PUBLIC_SUPABASE_URL points to "${urlMatch[1]}". This mismatch will cause "Invalid API key" errors.`
          );
        }
      }
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
