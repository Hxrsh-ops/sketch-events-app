import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import AttendanceClient from "@/app/(admin)/attendance/attendance-client";
import CommunicationsClient from "@/app/(admin)/communications/communications-client";
import SettingsPage from "@/app/(admin)/settings/page";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthProvider } from "@/lib/auth/auth-context";
import { resetAppEnvCache } from "@/lib/env";
import { EventItem, Participant } from "@/types";

describe("Runtime Crash Fixes & Settings Truthfulness", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
  });
  describe("Bug 1 — Attendance Client Runtime Safety", () => {
    it("renders cleanly without throwing when initialEvents is empty", () => {
      expect(() => {
        const html = ReactDOMServer.renderToStaticMarkup(
          <AttendanceClient
            initialEvents={[]}
            initialParticipants={[]}
            initialError={null}
            isPreview={false}
          />
        );
        expect(html).toContain("Live Attendance Desk");
        expect(html).toContain("No Active Events Found");
        expect(html).toContain("No event selected");
      }).not.toThrow();
    });

    it("renders transparent database connection error without crashing or inventing events", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <AttendanceClient
          initialEvents={[]}
          initialParticipants={[]}
          initialError="Supabase connection pool exhausted"
          isPreview={false}
        />
      );

      expect(html).toContain("Database Connection Error");
      expect(html).toContain("Supabase connection pool exhausted");
      expect(html).toContain("Notice: Mock attendance data is strictly not substituted");
      expect(html).toContain("No event selected");
    });

    it("renders the selected event title when a valid event exists", () => {
      const mockEvent: EventItem = {
        id: "evt-prod-101",
        title: "National Design Summit 2026",
        slug: "national-design-summit-2026",
        shortDescription: "National summit for designers",
        description: "Full description of summit",
        posterUrl: "/images/poster.jpg",
        category: "Conference",
        lifecycle: "live",
        registrationState: "open",
        startDate: "2026-11-15T09:00:00Z",
        endDate: "2026-11-15T18:00:00Z",
        venue: "Convention Center",
        venueMode: "in-person",
        capacity: 500,
        registeredCount: 340,
        checkedInCount: 120,
        hasTeams: false,
        hasRounds: false,
      };

      const html = ReactDOMServer.renderToStaticMarkup(
        <AttendanceClient
          initialEvents={[mockEvent]}
          initialParticipants={[]}
          isPreview={false}
        />
      );

      expect(html).toContain("National Design Summit 2026");
      expect(html).not.toContain("No Active Events Found");
    });
  });

  describe("Bug 2 — Communications Client Runtime Safety", () => {
    it("renders cleanly without throwing when initialEvents is empty", () => {
      expect(() => {
        const html = ReactDOMServer.renderToStaticMarkup(
          <CommunicationsClient
            initialJobs={[]}
            initialEvents={[]}
            initialParticipants={[]}
            initialError={null}
            isPreview={false}
          />
        );
        expect(html).toContain("Communications &amp; Outbox");
        expect(html).toContain("No Active Events Available");
      }).not.toThrow();
    });

    it("renders transparent database error in communications without crashing", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <CommunicationsClient
          initialJobs={[]}
          initialEvents={[]}
          initialParticipants={[]}
          initialError="Failed to connect to communications outbox"
          isPreview={false}
        />
      );

      expect(html).toContain("Database Connection Error");
      expect(html).toContain("Failed to connect to communications outbox");
    });

    it("safely handles compose form without crashing when no event is selected", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <CommunicationsClient
          initialJobs={[]}
          initialEvents={[]}
          initialParticipants={[]}
          initialComposeOpen={true}
          isPreview={false}
        />
      );

      expect(html).toContain("Estimated Recipient Count:");
      expect(html).toContain("No event selected (0 attendees)");
      // Dispatches button should be disabled when no valid event/recipients exist
      expect(html).toContain("disabled=\"\"");
    });

    it("renders actual recipient count when valid event and participants exist", () => {
      const testEvent: EventItem = {
        id: "evt-comm-01",
        title: "Keynote Symposium",
        slug: "keynote-symposium",
        shortDescription: "Keynote symposium event",
        description: "Full description of keynote symposium",
        posterUrl: "/images/keynote.jpg",
        category: "Conference",
        lifecycle: "published",
        registrationState: "open",
        startDate: "2026-12-01T10:00:00Z",
        endDate: "2026-12-01T12:00:00Z",
        venue: "Hall A",
        venueMode: "in-person",
        capacity: 100,
        registeredCount: 2,
        checkedInCount: 1,
        hasTeams: false,
        hasRounds: false,
      };

      const testParticipants: Participant[] = [
        {
          id: "part-1",
          registrationId: "REG-001",
          eventId: "evt-comm-01",
          eventTitle: "Keynote Symposium",
          name: "Alice Designer",
          email: "alice@example.com",
          status: "registered",
          attendanceStatus: "checked_in",
          qrCredentialId: "QR-001",
          registeredAt: "2026-10-18T00:00:00Z",
        },
      ];

      const html = ReactDOMServer.renderToStaticMarkup(
        <CommunicationsClient
          initialJobs={[]}
          initialEvents={[testEvent]}
          initialParticipants={testParticipants}
          initialComposeOpen={true}
          isPreview={false}
        />
      );

      expect(html).toContain("Estimated Recipient Count:");
      expect(html).toContain("1 attendees");
    });
  });

  describe("Settings Screen Truthfulness", () => {
    it("renders truthful production database and email provider labels in production mode", () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fvnkhzlbvxemwlkmwhbz.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token";
      process.env.EMAIL_PROVIDER = "resend";

      const html = ReactDOMServer.renderToStaticMarkup(
        <ThemeProvider>
          <AuthProvider
            initialUser={{
              id: "adm-test",
              name: "Harshanth Lead",
              email: "harshanth@sketchhub.com",
              role: "master_admin",
            }}
          >
            <SettingsPage />
          </AuthProvider>
        </ThemeProvider>
      );

      // Must not display hardcoded mock labels
      expect(html).not.toContain("Client Preview Runtime (Isolated Mock State)");
      expect(html).not.toContain("Mock Adapter");
      // Must truthfully reflect production runtime and Resend verified status
      expect(html).toContain("PostgreSQL Production (Live Supabase Client)");
      expect(html).toContain("Configured &amp; Live Verified");
      expect(html).toContain("Active persistent database connection");
      expect(html).toContain("Harshanth Lead");

    });
  });
});
