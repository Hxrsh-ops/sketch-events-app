/**
 * Pure redirect sanitization helper to protect against open-redirect vulnerabilities.
 *
 * Rules:
 * - Must be a relative path starting with a single '/'
 * - Must NOT start with '//' (scheme-relative / protocol-relative URL)
 * - Must NOT start with '/\' or contain '\' (browser backslash-bypass tricks)
 * - Must NOT contain CRLF or control characters
 * - Valid internal paths with search queries and hashes are preserved (e.g. "/events?filter=active#list")
 */
export function sanitizeInternalRedirect(
  dest: string | null | undefined,
  fallback: string = "/"
): string {
  if (!dest || typeof dest !== "string") {
    return fallback;
  }

  const trimmed = dest.trim();

  // Fast rejection of non-slash, protocol-relative, backslash, or control-character bypasses
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\") ||
    /[\r\n\t\x00-\x1F]/.test(trimmed)
  ) {
    return fallback;
  }

  try {
    // Parse relative to a trusted dummy origin
    const parsed = new URL(trimmed, "http://localhost");

    // Origin must remain strictly localhost
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }

    // Pathname must start with '/' and not '//'
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
