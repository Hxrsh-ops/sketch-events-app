"use client";

import {
  EventItem,
  Participant,
  Team,
  RegistrationSubmission,
  TeamMemberSubmission,
} from "@/types";
import {
  MOCK_EVENTS,
  MOCK_PARTICIPANTS,
  MOCK_TEAMS,
} from "@/lib/mock-data";

const STORAGE_KEY_EVENTS = "sketch_preview_events_v1";
const STORAGE_KEY_SUBMISSIONS = "sketch_preview_submissions_v1";
const STORAGE_KEY_ATTENDANCE_OVERRIDE = "sketch_preview_attendance_v1";

/**
 * Checks if browser localStorage is available
 */
function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__sketch_storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// In-memory runtime cache for seamless operation across renders
let memoryEvents: EventItem[] = [...MOCK_EVENTS];
let memorySubmissions: RegistrationSubmission[] = [];
let memoryAttendanceOverrides: Record<string, { status: "checked_in" | "not_checked_in"; timestamp?: string }> = {};

/**
 * Notify all subscribed React components that store data has changed
 */
function notifySubscribers() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sketch_store_updated"));
  }
}

/**
 * Initialize storage with default mock records if uninitialized
 */
function readStorage<T>(key: string, fallback: T): T {
  if (!isStorageAvailable()) return fallback;
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`[SKETCH Storage] Error reading key "${key}":`, err);
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[SKETCH Storage] Error writing key "${key}":`, err);
  }
}

// ==========================================
// EVENTS REPOSITORY
// ==========================================

export function getStoredEvents(): EventItem[] {
  if (typeof window === "undefined") return MOCK_EVENTS;
  const storedCustom = readStorage<EventItem[]>(STORAGE_KEY_EVENTS, []);
  
  // Merge stored custom events with base mock events (custom events at top)
  const baseMap = new Map<string, EventItem>();
  MOCK_EVENTS.forEach((e) => baseMap.set(e.id, e));
  storedCustom.forEach((e) => baseMap.set(e.id, e));

  const all = Array.from(baseMap.values());
  memoryEvents = all;
  return all;
}

export function saveEvent(eventItem: EventItem): void {
  const currentEvents = getStoredEvents();
  const existingIdx = currentEvents.findIndex((e) => e.id === eventItem.id);
  
  let nextEvents: EventItem[];
  if (existingIdx >= 0) {
    nextEvents = [...currentEvents];
    nextEvents[existingIdx] = eventItem;
  } else {
    nextEvents = [eventItem, ...currentEvents];
  }

  // Also push to runtime MOCK_EVENTS for server components / fallbacks
  const mockIdx = MOCK_EVENTS.findIndex((e) => e.id === eventItem.id);
  if (mockIdx >= 0) {
    MOCK_EVENTS[mockIdx] = eventItem;
  } else {
    MOCK_EVENTS.unshift(eventItem);
  }

  memoryEvents = nextEvents;
  writeStorage(STORAGE_KEY_EVENTS, nextEvents);
  notifySubscribers();
}

export function getEventBySlugOrId(slugOrId: string): EventItem | undefined {
  const events = getStoredEvents();
  return (
    events.find(
      (e) =>
        e.slug === slugOrId ||
        e.slug === slugOrId.replace("sketch-", "") ||
        e.id === slugOrId
    ) || events[0]
  );
}

// ==========================================
// REGISTRATION SUBMISSIONS REPOSITORY
// ==========================================

export function getStoredSubmissions(eventId?: string): RegistrationSubmission[] {
  if (typeof window === "undefined") return memorySubmissions;
  const submissions = readStorage<RegistrationSubmission[]>(STORAGE_KEY_SUBMISSIONS, memorySubmissions);
  memorySubmissions = submissions;

  if (eventId && eventId !== "all") {
    return submissions.filter((s) => s.eventId === eventId);
  }
  return submissions;
}

export function saveSubmission(submission: RegistrationSubmission): void {
  const current = getStoredSubmissions();
  const next = [submission, ...current];
  memorySubmissions = next;
  writeStorage(STORAGE_KEY_SUBMISSIONS, next);

  // Update Event Registered Count in store
  const allEvents = getStoredEvents();
  const targetEvent = allEvents.find((e) => e.id === submission.eventId);
  if (targetEvent) {
    const updatedEvent: EventItem = {
      ...targetEvent,
      registeredCount: (targetEvent.registeredCount || 0) + (submission.teamMembers ? submission.teamMembers.length + 1 : 1),
    };
    saveEvent(updatedEvent);
  }

  notifySubscribers();
}

// ==========================================
// PARTICIPANTS REPOSITORY (MOCK + DYNAMIC)
// ==========================================

export function getAllParticipants(eventId?: string): Participant[] {
  const submissions = getStoredSubmissions();
  const attendanceOverrides = readStorage<Record<string, { status: "checked_in" | "not_checked_in"; timestamp?: string }>>(
    STORAGE_KEY_ATTENDANCE_OVERRIDE,
    memoryAttendanceOverrides
  );

  // Convert submissions into Participant records
  const dynamicParticipants: Participant[] = [];

  submissions.forEach((sub) => {
    // Primary / Captain participant
    const primaryId = `part-${sub.registrationId}`;
    const primaryOverride = attendanceOverrides[primaryId] || attendanceOverrides[sub.registrationId];
    
    dynamicParticipants.push({
      id: primaryId,
      registrationId: sub.registrationId,
      eventId: sub.eventId,
      eventTitle: sub.eventTitle,
      name: sub.attendeeName,
      email: sub.email,
      phone: sub.phone || (sub.answers["phone"] as string) || undefined,
      department: sub.department || (sub.answers["department"] as string) || "General / Interdisciplinary",
      year: sub.year || (sub.answers["year"] as string) || "Undergraduate",
      teamId: sub.teamName ? `team-${sub.registrationId}` : undefined,
      teamName: sub.teamName || undefined,
      registeredAt: sub.submittedAt,
      status: sub.status,
      attendanceStatus: primaryOverride ? primaryOverride.status : sub.attendanceStatus,
      checkedInAt: primaryOverride ? primaryOverride.timestamp : sub.checkedInAt,
      qrCredentialId: sub.qrCredentialId,
      customAnswers: sub.answers,
    });

    // Team members if present
    if (sub.teamMembers && sub.teamMembers.length > 0) {
      sub.teamMembers.forEach((member, mIdx) => {
        const memberId = `part-${sub.registrationId}-m${mIdx + 1}`;
        const memberOverride = attendanceOverrides[memberId];

        dynamicParticipants.push({
          id: memberId,
          registrationId: `${sub.registrationId}-M${mIdx + 1}`,
          eventId: sub.eventId,
          eventTitle: sub.eventTitle,
          name: member.name,
          email: member.email,
          phone: member.phone || undefined,
          department: member.department || sub.department || "General",
          year: sub.year || "Undergraduate",
          teamId: `team-${sub.registrationId}`,
          teamName: sub.teamName,
          registeredAt: sub.submittedAt,
          status: sub.status,
          attendanceStatus: memberOverride ? memberOverride.status : "not_checked_in",
          checkedInAt: memberOverride ? memberOverride.timestamp : undefined,
          qrCredentialId: `${sub.qrCredentialId}_m${mIdx + 1}`,
          customAnswers: member.customAnswers || sub.answers,
        });
      });
    }
  });

  // Combine dynamic participants with base mock participants, applying attendance overrides
  const combined = [...dynamicParticipants, ...MOCK_PARTICIPANTS.map((p) => {
    const override = attendanceOverrides[p.id];
    if (override) {
      return {
        ...p,
        attendanceStatus: override.status,
        checkedInAt: override.timestamp,
      };
    }
    return p;
  })];

  if (eventId && eventId !== "all") {
    return combined.filter((p) => p.eventId === eventId);
  }
  return combined;
}

// ==========================================
// TEAMS REPOSITORY (MOCK + DYNAMIC)
// ==========================================

export function getAllTeams(eventId?: string): Team[] {
  const submissions = getStoredSubmissions().filter((s) => s.mode === "team" || Boolean(s.teamName));

  const dynamicTeams: Team[] = submissions.map((sub) => {
    const memberCount = (sub.teamMembers?.length || 0) + 1;
    const maxMembers = Math.max(memberCount, 3);

    return {
      id: `team-${sub.registrationId}`,
      eventId: sub.eventId,
      eventTitle: sub.eventTitle,
      name: sub.teamName || `${sub.attendeeName}'s Team`,
      captainName: sub.attendeeName,
      captainEmail: sub.email,
      memberCount,
      maxMembers,
      status: memberCount >= 2 ? "complete" : "incomplete",
      registeredAt: sub.submittedAt,
      customAnswers: sub.answers,
      members: [
        {
          name: sub.attendeeName,
          email: sub.email,
          role: "Team Captain / Leader",
          department: sub.department,
          phone: sub.phone,
          customAnswers: sub.answers,
        },
        ...(sub.teamMembers || []),
      ],
    };
  });

  const combined = [...dynamicTeams, ...MOCK_TEAMS];

  if (eventId && eventId !== "all") {
    return combined.filter((t) => t.eventId === eventId);
  }
  return combined;
}

