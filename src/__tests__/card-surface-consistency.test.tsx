import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { KpiCard, DashboardKpiRow } from "@/components/dashboard/kpi-cards";
import { Card } from "@/components/ui/card";

describe("Card Surface Consistency & Precise Theme Requirements", () => {
  it("renders KpiCard with sketch-card-hero for featured cards and clean light/dark for standard cards", () => {
    const featuredHtml = ReactDOMServer.renderToStaticMarkup(
      <KpiCard
        title="Total Registrations"
        value="1,842"
        isFeatured={true}
        capacity={2200}
        progressPercent={84}
      />
    );

    const standardHtml = ReactDOMServer.renderToStaticMarkup(
      <KpiCard
        title="Active Events"
        value="4"
        isFeatured={false}
      />
    );

    // Featured card (1 of the 5 designated cards) uses luminous charcoal hero styling
    expect(featuredHtml).toContain("sketch-card-hero");
    expect(featuredHtml).toContain("text-white");
    expect(featuredHtml).not.toContain("border-[#E5E7EA]");

    // Standard cards in light mode are clean white surfaces, dark mode are refined charcoal
    expect(standardHtml).toContain("bg-white");
    expect(standardHtml).toContain("dark:from-[#282D34]");
    expect(standardHtml).toContain("border-[#E5E7EA]");
    expect(standardHtml).toContain("dark:border-[#363C46]");
    expect(standardHtml).not.toContain("sketch-card-hero");
  });

  it("renders DashboardKpiRow with Card 1 as hero and Cards 2-4 as standard cards", () => {
    const rowHtml = ReactDOMServer.renderToStaticMarkup(
      <DashboardKpiRow isPreview={true} />
    );

    // Total Registrations is Card 1 (featured)
    expect(rowHtml).toContain("Total Registrations");
    expect(rowHtml).toContain("sketch-card-hero");

    // Sibling cards exist and use standard card tokens
    expect(rowHtml).toContain("Check-in Conversion");
    expect(rowHtml).toContain("Active Events");
    expect(rowHtml).toContain("Certificates Issued");

    // Standard cards have bg-white in light mode and dark:from-[#282D34] in dark mode
    expect(rowHtml).toContain("bg-white");
    expect(rowHtml).toContain("dark:from-[#282D34]");
    expect(rowHtml).toContain("dark:border-[#363C46]");
    expect(rowHtml).toContain("hover:-translate-y-0.5");
    expect(rowHtml).toContain("motion-reduce:transition-none");
  });

  it("renders ui/Card with unified light surface and dark gradient tokens", () => {
    const cardHtml = ReactDOMServer.renderToStaticMarkup(
      <Card interactive>
        <div>Content</div>
      </Card>
    );

    expect(cardHtml).toContain("bg-white");
    expect(cardHtml).toContain("dark:from-[#282D34]");
    expect(cardHtml).toContain("border-[#E5E7EA]");
    expect(cardHtml).toContain("dark:border-[#363C46]");
    expect(cardHtml).toContain("dark:hover:border-[#48515E]");
  });
});
