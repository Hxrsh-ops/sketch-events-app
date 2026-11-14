import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { CertificateStudio } from "@/components/certificate/certificate-studio";
import { UnifiedCertificateCard } from "@/components/certificate/unified-certificate-card";
import {
  DEFAULT_CERTIFICATE_DESIGN,
  CertificateDesignData,
  CertificateElement,
} from "@/types/certificate-template";
import { generateCertificateSvg } from "@/lib/certificate/certificate-renderer";

describe("Certificate Studio & Dynamic Element Editing", () => {
  it("1. CertificateStudio renders with default participant and event elements selectable", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <CertificateStudio initialDesign={DEFAULT_CERTIFICATE_DESIGN} />
    );

    // Initial default preview values
    expect(html).toContain("Aditi Rao");
    expect(html).toContain("Annual Design &amp; Tech Summit 2026");
    expect(html).toContain("SKETCH-CERT-2026-8849");
    // Elements properties panel present
    expect(html).toContain("Element Properties");
    expect(html).toContain("1. Preview Text Content");
  });

  it("2. UnifiedCertificateCard displays sample preview values on canvas immediately", () => {
    const customDesign: CertificateDesignData = {
      ...DEFAULT_CERTIFICATE_DESIGN,
      sampleData: {
        recipientName: "Tharika",
        eventTitle: "SketchHUB Tech Summit 2026",
        certificateNumber: "SKETCH-2026-0099",
        issueDate: "November 21, 2026",
        eventDate: "November 21, 2026",
      },
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedCertificateCard
        design={customDesign}
        certificate={{
          recipientName: "Tharika",
          eventTitle: "SketchHUB Tech Summit 2026",
          certificateNumber: "SKETCH-2026-0099",
          issuedAt: "2026-11-21T10:00:00Z",
        }}
        interactive={true}
        selectedElementId="cert-recipient-name"
      />
    );

    expect(html).toContain("Tharika");
    expect(html).toContain("SketchHUB Tech Summit 2026");
    // Visible selection border indicator on selected element
    expect(html).toContain("ring-2 ring-amber-500");
  });

  it("3. Distinguishes dynamic fields from static text without overwriting dynamic bindings", () => {
    // Elements maintain bindingKey: "recipient_name"
    const recipientEl = DEFAULT_CERTIFICATE_DESIGN.elements.find(
      (el) => el.id === "cert-recipient-name"
    );
    expect(recipientEl).toBeDefined();
    expect(recipientEl?.bindingKey).toBe("recipient_name");

    const eventEl = DEFAULT_CERTIFICATE_DESIGN.elements.find(
      (el) => el.id === "cert-event-title"
    );
    expect(eventEl).toBeDefined();
    expect(eventEl?.bindingKey).toBe("event_title");

    const staticOrgEl = DEFAULT_CERTIFICATE_DESIGN.elements.find(
      (el) => el.id === "cert-org"
    );
    expect(staticOrgEl).toBeDefined();
    expect(staticOrgEl?.bindingKey).toBe("custom");
    expect(staticOrgEl?.text).toBe("SKETCH EVENT OPERATIONS PLATFORM");
  });

  it("4. Renders mask elements and text background fill to cover embedded JPG text", async () => {
    const designWithMask: CertificateDesignData = {
      ...DEFAULT_CERTIFICATE_DESIGN,
      elements: [
        ...DEFAULT_CERTIFICATE_DESIGN.elements,
        {
          id: "test-mask-box",
          type: "mask",
          bindingKey: "custom",
          x: 100,
          y: 200,
          width: 300,
          height: 50,
          zIndex: 2,
          backgroundColor: "#FFFFFF",
          opacity: 1,
          borderRadius: 4,
          isVisible: true,
        },
        {
          id: "test-masked-text",
          type: "text",
          bindingKey: "custom",
          text: "Replacement Text Over Mask",
          x: 100,
          y: 200,
          width: 300,
          height: 40,
          zIndex: 4,
          fontSize: 16,
          color: "#000000",
          backgroundColor: "#F9FAFB",
          alignment: "center",
          isVisible: true,
        },
      ],
    };

    // Card preview
    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedCertificateCard
        design={designWithMask}
        certificate={{
          recipientName: "Aditi Rao",
          eventTitle: "Annual Design & Tech Summit 2026",
          certificateNumber: "SKETCH-CERT-2026-8849",
          issuedAt: "2026-11-21T10:00:00Z",
        }}
        interactive={true}
      />
    );

    expect(html).toContain("Replacement Text Over Mask");
    expect(html).toContain("background-color:#FFFFFF");
    expect(html).toContain("background-color:#F9FAFB");

    // SVG output includes mask rects
    const svg = await generateCertificateSvg({
      design: designWithMask,
      certificate: {
        recipientName: "Aditi Rao",
        eventTitle: "Annual Design & Tech Summit 2026",
        certificateNumber: "SKETCH-CERT-2026-8849",
        issuedAt: "2026-11-21T10:00:00Z",
      },
    });

    expect(svg).toContain('<rect x="100" y="200" width="300" height="50" rx="4" fill="#FFFFFF"');
    expect(svg).toContain('fill="#F9FAFB"');
    expect(svg).toContain("Replacement Text Over Mask");
  });

  it("5. Exported SVG exactly matches edited preview text (Scenario: Tharika & SketchHUB Tech Summit 2026)", async () => {
    const updatedDesign: CertificateDesignData = {
      ...DEFAULT_CERTIFICATE_DESIGN,
      elements: DEFAULT_CERTIFICATE_DESIGN.elements.map((el) => {
        if (el.id === "cert-recipient-name") {
          return {
            ...el,
            sampleValue: "Tharika",
            fontSize: 38,
            color: "#FFD700",
            fontFamily: "cinematic",
          };
        }
        if (el.id === "cert-event-title") {
          return {
            ...el,
            sampleValue: "SketchHUB Tech Summit 2026",
            fontSize: 24,
            color: "#00E5FF",
          };
        }
        return el;
      }),
    };

    const svg = await generateCertificateSvg({
      design: updatedDesign,
      certificate: {
        recipientName: "Tharika",
        eventTitle: "SketchHUB Tech Summit 2026",
        certificateNumber: "SKETCH-CERT-2026-8849",
        issuedAt: "2026-11-21T10:00:00Z",
      },
    });

    // Verify edited text in SVG
    expect(svg).toContain("Tharika");
    expect(svg).toContain("SketchHUB Tech Summit 2026");
    expect(svg).toContain('fill="#FFD700"');
    expect(svg).toContain('fill="#00E5FF"');
    expect(svg).toContain('font-size="38"');
    expect(svg).toContain('font-size="24"');
  });

  it("6. Dynamic participant binding remains intact for production issuance with real attendee", async () => {
    // Studio template configuration saved by admin
    const savedDesign: CertificateDesignData = {
      ...DEFAULT_CERTIFICATE_DESIGN,
      sampleData: {
        recipientName: "Tharika", // Admin preview test name
        eventTitle: "SketchHUB Tech Summit 2026",
      },
    };

    // When issuing to a real attendee in production:
    const realAttendeeSvg = await generateCertificateSvg({
      design: savedDesign,
      certificate: {
        recipientName: "Elena Rostova", // Real attendee from DB
        eventTitle: "SketchHUB Tech Summit 2026",
        certificateNumber: "SKETCH-CERT-REAL-7721",
        issuedAt: "2026-11-21T12:00:00Z",
      },
    });

    // Real attendee name is injected via dynamic binding
    expect(realAttendeeSvg).toContain("Elena Rostova");
    expect(realAttendeeSvg).toContain("SKETCH-CERT-REAL-7721");
    expect(realAttendeeSvg).not.toContain("Aditi Rao");
  });

  it("7. Canvas supports rotation and typography properties in preview and SVG", async () => {
    const rotatedDesign: CertificateDesignData = {
      ...DEFAULT_CERTIFICATE_DESIGN,
      elements: [
        {
          id: "rot-el",
          type: "text",
          bindingKey: "custom",
          text: "Angled Seal Stamp",
          x: 200,
          y: 200,
          width: 150,
          height: 30,
          zIndex: 5,
          fontSize: 14,
          rotation: -15,
          color: "#E2B857",
          isVisible: true,
        },
      ],
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      <UnifiedCertificateCard
        design={rotatedDesign}
        certificate={{
          recipientName: "Aditi Rao",
          eventTitle: "Tech Summit",
          certificateNumber: "123",
          issuedAt: "2026-11-21T10:00:00Z",
        }}
      />
    );

    expect(html).toContain("rotate(-15deg)");

    const svg = await generateCertificateSvg({
      design: rotatedDesign,
      certificate: {
        recipientName: "Aditi Rao",
        eventTitle: "Tech Summit",
        certificateNumber: "123",
        issuedAt: "2026-11-21T10:00:00Z",
      },
    });

    expect(svg).toContain("rotate(-15");
    expect(svg).toContain("Angled Seal Stamp");
  });

  it("8. Part 3 & 8 Multi-Participant Invariant: Same configured design produces personalized certificates for Tharika and Giya", async () => {
    // Configured template by admin
    const configuredDesign: CertificateDesignData = {
      ...DEFAULT_CERTIFICATE_DESIGN,
      elements: DEFAULT_CERTIFICATE_DESIGN.elements.map((el) => {
        if (el.id === "cert-recipient-name") {
          return {
            ...el,
            x: 70,
            y: 225,
            fontSize: 34,
            fontWeight: "bold" as const,
            fontFamily: "serif" as const,
            color: "#FFFFFF",
            alignment: "center" as const,
            sampleValue: "Aditi Rao", // Preview sample in editor
          };
        }
        if (el.id === "cert-event-title") {
          return {
            ...el,
            sampleValue: "SketchHUB Tech Summit 2026",
          };
        }
        return el;
      }),
    };

    // 1. Participant 1: Tharika
    const certTharika = await generateCertificateSvg({
      design: configuredDesign,
      certificate: {
        recipientName: "Tharika",
        eventTitle: "SketchHUB Tech Summit 2026",
        certificateNumber: "SKETCH-CERT-2026-0001",
        issuedAt: "2026-11-21T10:00:00Z",
      },
    });

    // 2. Participant 2: Giya
    const certGiya = await generateCertificateSvg({
      design: configuredDesign,
      certificate: {
        recipientName: "Giya",
        eventTitle: "SketchHUB Tech Summit 2026",
        certificateNumber: "SKETCH-CERT-2026-0002",
        issuedAt: "2026-11-21T10:00:00Z",
      },
    });

    // Verify Tharika's certificate has her name and correct formatting
    expect(certTharika).toContain("Tharika");
    expect(certTharika).toContain("SKETCH-CERT-2026-0001");
    expect(certTharika).not.toContain("Aditi Rao");
    expect(certTharika).not.toContain("Giya");
    expect(certTharika).toContain('font-family="Georgia, \'Times New Roman\', serif"');
    expect(certTharika).toContain('font-size="34"');

    // Verify Giya's certificate has her name and the exact same formatting
    expect(certGiya).toContain("Giya");
    expect(certGiya).toContain("SKETCH-CERT-2026-0002");
    expect(certGiya).not.toContain("Aditi Rao");
    expect(certGiya).not.toContain("Tharika");
    expect(certGiya).toContain('font-family="Georgia, \'Times New Roman\', serif"');
    expect(certGiya).toContain('font-size="34"');

    // Both share the exact same event title and layout
    expect(certTharika).toContain("SketchHUB Tech Summit 2026");
    expect(certGiya).toContain("SketchHUB Tech Summit 2026");
  });

  it("9. Deleting all characters to an empty string preserves empty state without reverting to fallback values", async () => {
    // 1. Start with Tharika as the typed name
    const designWithTharika: CertificateDesignData = {
      ...DEFAULT_CERTIFICATE_DESIGN,
      sampleData: {
        recipientName: "Tharika",
      },
      elements: DEFAULT_CERTIFICATE_DESIGN.elements.map((el) =>
        el.id === "cert-recipient-name" ? { ...el, sampleValue: "Tharika" } : el
      ),
    };

    // Verify initial rendering contains Tharika
    const htmlTharika = ReactDOMServer.renderToStaticMarkup(
      <CertificateStudio initialDesign={designWithTharika} />
    );
    expect(htmlTharika).toContain('value="Tharika"');

    // 2. Simulate user deleting characters one by one down to the final character and then empty string ""
    const designWithEmptyName: CertificateDesignData = {
      ...DEFAULT_CERTIFICATE_DESIGN,
      sampleData: {
        recipientName: "",
      },
      elements: DEFAULT_CERTIFICATE_DESIGN.elements.map((el) =>
        el.id === "cert-recipient-name" ? { ...el, sampleValue: "" } : el
      ),
    };

    // Render Studio with empty string - MUST NOT revert to "Aditi Rao" or fallback
    const htmlEmpty = ReactDOMServer.renderToStaticMarkup(
      <CertificateStudio initialDesign={designWithEmptyName} />
    );
    expect(htmlEmpty).toContain('value=""');
    expect(htmlEmpty).not.toContain('value="Aditi Rao"');

    // UnifiedCertificateCard with empty string must render empty string, NOT "Participant Full Name" or "Aditi Rao"
    const cardHtmlEmpty = ReactDOMServer.renderToStaticMarkup(
      <UnifiedCertificateCard
        design={designWithEmptyName}
        certificate={{
          recipientName: "",
          eventTitle: "Annual Design & Tech Summit 2026",
          certificateNumber: "SKETCH-CERT-2026-8849",
          issuedAt: "2026-11-21T10:00:00Z",
        }}
        interactive={true}
        selectedElementId="cert-recipient-name"
      />
    );
    expect(cardHtmlEmpty).not.toContain("Participant Full Name");
    expect(cardHtmlEmpty).not.toContain("Aditi Rao");

    // SVG generation with empty string must not output "Aditi Rao"
    const emptySvg = await generateCertificateSvg({
      design: designWithEmptyName,
      certificate: {
        recipientName: "",
        eventTitle: "Annual Design & Tech Summit 2026",
        certificateNumber: "SKETCH-CERT-2026-8849",
        issuedAt: "2026-11-21T10:00:00Z",
      },
    });
    expect(emptySvg).not.toContain("Aditi Rao");
    expect(emptySvg).not.toContain("Participant Full Name");

    // 3. User types a completely different name after deleting: "Giya"
    const designWithNewName: CertificateDesignData = {
      ...DEFAULT_CERTIFICATE_DESIGN,
      sampleData: {
        recipientName: "Giya",
      },
      elements: DEFAULT_CERTIFICATE_DESIGN.elements.map((el) =>
        el.id === "cert-recipient-name" ? { ...el, sampleValue: "Giya" } : el
      ),
    };

    const htmlNewName = ReactDOMServer.renderToStaticMarkup(
      <CertificateStudio initialDesign={designWithNewName} />
    );
    expect(htmlNewName).toContain('value="Giya"');

    const cardHtmlNew = ReactDOMServer.renderToStaticMarkup(
      <UnifiedCertificateCard
        design={designWithNewName}
        certificate={{
          recipientName: "Giya",
          eventTitle: "Annual Design & Tech Summit 2026",
          certificateNumber: "SKETCH-CERT-2026-8849",
          issuedAt: "2026-11-21T10:00:00Z",
        }}
        interactive={true}
        selectedElementId="cert-recipient-name"
      />
    );
    expect(cardHtmlNew).toContain("Giya");

    const newSvg = await generateCertificateSvg({
      design: designWithNewName,
      certificate: {
        recipientName: "Giya",
        eventTitle: "Annual Design & Tech Summit 2026",
        certificateNumber: "SKETCH-CERT-2026-8849",
        issuedAt: "2026-11-21T10:00:00Z",
      },
    });
    expect(newSvg).toContain("Giya");
    expect(newSvg).not.toContain("Aditi Rao");
  });

  it("13. Replaces all legacy color controls with ColorPickerField across Certificate Studio", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <CertificateStudio initialDesign={DEFAULT_CERTIFICATE_DESIGN} />
    );

    // Theme Color controls rendered with ColorPickerField
    expect(html).toContain("Certificate Theme &amp; Colors");
    expect(html).toContain("Background Color");
    expect(html).toContain("Text Color");
    expect(html).toContain("Accent Color");
    expect(html).toContain("Border Color");

    // Element inspector Text Color rendered with ColorPickerField
    expect(html).toContain("7. Text Color");

    // Legacy native color inputs must NOT exist
    expect(html).not.toContain('type="color"');

    // Legacy hardcoded 4-swatch strip buttons (e.g. #00E5FF, #F43F5E) must NOT exist
    expect(html).not.toContain('title="#00E5FF"');
    expect(html).not.toContain('title="#F43F5E"');
    expect(html).not.toContain("#00E5FF");
    expect(html).not.toContain("#F43F5E");
  });
});
