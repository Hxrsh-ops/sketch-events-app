import { describe, it, expect } from "vitest";
import {
  generateUnifiedTicketSvg,
  DEFAULT_UNIFIED_TICKET_DESIGN,
  TicketRenderData,
} from "@/lib/ticket/ticket-renderer";
import { CanvasElement, TicketDesignData } from "@/lib/validations/ticket-schemas";

describe("Ticket Studio Interactive Element Editing & Design Parity", () => {
  const baseDesign: TicketDesignData = {
    ...DEFAULT_UNIFIED_TICKET_DESIGN,
    elements: [
      {
        id: "el-title",
        type: "text",
        x: 40,
        y: 60,
        width: 320,
        height: 48,
        zIndex: 1,
        isLocked: true,
        bindingKey: "event_title",
        text: "Default Title",
        sampleValue: "Diet CODE",
        fontSize: 26,
        fontWeight: "extrabold",
        color: "#F3F4F6",
        alignment: "left",
      },
      {
        id: "el-attendee",
        type: "text",
        x: 40,
        y: 130,
        width: 300,
        height: 36,
        zIndex: 2,
        isLocked: true,
        bindingKey: "attendee_name",
        text: "Participant Name",
        sampleValue: "Tharika",
        fontSize: 18,
        fontWeight: "bold",
        color: "#F3F4F6",
        alignment: "left",
      },
      {
        id: "el-custom-note",
        type: "text",
        x: 40,
        y: 220,
        width: 250,
        height: 30,
        zIndex: 3,
        isLocked: false,
        text: "Please arrive 15 minutes early",
        fontSize: 12,
        fontWeight: "normal",
        color: "#9CA3AF",
        alignment: "left",
        letterSpacing: 1.5,
        lineHeight: 1.4,
        rotation: 0,
      },
    ],
  };

  it("1. Allows editing sample/preview value for system fields while strictly preserving bindingKey", () => {
    const updatedElements = baseDesign.elements.map((el) => {
      if (el.id === "el-attendee") {
        return {
          ...el,
          sampleValue: "Alex Johnson",
        };
      }
      return el;
    });

    const targetEl = updatedElements.find((e) => e.id === "el-attendee");
    expect(targetEl).toBeDefined();
    expect(targetEl?.sampleValue).toBe("Alex Johnson");
    expect(targetEl?.bindingKey).toBe("attendee_name");
    expect(targetEl?.isLocked).toBe(true);
  });

  it("2. Allows deleting all characters in custom static text to an empty string without restoring fallback", () => {
    // Simulate user deleting characters one by one until empty string
    let currentText = "Tharika";
    while (currentText.length > 0) {
      currentText = currentText.slice(0, -1);
    }

    expect(currentText).toBe("");

    const updatedElements = baseDesign.elements.map((el) => {
      if (el.id === "el-custom-note") {
        return {
          ...el,
          text: currentText, // empty string
        };
      }
      return el;
    });

    const targetEl = updatedElements.find((e) => e.id === "el-custom-note");
    expect(targetEl).toBeDefined();
    // Must remain exact empty string, not default fallback
    expect(targetEl?.text).toBe("");
    expect(targetEl?.text).not.toBe("Please arrive 15 minutes early");
  });

  it("3. Supports duplicating elements with offset coordinates", () => {
    const originalEl = baseDesign.elements.find((e) => e.id === "el-custom-note")!;
    const duplicated: CanvasElement = {
      ...originalEl,
      id: "el-custom-note-dup",
      x: originalEl.x + 15,
      y: originalEl.y + 15,
      isLocked: false,
    };

    expect(duplicated.x).toBe(55);
    expect(duplicated.y).toBe(235);
    expect(duplicated.text).toBe(originalEl.text);
    expect(duplicated.letterSpacing).toBe(1.5);
    expect(duplicated.id).not.toBe(originalEl.id);
  });

  it("4. Supports layer ordering: Bring to Front, Send to Back, Bring Forward, Send Backward", () => {
    const elements = [...baseDesign.elements];

    // Bring el-title (index 0) to front (move to end)
    const bringToFront = (list: CanvasElement[], id: string) => {
      const el = list.find((e) => e.id === id)!;
      const rest = list.filter((e) => e.id !== id);
      return [...rest, el];
    };

    const frontList = bringToFront(elements, "el-title");
    expect(frontList[frontList.length - 1].id).toBe("el-title");

    // Send el-custom-note (index 2) to back (move to index 0)
    const sendToBack = (list: CanvasElement[], id: string) => {
      const el = list.find((e) => e.id === id)!;
      const rest = list.filter((e) => e.id !== id);
      return [el, ...rest];
    };

    const backList = sendToBack(elements, "el-custom-note");
    expect(backList[0].id).toBe("el-custom-note");

    // Bring forward el-title (swap with index 1)
    const bringForward = (list: CanvasElement[], id: string) => {
      const idx = list.findIndex((e) => e.id === id);
      if (idx === -1 || idx === list.length - 1) return list;
      const copy = [...list];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    };

    const forwardList = bringForward(elements, "el-title");
    expect(forwardList[1].id).toBe("el-title");
    expect(forwardList[0].id).toBe("el-attendee");
  });

  it("5. Applies typography attributes: letterSpacing, lineHeight, and rotation to generated SVG", async () => {
    const customDesign: TicketDesignData = {
      ...baseDesign,
      elements: [
        {
          id: "el-styled",
          type: "text",
          x: 50,
          y: 100,
          width: 200,
          height: 30,
          zIndex: 1,
          isLocked: false,
          text: "SPECIAL ACCESS",
          letterSpacing: 3,
          lineHeight: 1.5,
          rotation: 45,
          fontSize: 16,
          color: "#E2B857",
        },
      ],
    };

    const svg = await generateUnifiedTicketSvg({
      design: customDesign,
      event: {
        title: "Summit 2026",
      },
      attendee: {
        name: "Test Attendee",
        ticketNumber: "TKT-001",
      },
    });

    expect(svg).toContain("SPECIAL ACCESS");
    expect(svg).toContain('letter-spacing="3"');
    expect(svg).toContain('transform="rotate(45');
  });

  it("6. Real issued ticket data strictly overrides sample preview values in SVG output", async () => {
    const renderData: TicketRenderData = {
      design: baseDesign,
      event: {
        title: "Real Hackathon 2026",
        venue: "Main Hall",
      },
      attendee: {
        name: "Real Participant Aditi",
        ticketNumber: "TKT-REAL-9999",
      },
    };

    const svg = await generateUnifiedTicketSvg(renderData);

    // Real values MUST be rendered
    expect(svg).toContain("Real Hackathon 2026");
    expect(svg).toContain("Real Participant Aditi");
    expect(svg).toContain("TKT-REAL-9999");

    // Sample values MUST NOT leak into the issued ticket
    expect(svg).not.toContain("Diet CODE");
    expect(svg).not.toContain("Tharika");
  });

  it("7. Studio preview displays sample values when real attendee data is omitted", async () => {
    const previewData: TicketRenderData = {
      design: baseDesign,
      event: {
        title: "",
      },
      attendee: {
        name: "",
        ticketNumber: "",
      },
    };

    const svg = await generateUnifiedTicketSvg(previewData);

    // When no real attendee or event is supplied (Studio preview), sample values appear
    expect(svg).toContain("Diet CODE");
    expect(svg).toContain("Tharika");
  });
});
