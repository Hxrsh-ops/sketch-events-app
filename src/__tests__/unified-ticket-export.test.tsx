import { describe, it, expect } from "vitest";
import {
  generateUnifiedTicketSvg,
  DEFAULT_UNIFIED_TICKET_DESIGN,
  TicketRenderData,
} from "@/lib/ticket/ticket-renderer";

describe("Unified Ticket SVG Export & Layout Alignment", () => {
  const sampleData: TicketRenderData = {
    design: DEFAULT_UNIFIED_TICKET_DESIGN,
    event: {
      title: "Annual Design & Tech Summit 2026",
      category: "KEYNOTE & SHOWCASE",
      venue: "University Central Auditorium, Zone 1",
      venueMode: "in-person",
      startDate: "2026-11-21T10:00:00Z",
      organizerName: "SKETCH",
    },
    attendee: {
      name: "Aditi Rao",
      ticketNumber: "TKT-2026-8849-GL",
      teamName: "CodeCraft Orbit",
    },
    qrPayload: "https://sketchhub.local/tickets/TKT-2026-8849-GL",
  };

  it("1. Generates SVG with exact ticket dimensions, matching viewBox, and preserveAspectRatio", async () => {
    const svg = await generateUnifiedTicketSvg(sampleData);

    expect(svg).toBeTruthy();
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('viewBox="0 0 800 380"');
    expect(svg).toContain('width="800"');
    expect(svg).toContain('height="380"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');

    // No gigantic page-sized canvas or bounding boxes
    expect(svg).not.toContain('width="600" height="800"');
    expect(svg).not.toContain('viewBox="0 0 600 800"');
  });

  it("2. Features true cutout notches at perforation line (mainPassWidth = 560)", async () => {
    const svg = await generateUnifiedTicketSvg(sampleData);

    // 800 - 240 stub = 560 main pass width
    // Cutout notch radius is 10, so path coordinates must reflect 550 and 570
    expect(svg).toContain("clipPath id=\"ticketClip\"");
    expect(svg).toContain("H 550");
    expect(svg).toContain("A 10,10 0 0,0 570,0");
    expect(svg).toContain("A 10,10 0 0,0 550,380");

    // Perforation line should be at x = 560
    expect(svg).toContain('x1="560"');
    expect(svg).toContain('x2="560"');
    expect(svg).toContain('stroke-dasharray="6,6"');
  });

  it("3. Centers the QR code neatly within the stub card without overflow", async () => {
    const svg = await generateUnifiedTicketSvg(sampleData);

    // QR card rect at mainPassWidth (560) + (240 - 140)/2 = 610
    expect(svg).toContain('<rect x="610"');
    expect(svg).toContain('width="140" height="140" rx="12" fill="#FFFFFF"');

    // Inner QR SVG is positioned inside the white card (610 + 10 = 620)
    expect(svg).toContain('<svg x="620"');
    expect(svg).toContain('width="120" height="120"');

    // QR paths should be embedded cleanly without redundant xml declarations
    expect(svg).not.toContain('<?xml version="1.0" encoding="UTF-8"?><path');
  });

  it("4. Accurately renders attendee, event, and access metadata", async () => {
    const svg = await generateUnifiedTicketSvg(sampleData);

    expect(svg).toContain("Aditi Rao");
    expect(svg).toContain("Annual Design &amp; Tech Summit 2026");
    expect(svg).toContain("TKT-2026-8849-GL");
    expect(svg).toContain("CodeCraft Orbit");
    expect(svg).toContain("University Central Auditorium, Zone 1");
    expect(svg).toContain("IN-PERSON");
    expect(svg).toContain("SKETCH • OFFICIAL PASS");
    expect(svg).toContain("ENTRY PASS");
  });

  it("5. Supports custom canvas dimensions without hardcoded offsets", async () => {
    const customData: TicketRenderData = {
      ...sampleData,
      design: {
        ...DEFAULT_UNIFIED_TICKET_DESIGN,
        canvas: { width: 900, height: 400, unit: "px" },
        stub: {
          ...DEFAULT_UNIFIED_TICKET_DESIGN.stub,
          stubWidth: 300,
        },
      },
    };

    const svg = await generateUnifiedTicketSvg(customData);

    // Width 900, height 400
    expect(svg).toContain('viewBox="0 0 900 400"');
    expect(svg).toContain('width="900"');
    expect(svg).toContain('height="400"');

    // mainPassWidth = 900 - 300 = 600
    // Notches at 590 and 610
    expect(svg).toContain("H 590");
    expect(svg).toContain("A 10,10 0 0,0 610,0");
    expect(svg).toContain('x1="600"');
    expect(svg).toContain('x2="600"');
  });

  it("6. Supports custom elements placement when defined", async () => {
    const customElementsData: TicketRenderData = {
      ...sampleData,
      design: {
        ...DEFAULT_UNIFIED_TICKET_DESIGN,
        elements: [
          {
            id: "el-1",
            type: "text",
            x: 50,
            y: 80,
            width: 300,
            height: 30,
            zIndex: 1,
            isLocked: false,
            bindingKey: "event_title",
            fontSize: 22,
            fontWeight: "bold",
            color: "#FFFFFF",
            alignment: "left",
          },
        ],
      },
    };

    const svg = await generateUnifiedTicketSvg(customElementsData);

    expect(svg).toContain('x="50"');
    expect(svg).toContain("Annual Design &amp; Tech Summit 2026");
  });
});
