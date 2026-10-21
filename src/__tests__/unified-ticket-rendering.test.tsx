import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { UnifiedTicketCard } from "@/components/ticket/unified-ticket-card";
import { TicketDesignData } from "@/lib/validations/ticket-schemas";

const baseDesign: TicketDesignData = {
  layout: "cinematic-horizontal",
  canvas: { width: 800, height: 380, unit: "px" },
  theme: {
    background: "#111315",
    surface: "#181B1E",
    accent: "#E2B857",
    textColor: "#F3F4F6",
    secondaryTextColor: "#9CA3AF",
    borderColor: "#2C3136",
    fontFamily: "cinematic",
  },
  stub: {
    perforationPosition: "right",
    stubWidth: 240,
    badgeText: "GENERAL ADMISSION",
    showPerforationDots: true,
  },
  qr: {
    size: 180,
    label: "SCAN TO VERIFY",
    rotating: true,
    refreshIntervalSec: 30,
  },
  elements: [],
};

describe("UnifiedTicketCard Rendering & Visual Invariants", () => {
  it("1. Renders clean ticket without background image using theme background", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedTicketCard
        design={baseDesign}
        event={{
          title: "Annual Tech Summit 2026",
          category: "CONFERENCE",
          venue: "Grand Hall 1",
          startDate: "2026-11-20T10:00:00Z",
        }}
        attendee={{
          name: "Vikram Patel",
          ticketNumber: "TKT-2026-0001",
          teamName: "CodeCraft Orbit",
        }}
        qr={{ type: "synthetic" }}
      />
    );

    expect(html).toContain("Annual Tech Summit 2026");
    expect(html).toContain("Vikram Patel");
    expect(html).toContain("CodeCraft Orbit");
    expect(html).toContain("GENERAL ADMISSION");
    expect(html).toContain("TKT-2026-0001");

    // No background image layer rendered
    expect(html).not.toContain("ticket-bg-layer");
  });

  it("2. Renders uploaded background image with Cover fit and Center alignment without obscuring veil", () => {
    const designWithCoverBg: TicketDesignData = {
      ...baseDesign,
      backgroundImage: {
        url: "https://example.com/assets/banner.png",
        fit: "cover",
        position: "center",
        overlayColor: "#000000",
        overlayOpacity: 0.25,
      },
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedTicketCard
        design={designWithCoverBg}
        event={{
          title: "Hackathon Premiere 2026",
          venue: "Innovation Hub",
          startDate: "2026-11-21T09:00:00Z",
        }}
        attendee={{
          name: "Aditi Rao",
          ticketNumber: "TKT-2026-0002",
        }}
        qr={{ type: "synthetic" }}
      />
    );

    expect(html).toContain("ticket-bg-layer");
    expect(html).toContain("https://example.com/assets/banner.png");
    expect(html).toContain("background-size:cover");
    expect(html).toContain("background-position:center center");

    // Main pass does not have a 90% opaque dark veil
    expect(html).not.toContain("from-[#181B1E]/90");
    expect(html).not.toContain("backdrop-blur-[2px]");
  });

  it("3. Renders Contain fit and Top-Right positioning correctly", () => {
    const designWithContainBg: TicketDesignData = {
      ...baseDesign,
      backgroundImage: {
        url: "https://example.com/assets/poster.webp",
        fit: "contain",
        position: "top-right",
        overlayColor: "#111315",
        overlayOpacity: 0.2,
      },
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedTicketCard
        design={designWithContainBg}
        event={{
          title: "Design Workshop",
          venue: "Studio A",
        }}
        attendee={{
          name: "Sarah Jenkins",
          ticketNumber: "TKT-2026-0003",
        }}
        qr={{ type: "synthetic" }}
      />
    );

    expect(html).toContain("background-size:contain");
    expect(html).toContain("background-position:right top");
  });

  it("4. Omits team element cleanly when attendee has no team affiliation", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedTicketCard
        design={baseDesign}
        event={{
          title: "Individual Keynote Session",
        }}
        attendee={{
          name: "Independent Researcher",
          ticketNumber: "TKT-2026-0004",
          teamName: null,
        }}
        qr={{ type: "synthetic" }}
      />
    );

    expect(html).toContain("Independent Researcher");
    expect(html).not.toContain("Team</span>");
  });

  it("5. Clearly labels synthetic preview QR codes to avoid confusion with live credentials", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedTicketCard
        design={baseDesign}
        event={{ title: "Preview Event" }}
        attendee={{ name: "Preview Guest", ticketNumber: "TKT-PREVIEW-01" }}
        qr={{ type: "synthetic" }}
      />
    );

    expect(html).toContain("SAMPLE PREVIEW • NOT VALID");
  });

  it("6. Renders live rotating QR code and countdown timer when live mode is active", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedTicketCard
        design={baseDesign}
        event={{ title: "Live Gate Event" }}
        attendee={{
          name: "Gate Attendee",
          ticketNumber: "TKT-LIVE-0001",
          attendanceStatus: "not_checked_in",
          ticketStatus: "active",
        }}
        qr={{
          type: "live",
          qrDataUrl: "data:image/png;base64,mockqr",
          secondsRemaining: 24,
        }}
      />
    );

    expect(html).toContain("alt=\"Ticket QR Code\"");
    expect(html).toContain("Refreshes in");
    expect(html).toContain("24s");
  });

  it("7. Shows Checked In status overlay on QR code when participant is checked in", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedTicketCard
        design={baseDesign}
        event={{ title: "Admitted Event" }}
        attendee={{
          name: "Checked-in Attendee",
          ticketNumber: "TKT-ADMITTED-01",
          attendanceStatus: "checked_in",
          ticketStatus: "active",
        }}
        qr={{
          type: "live",
          qrDataUrl: "data:image/png;base64,mockqr",
        }}
      />
    );

    expect(html).toContain("CHECKED IN");
  });

  it("8. Gracefully renders long event titles and attendee names with line clamping", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedTicketCard
        design={baseDesign}
        event={{
          title: "Extremely Long University Event Name That Spans Multiple Lines For International Symposium On Future Computing And Collaborative Intelligence 2026",
          venue: "Auditorium Building 4, North Wing, Main Campus Complex, Zone 3",
        }}
        attendee={{
          name: "Professor Alexandria Bartholomew-Hetherington III",
          ticketNumber: "TKT-2026-LONG-001",
        }}
        qr={{ type: "synthetic" }}
      />
    );

    expect(html).toContain("Extremely Long University Event Name");
    expect(html).toContain("Professor Alexandria Bartholomew-Hetherington III");
    expect(html).toContain("line-clamp-2");
  });

  it("9. Supports showVariableKeys mode for template editing preview", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedTicketCard
        design={baseDesign}
        event={{ title: "Dynamic" }}
        attendee={{ name: "Dynamic", ticketNumber: "TKT-00" }}
        qr={{ type: "synthetic" }}
        showVariableKeys={true}
      />
    );

    expect(html).toContain("{{event_title}}");
    expect(html).toContain("{{attendee_name}}");
    expect(html).toContain("{{ticket_number}}");
  });
});
