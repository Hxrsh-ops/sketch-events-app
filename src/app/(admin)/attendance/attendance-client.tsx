"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Camera,
  RotateCcw,
  Clock,
  UserCheck,
  Users,
  ShieldCheck,
  ChevronRight,
  Eye,
  Undo2,
  Sparkles,
  VideoOff,
  Flashlight,
  ExternalLink,
  Building2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Check,
  RefreshCw,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { SlideOver } from "@/components/ui/slide-over";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import {
  getStoredEvents,
  getAllParticipants,
  updateParticipantAttendance,
  getStoredCheckInLog,
  saveCheckInLog,
  CheckInLogEntry,
  INITIAL_CHECKIN_LOG,
} from "@/lib/registration-store";
import { MOCK_EVENTS, MOCK_PARTICIPANTS } from "@/lib/mock-data";
import { Participant, EventItem } from "@/types";
import { toggleAttendanceAction } from "@/app/actions/participant-actions";

interface ScanOutcome {
  status: "idle" | "accepted" | "already_checked_in" | "not_found";
  message: string;
  participant?: Participant;
  method?: "camera" | "manual" | "simulation";
  timestamp?: string;
}

interface AttendanceClientProps {
  initialEvents: EventItem[];
  initialParticipants: Participant[];
  initialError?: string | null;
  isPreview: boolean;
}

function playDeskBeep(type: "success" | "error" | "warning") {
  if (typeof window === "undefined") return;
  const isAudioEnabled = localStorage.getItem("sketch_attendance_audio") !== "false";
  if (!isAudioEnabled) return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "warning") {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Audio tone suppressed
  }
}

