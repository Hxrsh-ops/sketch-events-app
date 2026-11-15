import { notFound } from "next/navigation";

/**
 * Stealth Gate: /login is decommissioned.
 * Any request to /login returns a standard 404 Not Found.
 * Authorized campus organizers access the administrative portal via the secret gateway /ops/gateway.
 */
export default function LoginPage() {
  notFound();
}
