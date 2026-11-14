import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import PublicEventClient from "@/app/(public)/e/[slug]/public-event-client";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { EventItem } from "@/types";

describe("SketchHUB Dynamic Blurred Event Background", () => {
  const eventDietCode = MOCK_EVENTS.find((e) => e.slug === "diet-code-2026")!;
  const eventDesignSprint = MOCK_EVENTS.find((e) => e.slug === "design-sprint-2026")!;

  it("1. Event A renders its own cover image as the blurred background layer", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <PublicEventClient event={eventDietCode} isPreview={true} />
    );

    const coverUrl = eventDietCode.heroImage || eventDietCode.posterUrl;
    expect(coverUrl).toBeTruthy();

    const escapedCoverUrl = coverUrl.replace(/&/g, "&amp;");

    // Verify background image layer uses the event's own cover image
    expect(html).toContain(`src="${escapedCoverUrl}"`);

    // Verify background container classes
    expect(html).toContain("ambientBackground");
    expect(html).toContain("ambientImage");
    expect(html).toContain("ambientOverlay");

    // Verify the static hardcoded ambient background image is NOT used
    expect(html).not.toContain("sketchhub-ambient-bg.jpg");
  });

  it("2. Event B renders its own distinct cover image as the blurred background layer", () => {
    const htmlA = ReactDOMServer.renderToStaticMarkup(
      <PublicEventClient event={eventDietCode} isPreview={true} />
    );
    const htmlB = ReactDOMServer.renderToStaticMarkup(
      <PublicEventClient event={eventDesignSprint} isPreview={true} />
    );

    const coverUrlA = eventDietCode.heroImage || eventDietCode.posterUrl;
    const coverUrlB = eventDesignSprint.heroImage || eventDesignSprint.posterUrl;

    expect(coverUrlA).not.toBe(coverUrlB);

    const escapedCoverUrlA = coverUrlA.replace(/&/g, "&amp;");
    const escapedCoverUrlB = coverUrlB.replace(/&/g, "&amp;");

    // Event B uses coverUrlB in background
    expect(htmlB).toContain(`src="${escapedCoverUrlB}"`);

    // Event A and B backgrounds are distinct and match their respective covers
    expect(htmlA).toContain(`src="${escapedCoverUrlA}"`);
    expect(htmlB).not.toContain(`src="${escapedCoverUrlA}"`);
  });

  it("3. Hero image inside the card remains completely sharp without blur", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <PublicEventClient event={eventDietCode} isPreview={true} />
    );

    // Content container has z-index 10
    expect(html).toContain("contentContainer");

    // The hero image inside the card is present
    expect(html).toContain('alt="Diet CODE — Registration"');
    expect(html).toContain("object-cover");

    // The hero card image element does not have blur or ambientImage classes
    const cardHeroRegex = /<img[^>]*alt="Diet CODE — Registration"[^>]*>/;
    const match = html.match(cardHeroRegex);
    expect(match).toBeTruthy();
    if (match) {
      expect(match[0]).not.toContain("ambientImage");
      expect(match[0]).not.toContain("blur");
    }
  });

  it("4. Gracefully renders dark ambient fallback when an event has no cover image", () => {
    const eventWithoutCover: EventItem = {
      ...eventDietCode,
      id: "evt-no-cover",
      slug: "no-cover-event",
      posterUrl: "",
      heroImage: undefined,
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      <PublicEventClient event={eventWithoutCover} isPreview={true} />
    );

    // Background layer should render fallback gradient, not a broken img
    expect(html).toContain("ambientFallback");
    expect(html).toContain("ambientBackground");
    expect(html).toContain("ambientOverlay");

    // Foreground content remains intact
    expect(html).toContain("Diet CODE — Registration");
  });

  it("5. Supports adjustable dark overlay opacity to maintain readability", () => {
    const htmlCustomOpacity = ReactDOMServer.renderToStaticMarkup(
      <PublicEventClient event={eventDietCode} isPreview={true} bgOverlayOpacity={0.88} />
    );

    expect(htmlCustomOpacity).toContain("opacity:0.88");
  });
});
