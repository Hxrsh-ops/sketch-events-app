import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { DashboardKpiRow } from "@/components/dashboard/kpi-cards";
import { OrganizerActivity } from "@/components/dashboard/organizer-activity";
import { EventProgressGauge } from "@/components/dashboard/event-progress-gauge";
import { RegistrationAnalytics } from "@/components/dashboard/registration-analytics";
import { ActiveEventsOverview } from "@/components/dashboard/active-events-overview";

describe("Operational Purity & Mock Data Elimination Invariants", () => {
  describe("Dashboard KPI Cards", () => {
    it("renders honest zero metrics when empty in live production mode (!isPreview)", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <DashboardKpiRow
          metrics={{
            totalRegistrations: 0,
            totalCapacity: 0,
            checkInConversion: 0,
            activeEventsCount: 0,
            certificatesIssued: 0,
          }}
          isPreview={false}
        />
      );

      // Ensures no hardcoded mock numbers exist in rendered output
      expect(html).not.toContain("1,842");
      expect(html).not.toContain("2,200");
      expect(html).not.toContain("82.4%");
      expect(html).toContain("/ 0 cap");
      expect(html).toContain("0%");
    });

    it("does not render preview indicator badges on KPI cards when in production live mode", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <DashboardKpiRow
          metrics={{
            totalRegistrations: 15,
            totalCapacity: 50,
            checkInConversion: 66,
            activeEventsCount: 2,
            certificatesIssued: 5,
          }}
          isPreview={false}
        />
      );

      expect(html).not.toContain("+12% vs last cohort");
      expect(html).not.toContain("+4.1%");
      expect(html).not.toContain("Live Now");
    });
  });

  describe("Organizer Activity & Duty Roster", () => {
    it("renders honest empty state when no admins are assigned in live production mode", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <OrganizerActivity
          admins={[]}
          events={[]}
          isPreview={false}
        />
      );

      expect(html).toContain("No operations duty leads assigned yet.");
      // Must not display hardcoded mock roster members
      expect(html).not.toContain("Devon Lane");
      expect(html).not.toContain("Courtney Henry");
      expect(html).not.toContain("Arlene McCoy");
      expect(html).not.toContain("Jerome Bell");
    });

    it("displays real admin profiles when provided in live mode", () => {
      const realAdmins = [
        {
          id: "adm-1",
          name: "Harshanth Lead",
          email: "harshanth@sketchhub.com",
          role: "master_admin" as const,
        },
      ];

      const html = ReactDOMServer.renderToStaticMarkup(
        <OrganizerActivity
          admins={realAdmins}
          events={[]}
          isPreview={false}
        />
      );

      expect(html).toContain("Harshanth Lead");
      expect(html).toContain("Lead Coordinator");
      expect(html).not.toContain("Devon Lane");
    });
  });

  describe("Event Progress & Throughput Gauge", () => {
    it("renders empty state without mock active events when empty in live mode", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <EventProgressGauge
          events={[]}
          participants={[]}
          isPreview={false}
        />
      );

      expect(html).toContain("No active events in scope for throughput analysis.");
      expect(html).not.toContain("Design Systems Sprint");
      expect(html).not.toContain("Generative UI Hack");
    });
  });

  describe("Active Events Overview", () => {
    it("renders empty message instead of MOCK_EVENTS when events array is empty in live mode", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <ActiveEventsOverview
          events={[]}
          isPreview={false}
        />
      );

      expect(html).toContain("No active or upcoming events scheduled");
      expect(html).not.toContain("UX/UI Design Sprint 2026");
      expect(html).not.toContain("Full-Stack Hackathon 2026");
    });
  });

  describe("Registration Analytics Series", () => {
    it("displays zero-count series instead of preview curve when participants are empty in live mode", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <RegistrationAnalytics
          participants={[]}
          isPreview={false}
        />
      );

      // In live mode with 0 participants, preview values like 120 or 142 should not exist in the HTML
      expect(html).not.toContain("120");
      expect(html).not.toContain("142");
    });
  });
});
