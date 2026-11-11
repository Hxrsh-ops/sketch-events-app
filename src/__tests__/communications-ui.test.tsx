import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import CommunicationsClient from "@/app/(admin)/communications/communications-client";
import { CommunicationJob, EventItem, Participant } from "@/types";

describe("Communications & Outbox UI Rendering", () => {
  const sampleEvents: EventItem[] = [
    {
      id: "evt-1",
      slug: "sketchathon",
      title: "Sketchathon",
      category: "Hackathon",
      shortDescription: "Campus Hackathon",
      description: "Full description",
      posterUrl: "",
      startDate: "2026-11-20T09:00:00Z",
      endDate: "2026-11-21T18:00:00Z",
      venue: "Main Hall",
      venueMode: "in-person",
      capacity: 100,
      registeredCount: 1,
      checkedInCount: 0,
      lifecycle: "published",
      registrationState: "open",
      hasTeams: false,
      hasRounds: false,
    },
  ];

  const sampleParticipants: Participant[] = [
    {
      id: "part-1",
      registrationId: "REG-001",
      eventId: "evt-1",
      eventTitle: "Sketchathon",
      name: "Tharika",
      email: "tharikadheena@gmail.com",
      registeredAt: "2026-11-11T08:00:00Z",
      status: "registered",
      attendanceStatus: "not_checked_in",
      qrCredentialId: "SKETCH-TKT-001",
    },
  ];

  const sampleJobs: CommunicationJob[] = [
    {
      id: "job-q",
      eventId: "evt-1",
      eventTitle: "Sketchathon",
      subject: "Queued Pass",
      type: "confirmation",
      recipientCount: 1,
      recipientEmail: "queued@sketch.test",
      status: "queued",
      attempts: 0,
      scheduledAt: "2026-11-11T09:00:00Z",
    },
    {
      id: "job-f",
      eventId: "evt-1",
      eventTitle: "Sketchathon",
      subject: "Failed Pass",
      type: "confirmation",
      recipientCount: 1,
      recipientEmail: "failed@sketch.test",
      status: "failed",
      attempts: 5,
      lastError: "403 Forbidden",
      scheduledAt: "2026-11-11T09:00:00Z",
    },
    {
      id: "job-s",
      eventId: "evt-1",
      eventTitle: "Sketchathon",
      subject: "Sent Pass",
      type: "confirmation",
      recipientCount: 1,
      recipientEmail: "sent@sketch.test",
      status: "sent",
      attempts: 1,
      scheduledAt: "2026-11-11T09:00:00Z",
      deliveredAt: "2026-11-11T09:01:00Z",
    },
    {
      id: "job-p",
      eventId: "evt-1",
      eventTitle: "Sketchathon",
      subject: "Processing Pass",
      type: "confirmation",
      recipientCount: 1,
      recipientEmail: "proc@sketch.test",
      status: "processing",
      attempts: 0,
      scheduledAt: "2026-11-11T09:00:00Z",
    },
    {
      id: "job-c",
      eventId: "evt-1",
      eventTitle: "Sketchathon",
      subject: "Cancelled Pass",
      type: "confirmation",
      recipientCount: 1,
      recipientEmail: "cancelled@sketch.test",
      status: "cancelled",
      attempts: 0,
      scheduledAt: "2026-11-11T09:00:00Z",
      cancelledAt: "2026-11-11T09:05:00Z",
    },
    {
      id: "job-a",
      eventId: "evt-1",
      eventTitle: "Sketchathon",
      subject: "Archived Sent Pass",
      type: "confirmation",
      recipientCount: 1,
      recipientEmail: "archived@sketch.test",
      status: "sent",
      attempts: 1,
      scheduledAt: "2026-11-10T09:00:00Z",
      deliveredAt: "2026-11-10T09:01:00Z",
      archivedAt: "2026-11-11T10:00:00Z",
    },
  ];

  it("renders all operational filter tabs, selection controls, status badges, and three-dot action triggers", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <CommunicationsClient
        initialJobs={sampleJobs}
        initialEvents={sampleEvents}
        initialParticipants={sampleParticipants}
        isPreview={false}
      />
    );

    // Filter tabs
    expect(html).toContain("All");
    expect(html).toContain("Queued");
    expect(html).toContain("Sent / Accepted");
    expect(html).toContain("Failed");
    expect(html).toContain("Cancelled");
    expect(html).toContain("Archived");

    // Selection toolbar
    expect(html).toContain("Select all in view");
    expect(html).toContain("Select manageable");

    // Active records appear, archived record is separated into Archived tab
    expect(html).toContain("Queued Pass");
    expect(html).toContain("Failed Pass");
    expect(html).toContain("Sent Pass");
    expect(html).toContain("Processing Pass");
    expect(html).toContain("Cancelled Pass");
    expect(html).not.toContain("Archived Sent Pass");

    // Three-dot action triggers present
    expect(html).toContain('aria-label="Actions for Queued Pass"');
    expect(html).toContain('aria-label="Actions for Failed Pass"');
    expect(html).toContain('aria-label="Actions for Sent Pass"');
    expect(html).toContain('aria-label="Actions for Processing Pass"');
  });

  it("renders a helpful empty state when no active dispatches exist", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <CommunicationsClient
        initialJobs={[]}
        initialEvents={sampleEvents}
        initialParticipants={sampleParticipants}
        isPreview={false}
      />
    );

    expect(html).toContain("No active dispatches found");
  });
});
