import { describe, it, expect, beforeEach } from "vitest";
import { renderTicketPassEmail } from "@/lib/email/templates";
import { ResendEmailAdapter, BrevoEmailAdapter, TestEmailAdapter } from "@/lib/email/adapters";
import { TicketPassPayload } from "@/lib/email/types";

describe("Email Engine: Templates and Validation", () => {
  const validPayload: TicketPassPayload = {
    registration_id: "REG-2026-10001-A1B2C3",
    qr_credential_id: "SKETCH-TKT-9DA76B0A6D06",
    event_title: "Design Systems Conference 2026",
    venue: "Main Auditorium, Hall B",
    start_date: "2026-11-15T09:00:00Z",
  };

  it("successfully renders ticket pass HTML and text for individual registration", () => {
    const rendered = renderTicketPassEmail(validPayload, "Alice Designer");

    expect(rendered.html).toContain("Design Systems Conference 2026");
    expect(rendered.html).toContain("REG-2026-10001-A1B2C3");
    expect(rendered.html).toContain("SKETCH-TKT-9DA76B0A6D06");
    expect(rendered.html).toContain("Alice Designer");
    expect(rendered.text).toContain("Registration ID: REG-2026-10001-A1B2C3");
  });

  it("successfully renders team badge when team_name is provided", () => {
    const teamPayload = { ...validPayload, team_name: "Pixel Pioneers" };
    const rendered = renderTicketPassEmail(teamPayload, "Captain Bob");

    expect(rendered.html).toContain("TEAM: Pixel Pioneers");
    expect(rendered.text).toContain("Team: Pixel Pioneers");
  });

  it("escapes malicious HTML characters in event title and names", () => {
    const xssPayload = {
      ...validPayload,
      event_title: "Hacked <script>alert('xss')</script> Event",
    };
    const rendered = renderTicketPassEmail(xssPayload, "Attacker <img src=x onerror=alert(1)>");

    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).not.toContain("<img src=x");
  });

  it("throws validation error when required fields are missing", () => {
    const invalidPayload = {
      registration_id: "REG-2026-10001",
      // missing qr_credential_id, event_title, etc.
    };

    expect(() => renderTicketPassEmail(invalidPayload, "Jane Doe")).toThrowError(
      /Invalid ticket pass payload/
    );
  });
});

describe("Email Engine: Provider Adapters", () => {
  let testAdapter: TestEmailAdapter;

  beforeEach(() => {
    testAdapter = new TestEmailAdapter();
  });

  it("TestEmailAdapter records dispatched emails in memory", async () => {
    const result = await testAdapter.sendEmail({
      to: "test@example.com",
      toName: "Test User",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      idempotencyKey: "key-123",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(testAdapter.sentMessages.length).toBe(1);
    expect(testAdapter.sentMessages[0].idempotencyKey).toBe("key-123");
    expect(testAdapter.sentMessages[0].to).toBe("test@example.com");
  });

  it("TestEmailAdapter correctly handles simulated failures", async () => {
    testAdapter.shouldFail = true;
    testAdapter.failureMessage = "Rate limit exceeded";
    testAdapter.failureRetryable = true;

    const result = await testAdapter.sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rate limit exceeded");
    expect(result.retryable).toBe(true);
  });

  it("ResendEmailAdapter rejects live dispatch if API key is placeholder or unconfigured", async () => {
    const resend = new ResendEmailAdapter("your-resend-api-key-here", "test@sketch.org");
    const result = await resend.sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("RESEND_API_KEY_UNCONFIGURED");
    expect(result.retryable).toBe(false);
  });

  it("BrevoEmailAdapter rejects live dispatch if API key is missing", async () => {
    const brevo = new BrevoEmailAdapter("", "test@sketch.org");
    const result = await brevo.sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("BREVO_API_KEY_UNCONFIGURED");
    expect(result.retryable).toBe(false);
  });
});
