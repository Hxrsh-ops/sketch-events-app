import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/cron/process-outbox/route";
import { resetServerEnvCache } from "@/lib/env.server";
import { resetAppEnvCache } from "@/lib/env";
import { EmailOutboxWorker } from "@/lib/email/worker";

const mockConstructor = vi.fn();
const mockRecoverStuckJobs = vi.fn();
const mockProcessBatch = vi.fn();

vi.mock("@/lib/email/worker", () => {
  return {
    EmailOutboxWorker: class MockEmailOutboxWorker {
      constructor(...args: any[]) {
        mockConstructor(...args);
      }
      recoverStuckJobs = mockRecoverStuckJobs;
      processBatch = mockProcessBatch;
    },
  };
});

describe("Slice 4.1: Secure Outbox Worker Invocation & Cron Endpoint", () => {
  const originalEnv = { ...process.env };
  const validSecret = "test-cron-secret-secure-token-12345";

  beforeEach(() => {
    resetAppEnvCache();
    resetServerEnvCache();
    process.env = { ...originalEnv };
    vi.clearAllMocks();

    mockRecoverStuckJobs.mockResolvedValue(0);
    mockProcessBatch.mockResolvedValue({
      claimed: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      terminalFailures: 0,
    });
  });

  describe("1. HTTP Method Restrictions", () => {
    it("rejects GET requests with 405 Method Not Allowed and Allow: POST header", async () => {
      const response = await GET();
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("METHOD_NOT_ALLOWED");
      expect(mockConstructor).not.toHaveBeenCalled();
    });
  });

  describe("2. Authentication & Authorization Guards", () => {
    it("returns 503 when CRON_SECRET is not configured on the server", async () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validSecret}`,
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(503);
      const json = await response.json();
      expect(json.error).toBe("CRON_NOT_CONFIGURED");
      expect(mockConstructor).not.toHaveBeenCalled();
    });

    it("returns 503 when CRON_SECRET is set to the default example placeholder", async () => {
      process.env.CRON_SECRET = "your-cron-secret-here";

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
        headers: {
          Authorization: "Bearer your-cron-secret-here",
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(503);
      const json = await response.json();
      expect(json.error).toBe("CRON_NOT_CONFIGURED");
      expect(mockConstructor).not.toHaveBeenCalled();
    });

    it("returns 401 Unauthorized when credentials are completely missing", async () => {
      process.env.CRON_SECRET = validSecret;

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("UNAUTHORIZED");
      expect(mockConstructor).not.toHaveBeenCalled();
    });

    it("returns 403 Forbidden when an incorrect secret token is provided", async () => {
      process.env.CRON_SECRET = validSecret;

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid-wrong-secret-token",
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toBe("FORBIDDEN");
      expect(mockConstructor).not.toHaveBeenCalled();
    });

    it("returns 403 Forbidden when secret length does not match expected length (side-channel protection)", async () => {
      process.env.CRON_SECRET = validSecret;

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
        headers: {
          Authorization: "Bearer short",
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toBe("FORBIDDEN");
      expect(mockConstructor).not.toHaveBeenCalled();
    });
  });

  describe("3. Authorized Worker Execution & Sequence Order", () => {
    it("successfully authenticates via Authorization: Bearer <secret>", async () => {
      process.env.CRON_SECRET = validSecret;

      mockRecoverStuckJobs.mockResolvedValueOnce(2);
      mockProcessBatch.mockResolvedValueOnce({
        claimed: 3,
        processed: 3,
        succeeded: 3,
        failed: 0,
        terminalFailures: 0,
      });

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validSecret}`,
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.recovered).toBe(2);
      expect(json.claimed).toBe(3);
      expect(json.processed).toBe(3);
      expect(json.succeeded).toBe(3);
      expect(json.failed).toBe(0);
      expect(json.terminalFailures).toBe(0);
      expect(json.timestamp).toBeDefined();

      // Verify execution order: stuck job recovery before batch claiming
      expect(mockRecoverStuckJobs).toHaveBeenCalledWith(10);
      expect(mockProcessBatch).toHaveBeenCalledWith(10);
      expect(mockRecoverStuckJobs.mock.invocationCallOrder[0]).toBeLessThan(
        mockProcessBatch.mock.invocationCallOrder[0]
      );
    });

    it("successfully authenticates via custom x-cron-secret header", async () => {
      process.env.CRON_SECRET = validSecret;

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
        headers: {
          "x-cron-secret": validSecret,
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(mockConstructor).toHaveBeenCalled();
    });
  });

  describe("4. Bounded Batch Sizing", () => {
    it("parses and applies custom batch_size query parameter", async () => {
      process.env.CRON_SECRET = validSecret;

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox?batch_size=25", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validSecret}`,
        },
      });

      await POST(req);
      expect(mockProcessBatch).toHaveBeenCalledWith(25);
    });

    it("clamps batch sizes exceeding maximum (50) down to 50", async () => {
      process.env.CRON_SECRET = validSecret;

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox?batch_size=250", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validSecret}`,
        },
      });

      await POST(req);
      expect(mockProcessBatch).toHaveBeenCalledWith(50);
    });

    it("falls back to default (10) when batch_size is invalid or negative", async () => {
      process.env.CRON_SECRET = validSecret;

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox?batch_size=-5", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validSecret}`,
        },
      });

      await POST(req);
      expect(mockProcessBatch).toHaveBeenCalledWith(10);
    });
  });

  describe("5. Confidentiality & Failure Resilience", () => {
    it("never includes secrets, recipient emails, or PII in response body", async () => {
      process.env.CRON_SECRET = validSecret;

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validSecret}`,
        },
      });

      const response = await POST(req);
      const rawText = await response.text();

      expect(rawText).not.toContain(validSecret);
      expect(rawText).not.toContain("@");
      expect(rawText).not.toContain("password");
    });

    it("safely handles unexpected worker exceptions with HTTP 500 without leaking stack traces", async () => {
      process.env.CRON_SECRET = validSecret;

      mockProcessBatch.mockRejectedValueOnce(new Error("Supabase RPC connection timed out"));

      const req = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validSecret}`,
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("WORKER_EXECUTION_FAILED");
      expect(json.message).toBe("An internal server error occurred during outbox processing.");
      expect(JSON.stringify(json)).not.toContain("Supabase RPC connection timed out");
    });
  });
});
