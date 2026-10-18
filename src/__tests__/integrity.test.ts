import { describe, it, expect } from "vitest";

interface EventCapacityMock {
  id: string;
  capacity: number;
  registeredCount: number;
  lifecycle: "draft" | "published" | "live" | "completed" | "archived";
  registrationState: "upcoming" | "open" | "closed" | "full";
  activeRegistrations: Array<{ email: string }>;
}

/**
 * Pure simulation of the database stored procedure logic `register_for_event`
 * for testing invariant rules independent of live network connections.
 */
function simulateRegistration(
  event: EventCapacityMock,
  submission: { email: string; memberCount?: number }
): { success: boolean; error?: string } {
  const normalizedEmail = submission.email.toLowerCase().trim();
  const countToAdd = submission.memberCount || 1;

  if (event.lifecycle !== "published" && event.lifecycle !== "live") {
    return { success: false, error: "EVENT_NOT_ACTIVE" };
  }

  if (event.registrationState !== "open") {
    return { success: false, error: "REGISTRATION_CLOSED" };
  }

  if (event.registeredCount + countToAdd > event.capacity) {
    return { success: false, error: "CAPACITY_EXCEEDED" };
  }

  if (event.activeRegistrations.some((r) => r.email === normalizedEmail)) {
    return { success: false, error: "ALREADY_REGISTERED" };
  }

  // Mutate state atomically
  event.registeredCount += countToAdd;
  if (event.registeredCount >= event.capacity) {
    event.registrationState = "full";
  }
  event.activeRegistrations.push({ email: normalizedEmail });

  return { success: true };
}

describe("Data Integrity & Registration Invariants", () => {
  it("rejects registration when event is in draft status", () => {
    const event: EventCapacityMock = {
      id: "evt-draft",
      capacity: 50,
      registeredCount: 0,
      lifecycle: "draft",
      registrationState: "open",
      activeRegistrations: [],
    };

    const res = simulateRegistration(event, { email: "alex@example.com" });
    expect(res.success).toBe(false);
    expect(res.error).toBe("EVENT_NOT_ACTIVE");
    expect(event.registeredCount).toBe(0);
  });

  it("strictly enforces capacity limits and marks event state as full when filled", () => {
    const event: EventCapacityMock = {
      id: "evt-capped",
      capacity: 2,
      registeredCount: 1,
      lifecycle: "published",
      registrationState: "open",
      activeRegistrations: [{ email: "first@example.com" }],
    };

    // Submitting 2 members when 1 slot remains must fail
    const overCapacityRes = simulateRegistration(event, {
      email: "leader@example.com",
      memberCount: 2,
    });
    expect(overCapacityRes.success).toBe(false);
    expect(overCapacityRes.error).toBe("CAPACITY_EXCEEDED");
    expect(event.registeredCount).toBe(1);

    // Submitting 1 member fills capacity exactly
    const fillRes = simulateRegistration(event, { email: "second@example.com", memberCount: 1 });
    expect(fillRes.success).toBe(true);
    expect(event.registeredCount).toBe(2);
    expect(event.registrationState).toBe("full");

    // Any subsequent registration is rejected because registrationState is full
    const nextRes = simulateRegistration(event, { email: "third@example.com" });
    expect(nextRes.success).toBe(false);
    expect(nextRes.error).toBe("REGISTRATION_CLOSED");
  });

  it("prevents duplicate registration with the same normalized email address", () => {
    const event: EventCapacityMock = {
      id: "evt-dup",
      capacity: 100,
      registeredCount: 1,
      lifecycle: "published",
      registrationState: "open",
      activeRegistrations: [{ email: "student@sketch.org" }],
    };

    // Attempting registration with different casing and whitespace
    const dupRes = simulateRegistration(event, { email: "  STUDENT@SKETCH.ORG  " });
    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toBe("ALREADY_REGISTERED");
  });
});
