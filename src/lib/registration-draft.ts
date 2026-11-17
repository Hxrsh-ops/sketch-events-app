/**
 * Registration Form Draft Persistence using browser localStorage.
 *
 * Saves entered form details per event as the user fills out the form.
 * Restores them safely upon page reload/reopen without storing sensitive data.
 * Safely handles expired, corrupted, or invalid localStorage payloads.
 */

const DRAFT_PREFIX = "sketch_reg_draft_";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days retention

export interface RegistrationDraftData {
  version: 1;
  eventId: string;
  slug?: string;
  formValues: Record<string, unknown>;
  savedAt: number;
}

/**
 * Filter out sensitive fields before saving to localStorage
 */
const SENSITIVE_KEY_PATTERNS = [
  "password",
  "token",
  "secret",
  "auth",
  "credential",
  "card",
  "cvv",
  "otp",
  "pin",
];

function sanitizeFormValues(values: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(values)) {
    if (val === undefined || val === null) continue;
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEY_PATTERNS.some((pattern) => lowerKey.includes(pattern))) {
      continue;
    }
    clean[key] = val;
  }
  return clean;
}

// Memory fallback storage for non-browser / test environments
export const memoryDraftStore = new Map<string, string>();

/**
 * Checks if browser or global localStorage is accessible
 */
function getStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return {
    getItem: (key: string) => memoryDraftStore.get(key) || null,
    setItem: (key: string, value: string) => memoryDraftStore.set(key, value),
    removeItem: (key: string) => {
      memoryDraftStore.delete(key);
    },
  };
}

/**
 * Saves entered registration form values to localStorage
 */
export function saveRegistrationDraft(
  eventId: string,
  formValues: Record<string, unknown>,
  slug?: string
): void {
  if (!eventId) return;

  try {
    const storage = getStorage();
    const cleanValues = sanitizeFormValues(formValues);

    // Only save if there is at least one non-empty value
    const hasMeaningfulValues = Object.values(cleanValues).some(
      (v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
    );

    if (!hasMeaningfulValues) {
      clearRegistrationDraft(eventId, slug);
      return;
    }

    const draft: RegistrationDraftData = {
      version: 1,
      eventId,
      slug,
      formValues: cleanValues,
      savedAt: Date.now(),
    };

    const serialized = JSON.stringify(draft);
    storage.setItem(`${DRAFT_PREFIX}${eventId}`, serialized);
    if (slug && slug !== eventId) {
      storage.setItem(`${DRAFT_PREFIX}${slug}`, serialized);
    }
  } catch (err) {
    console.warn("[saveRegistrationDraft] Could not save draft to localStorage:", err);
  }
}

/**
 * Retrieves a saved registration draft from localStorage for a given event ID or slug.
 * Safely removes corrupted or expired drafts.
 */
export function getRegistrationDraft(
  eventIdOrSlug: string
): Record<string, unknown> | null {
  if (!eventIdOrSlug) return null;

  try {
    const storage = getStorage();
    const raw = storage.getItem(`${DRAFT_PREFIX}${eventIdOrSlug}`);
    if (!raw) return null;

    let data: RegistrationDraftData;
    try {
      data = JSON.parse(raw);
    } catch {
      // Corrupted JSON - clean up and discard
      clearRegistrationDraft(eventIdOrSlug);
      return null;
    }

    // Schema version check and type validation
    if (
      !data ||
      data.version !== 1 ||
      !data.formValues ||
      typeof data.formValues !== "object" ||
      Array.isArray(data.formValues)
    ) {
      clearRegistrationDraft(eventIdOrSlug);
      return null;
    }

    // Expiration check (7 days)
    if (typeof data.savedAt === "number" && Date.now() - data.savedAt > DRAFT_MAX_AGE_MS) {
      clearRegistrationDraft(eventIdOrSlug);
      return null;
    }

    return sanitizeFormValues(data.formValues);
  } catch (err) {
    console.warn("[getRegistrationDraft] Error reading draft, discarding:", err);
    clearRegistrationDraft(eventIdOrSlug);
    return null;
  }
}

/**
 * Clears the saved registration draft for an event (e.g. upon successful registration
 * or explicit start-fresh action).
 */
export function clearRegistrationDraft(eventId: string, slug?: string): void {
  if (!eventId) return;

  try {
    const storage = getStorage();
    storage.removeItem(`${DRAFT_PREFIX}${eventId}`);
    if (slug && slug !== eventId) {
      storage.removeItem(`${DRAFT_PREFIX}${slug}`);
    }
  } catch {
    // Ignore storage clear errors
  }
}
