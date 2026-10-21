import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";

vi.mock("next/font/google", () => ({
  Manrope: () => ({ variable: "--font-manrope" }),
  Inter: () => ({ variable: "--font-inter" }),
}));

import { Sidebar } from "@/components/layout/sidebar";
import { AuthProvider } from "@/lib/auth/auth-context";
import RootLayout from "@/app/layout";
import { AdminRole, AdminUser } from "@/types";

describe("Root Layout & Sidebar Navigation Determinism (Hydration Regression Guard)", () => {
  const renderSidebarWithRole = (role: AdminRole | null) => {
    const user: AdminUser | null = role
      ? {
          id: "usr-test-1",
          name: "Test User",
          email: "test@sketch.test",
          role,
        }
      : null;

    return ReactDOMServer.renderToStaticMarkup(
      <AuthProvider initialUser={user}>
        <Sidebar eventCount={5} isPreview={false} />
      </AuthProvider>
    );
  };

  describe("Error A: Theme Initializer Placement & App Router Compliance", () => {
    it("renders the theme initializer inside <head> and NOT inside <body>", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <RootLayout>
          <div data-testid="test-content">Content</div>
        </RootLayout>
      );

      // Verify <head> contains the theme initializer script
      expect(html).toContain('<head><script id="sketch-theme-initializer"');
      expect(html).toContain("sketch-theme");
      expect(html).toContain("document.documentElement.classList.add('dark')");

      // Verify <body> does NOT contain any <script> tag
      const bodyStartIndex = html.indexOf("<body");
      expect(bodyStartIndex).toBeGreaterThan(-1);
      const bodyContent = html.substring(bodyStartIndex);
      expect(bodyContent).not.toContain("<script");
    });
  });

  describe("Error B: Sidebar Navigation Determinism & RBAC Alignment", () => {
    it("renders Ticket Studio as the first item under Delivery & Credentials for master_admin on SSR", () => {
      const html = renderSidebarWithRole("master_admin");

      expect(html).toContain('href="/studio"');
      expect(html).toContain('href="/certificates"');
      expect(html).toContain('href="/communications"');

      // Verify exact order: /studio must appear before /certificates, which must appear before /communications
      const studioIdx = html.indexOf('href="/studio"');
      const certsIdx = html.indexOf('href="/certificates"');
      const commsIdx = html.indexOf('href="/communications"');

      expect(studioIdx).toBeGreaterThan(-1);
      expect(certsIdx).toBeGreaterThan(studioIdx);
      expect(commsIdx).toBeGreaterThan(certsIdx);
    });

    it("renders Ticket Studio for event_manager who has events:edit permission", () => {
      const html = renderSidebarWithRole("event_manager");

      expect(html).toContain('href="/studio"');
      expect(html).toContain('href="/certificates"');
      expect(html).toContain('href="/communications"');
    });

    it("strictly excludes Ticket Studio and Certificates for attendance_staff (RBAC enforcement)", () => {
      const html = renderSidebarWithRole("attendance_staff");

      // attendance_staff only has events:view, registrations:view, attendance:*
      expect(html).not.toContain('href="/studio"');
      expect(html).not.toContain('href="/certificates"');
      expect(html).not.toContain('href="/communications"');

      // But should have Attendance
      expect(html).toContain('href="/attendance"');
    });

    it("strictly excludes Ticket Studio and Certificates for analyst", () => {
      const html = renderSidebarWithRole("analyst");

      expect(html).not.toContain('href="/studio"');
      expect(html).not.toContain('href="/certificates"');
      expect(html).not.toContain('href="/communications"');

      // Analyst has analytics and exports
      expect(html).toContain('href="/analytics"');
      expect(html).toContain('href="/exports"');
    });
  });
});
