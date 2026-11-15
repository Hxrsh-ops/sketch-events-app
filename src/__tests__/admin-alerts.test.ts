import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  dispatchAdminAlert,
  resetAdminAlertCooldowns,
  ADMIN_ALERT_RECIPIENTS,
} from "@/lib/alerts/admin-alerts";
import { EmailProviderAdapter, SendEmailOptions, SendEmailResult } from "@/lib/email/types";

class MockTestEmailAdapter implements EmailProviderAdapter {
  name = "mock";
  public calls: SendEmailOptions[] = [];
  public shouldFail = false;

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    this.calls.push(options);
    if (this.shouldFail) {
      return { success: false, error: "Mock send failed", retryable: false };
    }
    return { success: true, messageId: `msg-${Date.now()}` };
  }
}

describe("Admin Incident Alert System", () => {
  let mockAdapter: MockTestEmailAdapter;

  beforeEach(() => {
    mockAdapter = new MockTestEmailAdapter();
    resetAdminAlertCooldowns();
    vi.clearAllMocks();
  });

  it("successfully dispatches alert to all configured admin recipients", async () => {
    const result = await dispatchAdminAlert(
      {
        category: "EVENT_CAPACITY_FULL",
        title: "Hackathon Registration Full",
        details: "The event has reached its maximum quota of 150 participants.",
        severity: "warning",
        metadata: { eventId: "evt-123", capacity: 150 },
      },
      mockAdapter
    );

    expect(result.sent).toBe(true);
    expect(mockAdapter.calls).toHaveLength(ADMIN_ALERT_RECIPIENTS.length);

    const recipients = mockAdapter.calls.map((c) => c.to);
    expect(recipients).toContain("kmharshanth6@gmail.com");
    expect(recipients).toContain("d.mirudull@gmail.com");

    const firstCall = mockAdapter.calls[0];
    expect(firstCall.subject).toContain("[SKETCH WARNING] Hackathon Registration Full");
    expect(firstCall.html).toContain("Hackathon Registration Full");
    expect(firstCall.html).toContain("The event has reached its maximum quota");
    expect(firstCall.html).toContain("evt-123");
    expect(firstCall.text).toContain("SKETCH OPS INCIDENT ALERT");
  });

  it("enforces cooldown debouncing to suppress duplicate alerts within window", async () => {
    const alertData = {
      category: "EMAIL_PROVIDER_LIMIT" as const,
      title: "Brevo Daily Quota Limit Warning",
      details: "HTTP 402 Payment Required returned by email provider.",
      severity: "critical" as const,
      dedupKey: "BREVO_QUOTA",
      cooldownMinutes: 10,
    };

    const firstDispatch = await dispatchAdminAlert(alertData, mockAdapter);
    expect(firstDispatch.sent).toBe(true);
    expect(mockAdapter.calls).toHaveLength(ADMIN_ALERT_RECIPIENTS.length);

    // Second immediate dispatch with same dedupKey should be suppressed
    const secondDispatch = await dispatchAdminAlert(alertData, mockAdapter);
    expect(secondDispatch.sent).toBe(false);
    expect(secondDispatch.reason).toBe("COOLDOWN_ACTIVE");
    // No extra emails sent
    expect(mockAdapter.calls).toHaveLength(ADMIN_ALERT_RECIPIENTS.length);
  });

  it("handles email provider failures gracefully without crashing", async () => {
    mockAdapter.shouldFail = true;

    const result = await dispatchAdminAlert(
      {
        category: "REGISTRATION_SYSTEM_ERROR",
        title: "Database Lock Timeout",
        details: "Registration transaction timed out during concurrent lock.",
        severity: "critical",
      },
      mockAdapter
    );

    expect(result.sent).toBe(false);
    expect(result.reason).toBe("ALL_DELIVERIES_FAILED");
  });
});
