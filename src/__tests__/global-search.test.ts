import { describe, it, expect, vi, beforeEach } from "vitest";
import { globalSearchAction } from "@/app/actions/search-actions";
import * as sessionModule from "@/lib/auth/session";
import { SketchRepository } from "@/lib/supabase/repository";
import { AdminUser, EventItem, Participant } from "@/types";

describe("Global Search Server Action: Authoritative Organizer Search", () => {
  const mockAdminUser: AdminUser = {
    id: "admin-1",
    name: "Lead Admin",
    email: "admin@sketchhub.internal",
    role: "master_admin",
  };

  const sampleEvents: EventItem[] = [
    {
      id: "ev-1",
      slug: "hackathon-2026",
      title: "Design Hackathon 2026",
      category: "Hackathon",
      shortDescription: "A great hackathon",
      description: "Detailed description",
      startDate: "2026-11-20T09:00:00Z",
      endDate: "2026-11-21T18:00:00Z",
      venue: "Main Hall",
      venueMode: "in-person",
      capacity: 100,
      registeredCount: 40,
      checkedInCount: 10,
      lifecycle: "published",
      registrationState: "open",
      hasTeams: false,
      hasRounds: false,
      posterUrl: "/images/hackathon.jpg",
    },
    {
      id: "ev-2",
      slug: "ai-symposium",
      title: "AI Workshop & Symposium",
      category: "Workshop",
      shortDescription: "Learn AI",
      description: "Deep dive into models",
      startDate: "2026-11-25T10:00:00Z",
      endDate: "2026-11-25T16:00:00Z",
      venue: "Seminar Room 1",
      venueMode: "in-person",
      capacity: 50,
      registeredCount: 15,
      checkedInCount: 0,
      lifecycle: "published",
      registrationState: "open",
      hasTeams: false,
      hasRounds: false,
      posterUrl: "/images/workshop.jpg",
    },
  ];

  const sampleParticipants: Participant[] = [
    {
      id: "part-1",
      registrationId: "REG-2026-001",
      name: "Alice Designer",
      email: "alice@example.com",
      phone: "+919876543210",
      department: "Computer Science",
      year: "3rd Year",
      eventId: "ev-1",
      eventTitle: "Design Hackathon 2026",
      status: "registered",
      attendanceStatus: "not_checked_in",
      registeredAt: "2026-10-05T10:00:00Z",
      qrCredentialId: "QR-PASS-001",
    },
    {
      id: "part-2",
      registrationId: "REG-2026-002",
      name: "Bob Builder",
      email: "bob@example.com",
      phone: "+919876543211",
      department: "Design",
      year: "4th Year",
      eventId: "ev-1",
      eventTitle: "Design Hackathon 2026",
      status: "registered",
      attendanceStatus: "checked_in",
      registeredAt: "2026-10-05T11:00:00Z",
      qrCredentialId: "QR-PASS-002",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("strictly rejects unauthenticated callers", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: false,
      isAdmin: false,
      user: null,
    });

    const result = await globalSearchAction({ query: "hackathon" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("UNAUTHORIZED");
      expect(result.message).toContain("signed in as an administrator");
    }
  });

  it("rejects search queries shorter than 2 characters", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: mockAdminUser,
    });

    const result = await globalSearchAction({ query: "h" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("VALIDATION_FAILED");
      expect(result.message).toContain("at least 2 characters");
    }
  });

  it("rejects search queries exceeding 100 characters", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: mockAdminUser,
    });

    const result = await globalSearchAction({ query: "a".repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("VALIDATION_FAILED");
      expect(result.message).toContain("cannot exceed 100 characters");
    }
  });

  it("successfully searches and returns formatted results for events, participants, and passes", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: mockAdminUser,
    });

    vi.spyOn(SketchRepository, "listEvents").mockResolvedValueOnce(sampleEvents);
    vi.spyOn(SketchRepository, "listParticipants").mockResolvedValueOnce(sampleParticipants);

    const result = await globalSearchAction({ query: "REG-2026" });
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.events.length).toBe(2);
      expect(result.data.participants.length).toBe(2);
      expect(result.data.passes.length).toBe(2); // both match REG-2026
      expect(result.data.totalMatches).toBe(6);
      expect(result.data.passes[0].registrationId).toBe("REG-2026-001");
      expect(result.data.passes[0].qrCredentialId).toBe("QR-PASS-001");
    }
  });

  it("bounds output results to maximum 5 items per category", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: mockAdminUser,
    });

    // Generate 10 events and 10 participants
    const tenEvents: EventItem[] = Array.from({ length: 10 }).map((_, i) => ({
      ...sampleEvents[0],
      id: `ev-${i}`,
      title: `Hackathon Event ${i}`,
    }));
    const tenParticipants: Participant[] = Array.from({ length: 10 }).map((_, i) => ({
      ...sampleParticipants[0],
      id: `part-${i}`,
      registrationId: `REG-2026-00${i}`,
      qrCredentialId: `QR-PASS-00${i}`,
      name: `User ${i}`,
    }));

    vi.spyOn(SketchRepository, "listEvents").mockResolvedValueOnce(tenEvents);
    vi.spyOn(SketchRepository, "listParticipants").mockResolvedValueOnce(tenParticipants);

    const result = await globalSearchAction({ query: "REG-2026" });
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.events.length).toBe(5);
      expect(result.data.participants.length).toBe(5);
      expect(result.data.passes.length).toBe(5);
      expect(result.data.totalMatches).toBe(15);
    }
  });

  it("gracefully catches repository exceptions and returns SEARCH_FAILED", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: mockAdminUser,
    });

    vi.spyOn(SketchRepository, "listEvents").mockRejectedValueOnce(new Error("Database connection timed out"));

    const result = await globalSearchAction({ query: "hackathon" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("SEARCH_FAILED");
    }
  });
});
