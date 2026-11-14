/**
 * Shared Certificate Template Store & Configuration Persistence
 *
 * Ensures design configuration parity across Certificate Studio preview,
 * individual participant issuance, batch issuance, and downloaded SVG vectors.
 */

import {
  CertificateDesignData,
  DEFAULT_CERTIFICATE_DESIGN,
} from "@/types/certificate-template";

export const CERTIFICATE_TEMPLATE_STORAGE_KEY = "sketch_certificate_template_active";
export const CERTIFICATE_TEMPLATE_EVENT = "sketch_certificate_template_updated";

/**
 * Retrieve the active certificate design configuration.
 * Loads from localStorage when available on the client, or returns the default design.
 */
export function getActiveCertificateDesign(): CertificateDesignData {
  if (typeof window === "undefined") {
    return DEFAULT_CERTIFICATE_DESIGN;
  }

  try {
    const raw = localStorage.getItem(CERTIFICATE_TEMPLATE_STORAGE_KEY);
    if (!raw) return DEFAULT_CERTIFICATE_DESIGN;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.elements) && parsed.elements.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn("[certificate-store] Failed to read certificate template from storage:", err);
  }

  return DEFAULT_CERTIFICATE_DESIGN;
}

/**
 * Save the active certificate design configuration.
 * Persists to browser localStorage and broadcasts a synchronization event to all listeners.
 */
export function saveActiveCertificateDesign(design: CertificateDesignData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CERTIFICATE_TEMPLATE_STORAGE_KEY, JSON.stringify(design));
    window.dispatchEvent(
      new CustomEvent(CERTIFICATE_TEMPLATE_EVENT, { detail: design })
    );
  } catch (err) {
    console.error("[certificate-store] Failed to persist certificate template:", err);
  }
}

/**
 * Subscribe to active certificate design updates across the application.
 */
export function subscribeToActiveCertificateDesign(
  callback: (design: CertificateDesignData) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = (e: Event) => {
    const customEvent = e as CustomEvent<CertificateDesignData>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(getActiveCertificateDesign());
    }
  };

  window.addEventListener(CERTIFICATE_TEMPLATE_EVENT, handleUpdate);
  window.addEventListener("storage", (e) => {
    if (e.key === CERTIFICATE_TEMPLATE_STORAGE_KEY) {
      callback(getActiveCertificateDesign());
    }
  });

  return () => {
    window.removeEventListener(CERTIFICATE_TEMPLATE_EVENT, handleUpdate);
  };
}