// ==========================================
// ATTENDANCE UPDATE HELPER
// ==========================================

export function updateParticipantAttendance(
  participantId: string,
  newStatus: "checked_in" | "not_checked_in"
): void {
  const overrides = readStorage<Record<string, { status: "checked_in" | "not_checked_in"; timestamp?: string }>>(
    STORAGE_KEY_ATTENDANCE_OVERRIDE,
    memoryAttendanceOverrides
  );

  overrides[participantId] = {
    status: newStatus,
    timestamp: newStatus === "checked_in" ? new Date().toISOString() : undefined,
  };

  memoryAttendanceOverrides = overrides;
  writeStorage(STORAGE_KEY_ATTENDANCE_OVERRIDE, overrides);
  notifySubscribers();
}

// ==========================================
// CHECK-IN AUDIT LOG REPOSITORY
// ==========================================

export interface CheckInLogEntry {
  id: string;
  participantId: string;
  participantName: string;
  registrationId: string;
  eventId: string;
  timestamp: string;
  method: "camera" | "manual" | "simulation";
}

export const INITIAL_CHECKIN_LOG: CheckInLogEntry[] = [
  {
    id: "log-init-1",
    participantId: "part-07",
    participantName: "Vikram Malhotra",
    registrationId: "REG-2026-8814",
    eventId: "evt-01",
    timestamp: "10 mins ago",
    method: "camera",
  },
];

const STORAGE_KEY_CHECKIN_LOG = "sketch_preview_checkin_log_v1";
let memoryCheckInLog: CheckInLogEntry[] = [...INITIAL_CHECKIN_LOG];

export function getStoredCheckInLog(): CheckInLogEntry[] {
  if (typeof window === "undefined") return INITIAL_CHECKIN_LOG;
  const stored = readStorage<CheckInLogEntry[]>(STORAGE_KEY_CHECKIN_LOG, memoryCheckInLog);
  memoryCheckInLog = stored;
  return stored;
}

export function saveCheckInLog(log: CheckInLogEntry[]): void {
  memoryCheckInLog = log;
  writeStorage(STORAGE_KEY_CHECKIN_LOG, log);
  notifySubscribers();
}
