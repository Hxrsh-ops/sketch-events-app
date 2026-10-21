import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { Sidebar } from "@/components/layout/sidebar";
import { AuthProvider } from "@/lib/auth/auth-context";
import { resetAppEnvCache } from "@/lib/env";
import { SketchRepository } from "@/lib/supabase/repository";
import { GET as getEventCountRoute } from "@/app/api/events/count/route";

describe("Priority 1 — Events Sidebar Badge Integrity", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
  });

  const renderWithAuth = (ui: React.ReactElement) => {
    return ReactDOMServer.renderToStaticMarkup(
      <AuthProvider
        initialUser={{
          id: "usr-admin-1",
          name: "Test Admin",
          email: "admin@sketch.test",
          role: "master_admin",
        }}
      >
        {ui}
      </AuthProvider>
    );
  };

  it("displays '0' and NEVER '24' when the database contains zero events", () => {
    const html = renderWithAuth(
      <Sidebar eventCount={0} isPreview={false} />
    );

    // Assert that the badge exists and renders exactly "0"
    expect(html).toContain('data-testid="sidebar-badge-events"');
    expect(html).toContain(">0<");

    // Strictly assert that the hardcoded "24" does not appear as a badge
    expect(html).not.toMatch(/data-testid="sidebar-badge-events"[^>]*>24</);
    expect(html).not.toContain(">24<");
  });

  it("displays real event count when events exist in live mode", () => {
    const html = renderWithAuth(
      <Sidebar eventCount={7} isPreview={false} />
    );

    expect(html).toContain('data-testid="sidebar-badge-events"');
    expect(html).toContain(">7<");
    expect(html).not.toContain(">24<");
  });

  it("omits the badge cleanly when event count is null (error/unavailable state)", () => {
    const html = renderWithAuth(
      <Sidebar eventCount={null} isPreview={false} />
    );

    // When count cannot be fetched, no fabricated badge or 24 must appear
    expect(html).not.toContain('data-testid="sidebar-badge-events"');
    expect(html).not.toContain(">24<");
  });

  it("identifies preview event counts explicitly in preview mode", () => {
    const html = renderWithAuth(
      <Sidebar eventCount={3} isPreview={true} />
    );

    expect(html).toContain('data-testid="sidebar-badge-events"');
    expect(html).toContain('title="Preview event count"');
    expect(html).toContain(">3<");
  });

  it("SketchRepository.getEventCount returns a non-negative integer", async () => {
    const count = await SketchRepository.getEventCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("/api/events/count route handler returns authoritative count response", async () => {
    const response = await getEventCountRoute();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(typeof data.count).toBe("number");
    expect(typeof data.isPreview).toBe("boolean");
  });
});