export default function AttendanceClient({
  initialEvents,
  initialParticipants,
  initialError = null,
  isPreview,
}: AttendanceClientProps) {
  const [events, setEvents] = useState<EventItem[]>(
    initialEvents.length > 0 ? initialEvents : (isPreview ? MOCK_EVENTS : [])
  );
  const [selectedEventId, setSelectedEventId] = useState(
    initialEvents[0]?.id || (isPreview ? MOCK_EVENTS[0]?.id : "") || ""
  );
  const [error] = useState<string | null>(initialError);
  const [participants, setParticipants] = useState<Participant[]>(
    initialParticipants.length > 0 ? initialParticipants : (isPreview ? MOCK_PARTICIPANTS : [])
  );
  const [manualQuery, setManualQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [inspectorParticipant, setInspectorParticipant] = useState<Participant | null>(null);
  const [checkInLog, setCheckInLog] = useState<CheckInLogEntry[]>(
    isPreview ? INITIAL_CHECKIN_LOG : []
  );

  useEffect(() => {
    // In preview mode or client updates, synchronize preview store
    if (isPreview) {
      setEvents(getStoredEvents());
      setParticipants(getAllParticipants());
      setCheckInLog(getStoredCheckInLog());

      const handleUpdate = () => {
        setEvents(getStoredEvents());
        setParticipants(getAllParticipants());
        setCheckInLog(getStoredCheckInLog());
      };
      window.addEventListener("sketch_store_updated", handleUpdate);
      return () => window.removeEventListener("sketch_store_updated", handleUpdate);
    }
  }, [isPreview]);

  // Camera stream state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const [scanOutcome, setScanOutcome] = useState<ScanOutcome>({
    status: "idle",
    message: "Ready to scan. Align participant QR pass or search by registration ID.",
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0] || null;

  // Stop camera tracks helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsCameraActive(false);
    setIsScanningActive(false);
    setTorchEnabled(false);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Enumerate video devices
  const enumerateCameras = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          // Prefer back/environment camera if present
          const backCam = videoInputs.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("environment") ||
              d.label.toLowerCase().includes("rear")
          );
          setSelectedDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId);
        }
      }
    } catch {
      // Ignored if permissions not granted yet
    }
  };

  // Start Camera Stream
  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    stopCameraStream();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported by your current browser context.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setIsScanningActive(true);
      await enumerateCameras();

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as { torch?: boolean } | undefined;
        setTorchSupported(Boolean(capabilities?.torch));
      }

      // Start barcode detection loop if native BarcodeDetector is available
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          // @ts-expect-error - BarcodeDetector might not be in standard TypeScript lib
          const barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13"] });
          scanIntervalRef.current = window.setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue;
                  handleCodeDetected(rawValue, "camera");
                }
              } catch {
                // Ignore frame read failures
              }
            }
          }, 600);
        } catch {
          // BarcodeDetector setup skipped
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setIsCameraActive(false);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera access in your browser settings or use manual lookup.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError("No camera input device was found on this workstation.");
      } else {
        setCameraError(error.message || "Failed to initialize camera video stream.");
      }
    }
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchEnabled;
        // @ts-expect-error - applyConstraints with torch
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchEnabled(nextState);
      } catch {
        // Torch toggle failed
      }
    }
  };

  // Switch active camera
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isCameraActive) {
      startCamera(deviceId);
    }
  };

  // Core Check-in Execution Logic with authoritative Server Action
  const handleCodeDetected = async (
    code: string,
    method: "camera" | "manual" | "simulation" = "manual"
  ) => {
    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode) return;

    // Find participant matching registration ID, email, qrCredentialId, or name
    const found = participants.find(
      (p) =>
        p.eventId === selectedEventId &&
        (p.registrationId.toLowerCase() === cleanCode ||
          p.email.toLowerCase() === cleanCode ||
          p.qrCredentialId.toLowerCase() === cleanCode ||
          p.name.toLowerCase() === cleanCode)
    );

    // If not found in current event, check if registered for a different event
    if (!found) {
      playDeskBeep("error");
      const otherEventMatch = participants.find(
        (p) =>
          p.registrationId.toLowerCase() === cleanCode ||
          p.email.toLowerCase() === cleanCode ||
          p.qrCredentialId.toLowerCase() === cleanCode
      );

      if (otherEventMatch) {
        setScanOutcome({
          status: "not_found",
          message: `Pass belongs to "${otherEventMatch.eventTitle}", not "${selectedEvent?.title || "the selected event"}". Switch event selector to check in.`,
          method,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      } else {
        setScanOutcome({
          status: "not_found",
          message: `No participant matching "${code}" was found for ${selectedEvent?.title || "the selected event"}.`,
          method,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }
      return;
    }

    // Already checked in
    if (found.attendanceStatus === "checked_in") {
      playDeskBeep("warning");
      setScanOutcome({
        status: "already_checked_in",
        message: `Already checked in at ${found.checkedInAt ? new Date(found.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "earlier today"}. Entry already validated.`,
        participant: found,
        method,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      return;
    }

    // Call authoritative Server Action
    const res = await toggleAttendanceAction({
      registrationIdOrUid: found.registrationId || found.id,
      eventId: selectedEventId,
      targetStatus: "checked_in",
    });

    if (!res.success) {
      playDeskBeep("error");
      setScanOutcome({
        status: "not_found",
        message: res.message || "Failed to validate check-in.",
        method,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      return;
    }

    // Success check-in
    playDeskBeep("success");
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("sketch_attendance_auto_advance") === "false" &&
      method === "camera"
    ) {
      stopCameraStream();
    }

    const nowIso = res.data?.checkedInAt || new Date().toISOString();
    updateParticipantAttendance(found.id, "checked_in");

    const updatedFound: Participant = {
      ...found,
      attendanceStatus: "checked_in",
      checkedInAt: nowIso,
    };

    setParticipants((prev) =>
      prev.map((p) => (p.id === found.id ? updatedFound : p))
    );

    setScanOutcome({
      status: "accepted",
      message: `Access Granted! Participant verified for ${selectedEvent?.title || "event"}.`,
      participant: updatedFound,
      method,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    // Add entry to audit log
    const newLogEntry: CheckInLogEntry = {
      id: `log-${Date.now()}`,
      participantId: found.id,
      participantName: found.name,
      registrationId: found.registrationId,
      eventId: selectedEventId,
      timestamp: "Just now",
      method,
    };
    setCheckInLog((prev) => {
      const updated = [newLogEntry, ...prev.slice(0, 19)];
      saveCheckInLog(updated);
      return updated;
    });
  };

  // Manual search submit
  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    handleCodeDetected(manualQuery, "manual");
  };

  // Toggle individual check-in directly from table or inspector
  const toggleParticipantCheckIn = async (participant: Participant) => {
    const isCheckedIn = participant.attendanceStatus === "checked_in";
    const nextStatus = isCheckedIn ? ("not_checked_in" as const) : ("checked_in" as const);
    const nowIso = nextStatus === "checked_in" ? new Date().toISOString() : undefined;

    // Optimistic local state update
    updateParticipantAttendance(participant.id, nextStatus);
    setParticipants((prev) =>
      prev.map((p) => (p.id === participant.id ? { ...p, attendanceStatus: nextStatus, checkedInAt: nowIso } : p))
    );

    if (inspectorParticipant && inspectorParticipant.id === participant.id) {
      setInspectorParticipant({
        ...inspectorParticipant,
        attendanceStatus: nextStatus,
        checkedInAt: nowIso,
      });
    }

    const res = await toggleAttendanceAction({
      registrationIdOrUid: participant.registrationId || participant.id,
      eventId: selectedEventId,
      targetStatus: nextStatus,
    });

    if (!res.success) {
      // Revert optimistic update
      updateParticipantAttendance(participant.id, participant.attendanceStatus);
      setParticipants((prev) =>
        prev.map((p) => (p.id === participant.id ? participant : p))
      );
      if (inspectorParticipant && inspectorParticipant.id === participant.id) {
        setInspectorParticipant(participant);
      }
      alert(res.message || "Failed to update attendance.");
      return;
    }

    if (nextStatus === "checked_in") {
      setScanOutcome({
        status: "accepted",
        message: `Verified and checked in via manual roster.`,
        participant: { ...participant, attendanceStatus: nextStatus, checkedInAt: nowIso },
        method: "manual",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      const newLogEntry: CheckInLogEntry = {
        id: `log-${Date.now()}`,
        participantId: participant.id,
        participantName: participant.name,
        registrationId: participant.registrationId,
        eventId: selectedEventId,
        timestamp: "Just now",
        method: "manual",
      };
      setCheckInLog((prev) => {
        const updated = [newLogEntry, ...prev.slice(0, 19)];
        saveCheckInLog(updated);
        return updated;
      });
    } else {
      setScanOutcome({
        status: "idle",
        message: `Check-in cancelled for ${participant.name}.`,
      });
      setCheckInLog((prev) => {
        const updated = prev.filter((item) => item.participantId !== participant.id);
        saveCheckInLog(updated);
        return updated;
      });
    }
  };

  // Undo check-in from audit log
  const handleUndoCheckIn = async (participantId: string) => {
    updateParticipantAttendance(participantId, "not_checked_in");
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, attendanceStatus: "not_checked_in", checkedInAt: undefined } : p))
    );
    setCheckInLog((prev) => {
      const updated = prev.filter((item) => item.participantId !== participantId);
      saveCheckInLog(updated);
      return updated;
    });

    await toggleAttendanceAction({
      registrationIdOrUid: participantId,
      eventId: selectedEventId,
      targetStatus: "not_checked_in",
    });

    if (scanOutcome.participant?.id === participantId) {
      setScanOutcome({
        status: "idle",
        message: "Check-in was reverted successfully.",
      });
    }
  };

  // Filtered participants for current event & search & tabs
  const eventParticipants = participants.filter((p) => p.eventId === selectedEventId);
  const totalEligible = eventParticipants.length;
  const checkedInCount = eventParticipants.filter((p) => p.attendanceStatus === "checked_in").length;
  const remainingCount = totalEligible - checkedInCount;
  const attendanceRate = totalEligible > 0 ? Math.round((checkedInCount / totalEligible) * 100) : 0;

  const filteredRoster = eventParticipants.filter((p) => {
    const matchesQuery =
      p.name.toLowerCase().includes(manualQuery.toLowerCase()) ||
      p.registrationId.toLowerCase().includes(manualQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(manualQuery.toLowerCase()) ||
      (p.teamName && p.teamName.toLowerCase().includes(manualQuery.toLowerCase())) ||
      (p.department && p.department.toLowerCase().includes(manualQuery.toLowerCase()));

    if (!matchesQuery) return false;
    if (activeTab === "pending") return p.attendanceStatus === "not_checked_in";
    if (activeTab === "checked_in") return p.attendanceStatus === "checked_in";
    return true;
  });

  const eventOptions = events.length > 0
    ? events.map((e) => ({
        value: e.id,
        label: `${e.title} (${e.category})`,
      }))
    : [{ value: "", label: "No events available" }];

  const cameraOptions =
    availableDevices.length > 0
      ? availableDevices.map((d, index) => ({
          value: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }))
      : [{ value: "default", label: "Default System Camera" }];

  return (
    <div className="flex flex-col space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Live Attendance Desk
            </h1>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase tracking-wider font-semibold ${
                isPreview
                  ? "border-[#E5E7EA] dark:border-[#30353A] text-[#656B73] dark:text-[#A6ADB5]"
                  : "border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
              }`}
            >
              {isPreview ? "Preview Mode" : "Production Live"}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#65666B] dark:text-[#989EA7]">
            High-speed camera QR scanner, pass verification inspector, and audited manual fallback ledger.
          </p>
        </div>

        {/* Event Scope Switcher */}
        <div className="w-full sm:w-80">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73] mb-1">
            Active Event Scope
          </label>
          <CustomSelect
            options={eventOptions}
            value={selectedEventId}
            disabled={events.length === 0}
            onChange={(val) => {
              setSelectedEventId(val);
              setScanOutcome({
                status: "idle",
                message: "Switched event scope. Ready to scan or search attendees.",
              });
            }}
          />
        </div>
      </div>

      {/* Production Database Error Banner (Never silently hides) */}
      {error && (
        <div
          role="alert"
          className="rounded-[20px] border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-5 shadow-sm text-rose-900 dark:text-rose-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs space-y-1">
              <h3 className="font-bold text-sm">Database Connection Error</h3>
              <p className="text-rose-800 dark:text-rose-300">
                Unable to load live attendance records from the persistent database: <code className="bg-rose-100 dark:bg-rose-900/60 px-1 py-0.5 rounded font-mono">{error}</code>
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 pt-1">
                Notice: Mock attendance data is strictly not substituted in production to preserve data integrity.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="rounded-full text-xs font-semibold gap-1.5 border-rose-300 dark:border-rose-800"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      )}

      {/* Empty State Banner when no events exist and no error */}
      {!error && events.length === 0 && (
        <div className="rounded-[20px] border border-dashed border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-8 text-center shadow-sm space-y-3">
          <Users className="mx-auto h-8 w-8 text-[#8A9098] dark:text-[#656B73] opacity-60" />
          <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">No Active Events Found</h3>
          <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] max-w-md mx-auto">
            Attendance check-in requires at least one active event. Create an event to begin check-in operations.
          </p>
          <Link href="/events/new">
            <Button variant="charcoal" size="sm" className="rounded-full text-xs font-semibold mt-2 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Event</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Operational Attendance Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Metric 1: Total Expected */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Total Expected</span>
            <Users className="h-4 w-4 text-[#8A9098] dark:text-[#656B73]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#17191C] dark:text-[#F1F2F3]">
              {totalEligible}
            </span>
            <span className="text-xs text-[#8A9098] dark:text-[#656B73]">Registered</span>
          </div>
          {selectedEvent ? (
            <p className="mt-1 text-[11px] text-[#8A9098] dark:text-[#656B73] truncate">{selectedEvent.title}</p>
          ) : (
            <p className="mt-1 text-[11px] text-[#8A9098] dark:text-[#656B73] italic">No event selected</p>
          )}
        </div>

        {/* Metric 2: Checked In */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Checked In</span>
            <UserCheck className="h-4 w-4 text-[#17191C] dark:text-[#E8EAED]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#17191C] dark:text-[#F1F2F3]">
              {checkedInCount}
            </span>
            <span className="text-xs font-medium text-[#656B73] dark:text-[#989EA7]">passes</span>
          </div>
          <p className="mt-1 text-[11px] text-[#8A9098] dark:text-[#656B73]">
            Verified at terminal
          </p>
        </div>

        {/* Metric 3: Remaining */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Pending Arrival</span>
            <Clock className="h-4 w-4 text-[#8A9098] dark:text-[#656B73]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#17191C] dark:text-[#F1F2F3]">
              {remainingCount}
            </span>
            <span className="text-xs text-[#8A9098] dark:text-[#656B73]">remaining</span>
          </div>
          <p className="mt-1 text-[11px] text-[#8A9098] dark:text-[#656B73]">Awaiting scan / lookup</p>
        </div>

        {/* Metric 4: Turnout Rate */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Attendance Rate</span>
            <ShieldCheck className="h-4 w-4 text-[#17191C] dark:text-[#E8EAED]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#17191C] dark:text-[#F1F2F3]">
              {attendanceRate}%
            </span>
            <span className="text-xs text-[#8A9098] dark:text-[#656B73]">turnout</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1F2] dark:bg-[#151719]">
            <div
              className="h-full bg-[#25292F] dark:bg-[#E8EAED] transition-all duration-500 rounded-full"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Camera Scanner & Verification Outcome (7 cols) */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          {/* Scanner Card */}
          <div className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E5E7EA] dark:border-[#30353A]">
              <div>
                <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Camera QR Scanner
                </h2>
                <p className="text-xs text-[#656B73] dark:text-[#989EA7]">
                  Point device camera at participant mobile pass or printed QR badge.
                </p>
              </div>

              {/* Camera Action Controls */}
              <div className="flex items-center gap-2">
                {isCameraActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={stopCameraStream}
                    className="rounded-full text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] border-[#E5E7EA] dark:border-[#30353A] hover:bg-[#F4F5F6] dark:hover:bg-[#151719]"
                  >
                    <VideoOff className="h-3.5 w-3.5 mr-1.5" />
                    Stop Camera
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="charcoal"
                    size="sm"
                    onClick={() => startCamera(selectedDeviceId)}
                    className="rounded-full text-xs font-semibold"
                  >
                    <Camera className="h-3.5 w-3.5 mr-1.5" />
                    Start Camera
                  </Button>
                )}

                {torchSupported && isCameraActive && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleTorch}
                    className={`rounded-full text-xs ${torchEnabled ? "bg-[#17191C] dark:bg-[#E8EAED] text-white dark:text-[#111315]" : ""}`}
                    aria-label="Toggle flashlight torch"
                  >
                    <Flashlight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Video Viewfinder Area */}
            <div className="relative my-4 flex flex-col items-center justify-center rounded-2xl bg-[#17191C] text-white min-h-[320px] sm:min-h-[360px] overflow-hidden">
              {/* Background ambient texture */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />

              {/* Live Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${
                  isCameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              />

              {/* Viewfinder Target Reticle HUD */}
              <div className="relative z-10 flex h-56 w-56 sm:h-64 sm:w-64 items-center justify-center rounded-3xl border border-white/20 bg-black/30 backdrop-blur-[2px] p-4">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-white rounded-tl-xl" />
                <div className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-white rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white rounded-br-xl" />

                {/* Laser Scanning Indicator */}
                {isCameraActive && isScanningActive && (
                  <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
                )}

                {/* Center Icon when idle */}
                {!isCameraActive && (
                  <div className="flex flex-col items-center text-center p-4">
                    <QrCode className="h-14 w-14 text-white/30 mb-2" />
                    <span className="text-xs font-medium text-white/70">Camera is paused</span>
                    <span className="text-[11px] text-white/40 mt-1">
                      Click &ldquo;Start Camera&rdquo; above or test simulated pass below
                    </span>
                  </div>
                )}
              </div>

              {/* Error Notice */}
              {cameraError && (
                <div className="absolute bottom-4 left-4 right-4 z-20 rounded-xl bg-black/80 border border-white/20 p-3 text-xs text-white/90 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-white/80" />
                  <p>{cameraError}</p>
                </div>
              )}

              {/* Camera active status watermark */}
              {isCameraActive && (
                <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2 text-[11px] font-mono text-white/70">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  <span>LIVE FEED • 1080p SCANNER ACTIVE</span>
                </div>
              )}
            </div>

            {/* Camera Settings / Switcher Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#656B73] dark:text-[#989EA7] pt-2">
              <div className="flex items-center gap-2 w-full sm:w-64">
                <span className="shrink-0 font-medium">Device:</span>
                <CustomSelect
                  options={cameraOptions}
                  value={selectedDeviceId || "default"}
                  onChange={handleDeviceChange}
                  className="w-full text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (availableDevices.length > 1) {
                    const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId);
                    const nextIndex = (currentIndex + 1) % availableDevices.length;
                    handleDeviceChange(availableDevices[nextIndex].deviceId);
                  } else {
                    startCamera(selectedDeviceId);
                  }
                }}
                className="inline-flex items-center gap-1.5 font-semibold text-[#17191C] dark:text-[#F1F2F3] hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Cycle Camera Device</span>
              </button>
            </div>

            {/* Quick Test Simulation Pass Scans (For Testing without physical barcode prints) */}
            <div className="mt-5 pt-4 border-t border-[#E5E7EA] dark:border-[#30353A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73] flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Simulate QR Pass Scan (Testing Action)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {eventParticipants.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleCodeDetected(p.registrationId, "simulation")}
                    className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#151719] px-3 py-1 text-xs font-medium text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#EAECEF] dark:hover:bg-[#22262A] transition-colors"
                  >
                    <span>{p.name.split(" ")[0]}</span>
                    <span className="font-mono text-[10px] text-[#8A9098] dark:text-[#656B73]">({p.registrationId.replace("REG-2026-", "")})</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleCodeDetected("REG-INVALID-9999", "simulation")}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#D4D7DC] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] px-3 py-1 text-xs font-medium text-[#656B73] dark:text-[#989EA7] hover:bg-[#F4F5F6] dark:hover:bg-[#151719] transition-colors"
                >
                  <span>Test Invalid Ticket</span>
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Verification Outcome Card */}
          <div className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EA] dark:border-[#30353A]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">
                Credential Verification Outcome
              </h3>
              {scanOutcome.timestamp && (
                <span className="text-[11px] font-mono text-[#8A9098] dark:text-[#656B73]">
                  Scanned at {scanOutcome.timestamp}
                </span>
              )}
            </div>

            <div className="mt-4">
              {/* Outcome: ACCEPTED */}
              {scanOutcome.status === "accepted" && scanOutcome.participant && (
                <div className="rounded-2xl border border-[#17191C] dark:border-[#30353A] bg-[#17191C] dark:bg-[#151719] text-white p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#E8EAED] text-[#17191C]">
                        <Check className="h-5 w-5 stroke-[3]" />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold uppercase tracking-wide">
                          Access Granted • Valid Ticket
                        </div>
                        <div className="text-xs text-white/70">
                          {scanOutcome.message}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/20 text-[10px]">
                      {scanOutcome.method?.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Attendee Details Grid */}
                  <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
                    <div>
                      <span className="text-white/50 text-[10px] uppercase font-mono">Attendee Name</span>
                      <strong className="text-sm text-white font-bold block">{scanOutcome.participant.name}</strong>
                    </div>
                    <div>
                      <span className="text-white/50 text-[10px] uppercase font-mono">Registration ID</span>
                      <strong className="font-mono text-white text-xs block">{scanOutcome.participant.registrationId}</strong>
                    </div>
                    <div>
                      <span className="text-white/50 text-[10px] uppercase font-mono">Team / Affiliation</span>
                      <span className="text-white/90 block">{scanOutcome.participant.teamName || "Individual Participant"}</span>
                    </div>
                    <div>
                      <span className="text-white/50 text-[10px] uppercase font-mono">Department</span>
                      <span className="text-white/90 block">{scanOutcome.participant.department || "General"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectorParticipant(scanOutcome.participant || null)}
                      className="rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Inspect Full Pass
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleUndoCheckIn(scanOutcome.participant!.id)}
                      className="text-xs text-white/60 hover:text-white underline inline-flex items-center gap-1"
                    >
                      <Undo2 className="h-3 w-3" />
                      Undo Check-in
                    </button>
                  </div>
                </div>
              )}

              {/* Outcome: ALREADY CHECKED IN */}
              {scanOutcome.status === "already_checked_in" && scanOutcome.participant && (
                <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#151719] p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#17191C] dark:text-[#F1F2F3]">
                    <AlertCircle className="h-5 w-5 text-[#17191C] dark:text-[#E8EAED]" />
                    <span>Already Checked In</span>
                  </div>
                  <p className="text-xs text-[#656B73] dark:text-[#989EA7]">{scanOutcome.message}</p>
                  <div className="text-xs border-t border-[#E5E7EA] dark:border-[#262A2E] pt-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">{scanOutcome.participant.name}</span>
                      <span className="font-mono text-[#8A9098] dark:text-[#656B73] ml-2">({scanOutcome.participant.registrationId})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectorParticipant(scanOutcome.participant || null)}
                        className="rounded-full text-xs h-7 border-[#E5E7EA] dark:border-[#30353A]"
                      >
                        Inspect
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUndoCheckIn(scanOutcome.participant!.id)}
                        className="text-xs h-7 text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
                      >
                        Reset Status
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Outcome: NOT FOUND */}
              {scanOutcome.status === "not_found" && (
                <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#151719] p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#17191C] dark:text-[#F1F2F3]">
                    <AlertCircle className="h-5 w-5 text-[#17191C] dark:text-[#E8EAED]" />
                    <span>Verification Failed / Pass Not Found</span>
                  </div>
                  <p className="text-xs text-[#656B73] dark:text-[#989EA7]">{scanOutcome.message}</p>
                  <p className="text-[11px] text-[#8A9098] dark:text-[#656B73]">
                    Tip: Search participant by full student name or university email address in the manual roster on the right.
                  </p>
                </div>
              )}

              {/* Outcome: IDLE */}
              {scanOutcome.status === "idle" && (
                <div className="rounded-2xl bg-[#F4F5F6] dark:bg-[#151719] border border-transparent dark:border-[#30353A] p-8 text-center text-xs text-[#8A9098] dark:text-[#656B73] flex flex-col items-center justify-center">
                  <Clock className="h-8 w-8 text-[#D4D7DC] dark:text-[#30353A] mb-2" />
                  <span className="font-medium text-[#656B73] dark:text-[#989EA7]">{scanOutcome.message}</span>
                  <span className="text-[11px] text-[#8A9098] dark:text-[#656B73] mt-1">
                    Terminal ready for next incoming participant.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Manual Roster Lookup & Live Audit Ledger (5 cols) */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          {/* Manual Attendee Search & Roster Desk */}
          <div className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E5E7EA] dark:border-[#30353A]">
              <div>
                <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Manual Registration Lookup Desk
                </h2>
                <p className="text-[13px] text-[#656B73] dark:text-[#989EA7] mt-0.5">
                  Search and verify attendees by Name, Email, or Registration ID.
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-[#7D858F] dark:text-[#8D949E]">
                {filteredRoster.length} matches
              </span>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleManualSearchSubmit} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9098] dark:text-[#656B73]" />
                <Input
                  placeholder="Search by Name, Reg ID (e.g. REG-2026-8812), Email..."
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  className="pl-9 h-10 text-xs font-medium"
                />
              </div>
              <Button type="submit" variant="charcoal" className="rounded-full shrink-0 text-xs px-4">
                Verify
              </Button>
            </form>

            {/* Filter Tabs */}
            <div className="mt-4">
              <AnimatedTabs
                tabs={[
                  { id: "all", label: `All (${totalEligible})` },
                  { id: "pending", label: `Pending (${remainingCount})` },
                  { id: "checked_in", label: `Checked In (${checkedInCount})` },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="w-full text-xs"
              />
            </div>

            {/* Attendee Roster Table / List */}
            <div className="mt-4 max-h-[380px] overflow-y-auto space-y-2 pr-1 divide-y divide-[#F0F1F2] dark:divide-[#262A2E]">
              {filteredRoster.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8A9098] dark:text-[#656B73]">
                  No registered attendees match &ldquo;{manualQuery}&rdquo; under this filter.
                </div>
              ) : (
                filteredRoster.map((participant) => {
                  const isChecked = participant.attendanceStatus === "checked_in";
                  return (
                    <div
                      key={participant.id}
                      className="pt-2.5 pb-2.5 flex items-center justify-between gap-3 hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] px-2.5 rounded-xl transition-colors duration-150 ease-out"
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isChecked
                              ? "bg-[#17191C] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                              : "bg-[#F0F1F2] dark:bg-[#151719] text-[#17191C] dark:text-[#F1F2F3] border border-[#E5E7EA] dark:border-[#30353A]"
                          }`}
                        >
                          {isChecked ? <Check className="h-4 w-4" /> : participant.name.charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1 py-0.5">
                          {/* Primary Line: Attendee Name + Inline Team Affiliation (separated by spacing) */}
                          <div className="flex items-baseline gap-2.5 min-w-0">
                            <span className="text-[15px] font-semibold text-[#17191C] dark:text-[#F1F2F3] truncate tracking-[-0.01em] leading-snug">
                              {participant.name}
                            </span>
                            {participant.teamName && (
                              <span className="text-[12.5px] font-normal text-[#656B73] dark:text-[#989EA7] truncate shrink-0">
                                {participant.teamName}
                              </span>
                            )}
                          </div>

                          {/* Secondary Line: Machine ID + Subtle Divider + Email */}
                          <div className="flex items-center gap-2 text-xs leading-tight mt-0.5 min-w-0">
                            <span className="font-mono text-[11px] tabular-nums tracking-tight text-[#7D858F] dark:text-[#8D949E] shrink-0 select-all font-medium">
                              {participant.registrationId}
                            </span>
                            <span className="text-[#C5C9D0] dark:text-[#424850] select-none text-[10px]">•</span>
                            <span
                              className="font-sans text-[12.5px] font-normal text-[#656B73] dark:text-[#989EA7] truncate"
                              title={participant.email}
                            >
                              {participant.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectorParticipant(participant)}
                          className="h-8 w-8 p-0 rounded-full text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3] hover:bg-[#F0F1F2] dark:hover:bg-[#151719]"
                          aria-label={`Inspect pass for ${participant.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant={isChecked ? "outline" : "charcoal"}
                          size="sm"
                          onClick={() => toggleParticipantCheckIn(participant)}
                          className={`rounded-full text-xs h-8 px-3.5 font-semibold ${
                            isChecked
                              ? "border-[#E5E7EA] dark:border-[#30353A] text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#151719]"
                              : ""
                          }`}
                        >
                          {isChecked ? "Checked In" : "Check In"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Live Recent Check-ins Ledger (Audit Log) */}
          <div className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EA] dark:border-[#30353A]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#17191C] dark:text-[#E8EAED]" />
                <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
                  Terminal Check-in Ledger
                </h3>
              </div>
              <span className="text-xs text-[#7D858F] dark:text-[#8D949E]">
                Session Audit Log ({checkInLog.length})
              </span>
            </div>

            <div className="mt-3 divide-y divide-[#F0F1F2] dark:divide-[#262A2E] max-h-[220px] overflow-y-auto pr-1">
              {checkInLog.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8A9098] dark:text-[#656B73]">
                  No check-ins recorded in this active terminal session yet.
                </div>
              ) : (
                checkInLog.map((log) => (
                  <div
                    key={log.id}
                    className="py-2.5 flex items-center justify-between text-xs gap-2 hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] px-2 rounded-lg transition-colors duration-150 ease-out"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-[#17191C] dark:bg-[#E8EAED]" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold text-[#17191C] dark:text-[#F1F2F3] truncate tracking-[-0.01em] leading-snug">
                          {log.participantName}
                        </div>
                        <div className="text-xs leading-tight text-[#656B73] dark:text-[#989EA7] flex items-center gap-2 mt-0.5 min-w-0">
                          <span className="font-mono text-[11px] tabular-nums tracking-tight text-[#7D858F] dark:text-[#8D949E] select-all font-medium shrink-0">
                            {log.registrationId}
                          </span>
                          <span className="text-[#C5C9D0] dark:text-[#424850] select-none text-[10px]">•</span>
                          <span className="capitalize text-[12.5px] font-normal text-[#656B73] dark:text-[#989EA7]">{log.method}</span>
                          <span className="text-[#C5C9D0] dark:text-[#424850] select-none text-[10px]">•</span>
                          <span className="font-mono text-[11px] tabular-nums tracking-tight text-[#7D858F] dark:text-[#8D949E]">{log.timestamp}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUndoCheckIn(log.participantId)}
                      className="text-xs text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3] underline font-medium shrink-0"
                    >
                      Undo
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pass Inspector SlideOver Drawer */}
      <SlideOver
        isOpen={Boolean(inspectorParticipant)}
        onClose={() => setInspectorParticipant(null)}
        title="Participant Pass Inspector"
        subtitle="Digital Ticket Credential & Verification Audit"
        widthClass="max-w-lg"
      >
        {inspectorParticipant && (
          <div className="flex flex-col space-y-6">
            {/* Visual Pass Badge */}
            <div className="rounded-3xl border border-[#17191C] dark:border-[#30353A] bg-[#17191C] text-white p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_70%)] pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                    SKETCH OFFICIAL ENTRY PASS
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">
                    {inspectorParticipant.eventTitle}
                  </h3>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    inspectorParticipant.attendanceStatus === "checked_in"
                      ? "bg-white text-[#17191C] font-bold"
                      : "bg-white/10 text-white border-white/20"
                  }
                >
                  {inspectorParticipant.attendanceStatus === "checked_in" ? "CHECKED IN" : "VALID PASS"}
                </Badge>
              </div>

              {/* QR Code Simulation Graphic */}
              <div className="my-6 flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-[#17191C]">
                {/* Clean Vector QR Representation */}
                <div className="relative p-2 bg-white rounded-xl">
                  <div className="w-40 h-40 border-4 border-[#17191C] p-2 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div className="w-8 h-8 bg-[#17191C] p-1"><div className="w-full h-full bg-white p-1"><div className="w-full h-full bg-[#17191C]" /></div></div>
                      <div className="w-8 h-8 bg-[#17191C] p-1"><div className="w-full h-full bg-white p-1"><div className="w-full h-full bg-[#17191C]" /></div></div>
                    </div>
                    <div className="flex justify-center items-center py-2">
                      <div className="text-[9px] font-mono font-bold tracking-tight text-center">
                        SKETCH<br />SECURE PASS
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="w-8 h-8 bg-[#17191C] p-1"><div className="w-full h-full bg-white p-1"><div className="w-full h-full bg-[#17191C]" /></div></div>
                      <div className="w-6 h-6 border-2 border-dashed border-[#17191C]" />
                    </div>
                  </div>
                </div>
                <span className="mt-2 font-mono text-xs font-bold tracking-wider text-[#17191C]">
                  {inspectorParticipant.registrationId}
                </span>
                <span className="text-[10px] text-[#8A9098]">
                  Credential Hash: {inspectorParticipant.qrCredentialId}
                </span>
              </div>

              {/* Attendee Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/10 pt-4">
                <div>
                  <span className="text-white/50 text-[10px] uppercase font-mono block">Attendee</span>
                  <span className="font-bold text-white text-sm">{inspectorParticipant.name}</span>
                </div>
                <div>
                  <span className="text-white/50 text-[10px] uppercase font-mono block">Department</span>
                  <span className="text-white/90">{inspectorParticipant.department || "General"}</span>
                </div>
                <div>
                  <span className="text-white/50 text-[10px] uppercase font-mono block">Team</span>
                  <span className="text-white/90">{inspectorParticipant.teamName || "Individual"}</span>
                </div>
                <div>
                  <span className="text-white/50 text-[10px] uppercase font-mono block">Academic Year</span>
                  <span className="text-white/90">{inspectorParticipant.year || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Registration Details List */}
            <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 space-y-3 text-xs">
              <h4 className="font-bold text-[#17191C] dark:text-[#F1F2F3] text-xs uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">
                Credential Metadata
              </h4>

              <div className="flex items-center justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                <span className="text-[#656B73] dark:text-[#989EA7] flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </span>
                <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">{inspectorParticipant.email}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                <span className="text-[#656B73] dark:text-[#989EA7] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </span>
                <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">{inspectorParticipant.phone || "Not provided"}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                <span className="text-[#656B73] dark:text-[#989EA7] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Registered Date
                </span>
                <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">
                  {new Date(inspectorParticipant.registeredAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {inspectorParticipant.checkedInAt && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#656B73] dark:text-[#989EA7] flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Verified At
                  </span>
                  <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">
                    {new Date(inspectorParticipant.checkedInAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant={inspectorParticipant.attendanceStatus === "checked_in" ? "outline" : "charcoal"}
                className="flex-1 rounded-full text-xs font-bold h-11"
                onClick={() => toggleParticipantCheckIn(inspectorParticipant)}
              >
                {inspectorParticipant.attendanceStatus === "checked_in" ? (
                  <>
                    <Undo2 className="h-4 w-4 mr-1.5" />
                    Cancel Check-in
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Confirm Check-in & Grant Entry
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full text-xs h-11 px-4 border-[#E5E7EA] dark:border-[#30353A]"
                onClick={() => setInspectorParticipant(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
