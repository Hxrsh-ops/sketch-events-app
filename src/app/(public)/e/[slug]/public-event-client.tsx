"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import Lenis from "lenis";
import {
  Calendar,
  MapPin,
  Users,
  Mail,
  ArrowRight,
  ShieldCheck,
  Download,
  Sparkles,
  Clock,
  Phone,
  Layers,
  ArrowLeft,
  Check,
  Lock,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_ROUNDS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import {
  DynamicFormRenderer,
  isFieldVisible,
} from "@/components/forms/dynamic-form-renderer";
import {
  STANDARD_INDIVIDUAL_TEMPLATE,
  HACKATHON_TEAM_TEMPLATE,
  SRMIST_RAMAPURAM_DEPARTMENTS,
} from "@/lib/form-templates";
import { saveSubmission } from "@/lib/registration-store";
import { registerForEventAction } from "@/app/actions/registration-actions";
import { generateUnifiedTicketSvg, DEFAULT_UNIFIED_TICKET_DESIGN } from "@/lib/ticket/ticket-renderer";
import {
  SmilingSun,
  ChatCloudPoint,
  FlowingRainbowSides,
  RetroRainbowPill,
  NeoBadge,
  ScallopedWave,
} from "@/components/public/retro-elements";
import {
  EventItem,
  RegistrationFormSchema,
  RegistrationSubmission,
  TeamMemberSubmission,
  Round,
} from "@/types";
import { toast, ToastContainer } from "@/components/ui/notification-toast";
import {
  saveRegistrationDraft,
  getRegistrationDraft,
  clearRegistrationDraft,
} from "@/lib/registration-draft";
import { UnifiedTicketCard } from "@/components/ticket/unified-ticket-card";
import styles from "./ambient-bg.module.css";

interface PublicEventClientProps {
  event: EventItem;
  rounds?: Round[];
  isPreview?: boolean;
  bgOverlayOpacity?: number;
  customTicketDesign?: any;
}

export default function PublicEventClient({
  event,
  rounds,
  isPreview = false,
  bgOverlayOpacity,
  customTicketDesign,
}: PublicEventClientProps) {
  // Event cover image
  const coverImageUrl = event.heroImage || event.posterUrl;
  const focalPoint = event.heroImageFocalPoint || event.focalPoint || "center";
  const [bgImageFailed, setBgImageFailed] = useState(false);
  const hasCoverImage = Boolean(coverImageUrl && !bgImageFailed);

  const eventRounds = (rounds && rounds.length > 0)
    ? rounds
    : isPreview && event.hasRounds
    ? MOCK_ROUNDS.filter((r) => r.eventId === event.id)
    : [];

  // Active form schema for this event
  const formSchema: RegistrationFormSchema = useMemo(() => {
    const baseSchema =
      event.registrationForm && event.registrationForm.sections?.length > 0
        ? event.registrationForm
        : event.hasTeams
        ? HACKATHON_TEAM_TEMPLATE
        : STANDARD_INDIVIDUAL_TEMPLATE;

    const hasTeamNameField =
      !event.hasTeams ||
      baseSchema.sections.some((sec) =>
        sec.fields.some(
          (f) =>
            f.id.toLowerCase().includes("team_name") ||
            f.label.toLowerCase().includes("team name")
        )
      );

    const schemaWithTeam = hasTeamNameField
      ? baseSchema
      : {
          ...baseSchema,
          sections: [
            {
              id: "auto_team_identity",
              title: "Team Identity",
              description:
                event.minTeamSize === 1
                  ? "Enter your team name (or your solo/alias name if participating individually)."
                  : "Enter your team name for roster grouping and pass generation.",
              fields: [
                {
                  id: "team_name",
                  type: "text" as const,
                  label: "Team Name",
                  placeholder:
                    event.minTeamSize === 1
                      ? "e.g., Team Apex or Solo"
                      : "e.g., Team Apex",
                  required: true,
                },
              ],
            },
            ...baseSchema.sections,
          ],
        };

    // Ensure any department select field uses the updated official SRMIST Ramapuram structure
    // rather than any legacy/incomplete hardcoded list from stored events
    return {
      ...schemaWithTeam,
      sections: schemaWithTeam.sections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          const isDept =
            f.type === "select" &&
            (f.id.toLowerCase().includes("dept") ||
              f.id.toLowerCase().includes("department") ||
              f.label.toLowerCase().includes("department"));

          if (isDept) {
            return {
              ...f,
              options: SRMIST_RAMAPURAM_DEPARTMENTS,
            };
          }
          return f;
        }),
      })),
    };
  }, [event]);

  // Registration journey state: "form" | "review" | "confirmed"
  const [journeyStep, setJourneyStep] = useState<"form" | "review" | "confirmed">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [duplicateRecord, setDuplicateRecord] = useState<any | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore saved registration draft from localStorage
  useEffect(() => {
    if (journeyStep === "form" && Object.keys(formValues).length === 0) {
      const savedDraft =
        getRegistrationDraft(event.id) ||
        (event.slug ? getRegistrationDraft(event.slug) : null);
      if (savedDraft && Object.keys(savedDraft).length > 0) {
        setFormValues(savedDraft);
        setDraftRestored(true);
      }
    }
  }, [event.id, event.slug, journeyStep]);

  // Generated Registration Result
  const [registrationResult, setRegistrationResult] = useState<{
    registrationId: string;
    qrCredentialId: string;
    registeredAt: string;
    attendeeName: string;
    email: string;
    teamName?: string;
    ticketNumber?: string;
    liveTicketUrl?: string;
    isExisting?: boolean;
    isMockPreview?: boolean;
  } | null>(null);
  const [confirmationQrDataUrl, setConfirmationQrDataUrl] = useState<string | null>(null);

  // Generate real scannable QR Code Data URL on confirmation
  useEffect(() => {
    if (journeyStep === "confirmed" && registrationResult) {
      const qrPayload =
        (registrationResult.liveTicketUrl && typeof window !== "undefined"
          ? `${window.location.origin}${registrationResult.liveTicketUrl.replace(/^https?:\/\/[^/]+/, "")}`
          : registrationResult.liveTicketUrl) ||
        registrationResult.qrCredentialId ||
        registrationResult.ticketNumber ||
        registrationResult.registrationId;

      QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: "#121212",
          light: "#FFFFFF",
        },
      })
        .then((url) => setConfirmationQrDataUrl(url))
        .catch((err) => {
          console.error("Failed to generate confirmed ticket QR data URL:", err);
        });
    }
  }, [journeyStep, registrationResult]);

  // Initialize Lenis fluid smooth scrolling for authentic FlowFest experience
  useEffect(() => {
    let lenis: Lenis | null = null;
    let rafId: number;

    try {
      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        prevent: (node) =>
          Boolean(node.closest?.("[data-lenis-prevent]")) ||
          Boolean(node.closest?.(".retro-dropdown")) ||
          Boolean(node.closest?.("[role='listbox']")),
      });

      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    } catch (e) {
      console.warn("Lenis initialization skipped:", e);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      lenis?.destroy();
    };
  }, []);

  // Field change handler
  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues((prev) => {
      const next = {
        ...prev,
        [fieldId]: value,
      };
      // Auto-save registration progress to localStorage
      saveRegistrationDraft(event.id, next, event.slug);
      return next;
    });

    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Helper to extract primary attendee name, email, and team name from dynamic form values
  const extractAttendeeMetadata = () => {
    let teamName: string | undefined = undefined;
    if (formValues["team_name"]) {
      teamName = String(formValues["team_name"]);
    } else {
      for (const sec of formSchema.sections) {
        for (const f of sec.fields) {
          if (
            (f.id.toLowerCase().includes("team_name") ||
              f.label.toLowerCase().includes("team name")) &&
            formValues[f.id]
          ) {
            teamName = String(formValues[f.id]);
            break;
          }
        }
        if (teamName) break;
      }
    }

    let attendeeName = "";
    const nameKeys = ["leader_name", "captain_name", "fullName", "full_name", "name"];
    for (const k of nameKeys) {
      if (formValues[k] && String(formValues[k]).trim()) {
        attendeeName = String(formValues[k]).trim();
        break;
      }
    }
    if (!attendeeName) {
      for (const sec of formSchema.sections) {
        for (const f of sec.fields) {
          if (
            f.type === "text" &&
            f.label.toLowerCase().includes("name") &&
            !f.label.toLowerCase().includes("team") &&
            formValues[f.id]
          ) {
            attendeeName = String(formValues[f.id]).trim();
            break;
          }
        }
        if (attendeeName) break;
      }
    }
    if (!attendeeName) {
      attendeeName = "Participant";
    }

    let email = "";
    const emailKeys = ["leader_email", "captain_email", "email", "srm_email"];
    for (const k of emailKeys) {
      if (formValues[k] && String(formValues[k]).trim()) {
        email = String(formValues[k]).trim();
        break;
      }
    }
    if (!email) {
      for (const sec of formSchema.sections) {
        for (const f of sec.fields) {
          if (f.type === "email" && formValues[f.id]) {
            email = String(formValues[f.id]).trim();
            break;
          }
        }
        if (email) break;
      }
    }
    if (!email) {
      email = "participant@sketch.events";
    }

    return { attendeeName, email, teamName };
  };

  // Validate dynamic form fields according to schema and conditional visibility
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    formSchema.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (!isFieldVisible(field, formValues)) {
          return;
        }

        if (field.type === "info") {
          return;
        }

        const val = formValues[field.id];
        const isBlank =
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0);

        if (field.required && isBlank) {
          newErrors[field.id] = `${field.label} is required.`;
          return;
        }

        if (!isBlank) {
          const strVal = String(val).trim();

          if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
            newErrors[field.id] = "Please enter a valid email address.";
            return;
          }

          if (field.type === "phone") {
            const digits = strVal.replace(/\D/g, "");
            if (digits.length !== 10) {
              newErrors[field.id] = "Mobile number must be exactly 10 digits.";
              return;
            }
          }

          if (field.type === "select" && strVal.toLowerCase() === "other") {
            const customVal = String(formValues[`${field.id}_custom`] || "").trim();
            if (!customVal) {
              newErrors[`${field.id}_custom`] = "Please enter your department name.";
              return;
            }
          }

          if (
            field.type === "url" &&
            !/^(https?:\/\/|www\.)[^\s/$.?#].[^\s]*$/i.test(strVal)
          ) {
            newErrors[field.id] = "Please enter a valid URL (e.g. https://...).";
            return;
          }

          if (field.type === "number") {
            const num = Number(strVal);
            if (isNaN(num)) {
              newErrors[field.id] = "Please enter a valid numeric value.";
              return;
            }
            if (field.validation?.min !== undefined && num < field.validation.min) {
              newErrors[field.id] = `Minimum value is ${field.validation.min}.`;
              return;
            }
            if (field.validation?.max !== undefined && num > field.validation.max) {
              newErrors[field.id] = `Maximum value is ${field.validation.max}.`;
              return;
            }
          }
        }
      });
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setSubmissionError(null);
      setJourneyStep("review");
      window.scrollTo({ top: 350, behavior: "smooth" });
    } else {
      const firstErrorMessage = Object.values(newErrors)[0];
      toast.error(firstErrorMessage, "Validation Error");
      const firstErrorId = Object.keys(newErrors)[0];
      const elem = document.getElementById(firstErrorId);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  // Final submission execution
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError(null);

    const { attendeeName, email, teamName } = extractAttendeeMetadata();

    const teamMembers: TeamMemberSubmission[] = [];
    for (let i = 1; i <= 6; i++) {
      const mName =
        (formValues[`member_${i}_name`] as string) ||
        (formValues[`team_member_${i}_name`] as string) ||
        (formValues[`member${i}_name`] as string);
      const mEmail =
        (formValues[`member_${i}_email`] as string) ||
        (formValues[`team_member_${i}_email`] as string) ||
        (formValues[`member${i}_email`] as string);
      const mDept =
        (formValues[`member_${i}_dept`] as string) ||
        (formValues[`member_${i}_department`] as string);
      const mPhone = formValues[`member_${i}_phone`] as string;

      if (mName && mName.trim()) {
        teamMembers.push({
          name: mName.trim(),
          email: mEmail ? mEmail.trim() : `member${i}@${email.split("@")[1] || "sketch.events"}`,
          role: `Team Member #${i}`,
          department: mDept,
          phone: mPhone,
        });
      }
    }

    const rawDept = (formValues["department"] as string) || (formValues["leader_department"] as string);
    const resolvedDept =
      String(rawDept || "").toLowerCase() === "other"
        ? (formValues["department_custom"] as string) || (formValues["leader_department_custom"] as string) || "Other"
        : rawDept;

    if (isPreview) {
      setTimeout(() => {
        const generatedRegId = `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const generatedCredHash = `qr_cred_${Math.random().toString(36).substring(2, 10)}`;

        const submissionRecord: RegistrationSubmission = {
          id: `sub-${Date.now().toString(36)}`,
          registrationId: generatedRegId,
          eventId: event.id,
          eventTitle: event.title,
          submittedAt: new Date().toISOString(),
          mode: event.hasTeams || teamName ? "team" : "individual",
          status: "registered",
          attendeeName,
          email,
          phone: (formValues["phone"] as string) || (formValues["leader_phone"] as string) || undefined,
          department: resolvedDept || undefined,
          year: (formValues["year"] as string) || (formValues["academic_year"] as string) || undefined,
          teamName: event.hasTeams || teamName ? teamName : undefined,
          teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
          answers: { ...formValues },
          schemaVersion: formSchema.version || 1,
          qrCredentialId: generatedCredHash,
          attendanceStatus: "not_checked_in",
        };

        saveSubmission(submissionRecord);
        clearRegistrationDraft(event.id, event.slug);
        toast.success("Registration confirmed! Your ticket pass is ready.", "Success");

        setRegistrationResult({
          registrationId: generatedRegId,
          qrCredentialId: generatedCredHash,
          registeredAt: submissionRecord.submittedAt,
          attendeeName,
          email,
          teamName: event.hasTeams || teamName ? teamName : undefined,
          isMockPreview: true,
        });

        setIsSubmitting(false);
        setJourneyStep("confirmed");
        window.scrollTo({ top: 350, behavior: "smooth" });
      }, 500);
    } else {
      try {
        const result = await registerForEventAction({
          eventId: event.id,
          slug: event.slug,
          mode: event.hasTeams || teamName ? "team" : "individual",
          attendeeName,
          email,
          phone: (formValues["phone"] as string) || (formValues["leader_phone"] as string) || undefined,
          department: resolvedDept || undefined,
          year: (formValues["year"] as string) || (formValues["academic_year"] as string) || undefined,
          teamName: event.hasTeams || teamName ? teamName : undefined,
          teamMembers: teamMembers.map((m) => ({
            name: m.name,
            email: m.email,
            phone: m.phone,
            department: m.department,
            role: m.role,
          })),
          customAnswers: { ...formValues },
        });

        if (!result.success) {
          if (result.error === "ALREADY_REGISTERED" && result.data) {
            setDuplicateRecord(result.data);
            const msg = `This email address (${result.data.email}) is already registered for this event. Duplicate submissions are not accepted.`;
            setSubmissionError(msg);
            toast.error(msg, "Already Registered");
            setIsSubmitting(false);
            return;
          }

          setDuplicateRecord(null);
          const msg = result.message || "Registration could not be completed.";
          setSubmissionError(msg);
          toast.error(msg, "Registration Error");
          setIsSubmitting(false);
          return;
        }

        setDuplicateRecord(null);
        clearRegistrationDraft(event.id, event.slug);
        toast.success("Registration confirmed! Your ticket pass is ready.", "Success");

        setRegistrationResult({
          registrationId: result.data.registrationId,
          qrCredentialId: result.data.qrCredentialId,
          registeredAt: result.data.registeredAt,
          attendeeName: result.data.attendeeName,
          email: result.data.email,
          teamName: result.data.teamName,
          ticketNumber: result.data.ticketNumber,
          liveTicketUrl: result.data.liveTicketUrl,
          isExisting: false,
          isMockPreview: false,
        });

        setIsSubmitting(false);
        setJourneyStep("confirmed");
        window.scrollTo({ top: 350, behavior: "smooth" });
      } catch {
        const networkMsg = "Network or server connection error. Please try again.";
        setSubmissionError(networkMsg);
        toast.error(networkMsg, "Error");
        setIsSubmitting(false);
      }
    }
  };

  // Download SVG Pass Image
  const handleDownloadPassSvg = async () => {
    if (!registrationResult) return;

    try {
      const ticketNum = registrationResult.ticketNumber || registrationResult.registrationId;
      const svgPass = await generateUnifiedTicketSvg({
        design: DEFAULT_UNIFIED_TICKET_DESIGN,
        event: {
          title: event.title,
          category: event.category,
          venue: event.venue,
          venueMode: event.venueMode,
          startDate: event.startDate,
          organizerName: "SKETCH",
        },
        attendee: {
          name: registrationResult.attendeeName,
          ticketNumber: ticketNum,
          teamName: registrationResult.teamName,
        },
        qrPayload:
          (registrationResult.liveTicketUrl && typeof window !== "undefined"
            ? `${window.location.origin}${registrationResult.liveTicketUrl.replace(/^https?:\/\/[^/]+/, "")}`
            : registrationResult.liveTicketUrl) ||
          registrationResult.qrCredentialId ||
          ticketNum,
      });

      const blob = new Blob([svgPass], { type: "image/svg+xml;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ticketNum}_pass.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download unified ticket pass SVG:", err);
    }
  };

  const isDeadlinePassed = new Date(event.endDate || event.startDate).getTime() < Date.now();
  const isRegistrationClosed = event.registrationState === "closed" || event.lifecycle === "completed" || isDeadlinePassed;
  const isRegistrationFull = event.registrationState === "full" || event.registeredCount >= event.capacity;
  const isRegistrationUpcoming = event.registrationState === "upcoming" || event.lifecycle === "draft";
  const isRegistrationOpen = !isRegistrationClosed && !isRegistrationFull && !isRegistrationUpcoming;

  return (
    <div className={`${styles.ambientWrapper} retro-theme`} data-retro-page="true">
      <ToastContainer />
      {/* Route-scoped FlowFest Cream Background Layer */}
      <div className={styles.ambientBackground} aria-hidden="true">
        {hasCoverImage ? (
          <img
            src={coverImageUrl}
            alt=""
            aria-hidden="true"
            onError={() => setBgImageFailed(true)}
            className={styles.ambientImage}
            style={{ objectPosition: focalPoint }}
          />
        ) : (
          <div className={styles.ambientFallback} />
        )}
        <div className={styles.ambientGlow} />
        <div
          className={styles.ambientOverlay}
          style={bgOverlayOpacity !== undefined ? { opacity: bgOverlayOpacity } : undefined}
        />
      </div>

      {/* Dynamic Flowing Rainbow Ribbons on Margins */}
      <FlowingRainbowSides />

      {/* Top Floating Mini Header */}
      <header className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border-2 border-ink bg-cream-plus shadow-brutal-flat hover:translate-y-0.5 active:translate-y-1 transition-all"
          >
            <span className="font-peachy font-black text-lg tracking-tight text-ink">
              SKETCH
            </span>
            <span className="h-3.5 w-[2px] bg-ink/30" />
            <span className="font-quicksand font-bold text-xs uppercase tracking-wider text-ink/75">
              Campus Events
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <SmilingSun className="w-8 h-8" interactive={true} />
            <NeoBadge bg="bg-retro-yellow" rotate="-rotate-1">
              Official Pass
            </NeoBadge>
          </div>
        </div>
      </header>

      {/* Main Foreground Container */}
      <main className={`${styles.contentContainer} max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-20`}>
        {/* HERO SECTION: FlowFest Neo-Brutalist Layout */}
        <section
          className="rounded-3xl border-2 border-ink bg-cream-plus p-6 sm:p-10 shadow-brutal-card relative overflow-hidden"
          style={{
            backgroundColor: event.heroCardConfig?.bgColor || undefined,
            backgroundImage: event.heroCardConfig?.bgImageUrl ? `url(${event.heroCardConfig.bgImageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Top Date & Venue Mascot Pill matching 127.0.0.1:5173 */}
          <div className="inline-flex items-center space-x-4 mb-6">
            {event.heroCardConfig?.showMascot !== false && (
              <SmilingSun className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0" spin={true} interactive={true} />
            )}
            <div className="relative inline-flex items-center bg-retro-orange text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl border-2 border-ink shadow-[3px_4px_0_0_#121212]">
              <ChatCloudPoint className="h-4 w-auto absolute bottom-0 left-0 -translate-x-[44%] translate-y-[20%]" />
              <span className="font-bold text-sm sm:text-base tracking-tight text-white font-quicksand whitespace-nowrap">
                {event.heroCardConfig?.bubbleText || `${formatDate(event.startDate)}${event.venue ? ` • ${event.venue}` : ""}`}
              </span>
            </div>
          </div>

          {/* Badges Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <NeoBadge bg="bg-retro-yellow" rotate="-rotate-2">
                {event.category}
              </NeoBadge>
              <NeoBadge bg="bg-retro-pink" rotate="rotate-1">
                {event.hasTeams ? "Team Format" : "Individual"}
              </NeoBadge>
              {isRegistrationFull ? (
                <NeoBadge bg="bg-ink text-white" rotate="rotate-0">
                  Sold Out
                </NeoBadge>
              ) : isRegistrationClosed ? (
                <NeoBadge bg="bg-ink/70 text-white" rotate="rotate-0">
                  Closed
                </NeoBadge>
              ) : (
                <NeoBadge bg="bg-retro-orange text-white" rotate="-rotate-1">
                  Registration Open
                </NeoBadge>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <RetroRainbowPill className="h-3 w-20" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Big Peachy Title & Narrative */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-2">
                <span className="font-quicksand font-bold text-xs uppercase tracking-widest text-ink/60">
                  {event.heroCardConfig?.kicker || "CAMPUS CREATORS & INNOVATORS EXPERIENCE"}
                </span>
                <h1 className="font-peachy font-black text-3xl sm:text-5xl text-ink leading-[1.08] tracking-tight">
                  {event.title}
                </h1>
              </div>

              <p className="font-quicksand font-semibold text-sm sm:text-base text-ink/80 leading-relaxed">
                {event.shortDescription || event.description}
              </p>

              <div className="pt-2 flex items-center gap-3">
                <a
                  href="#register"
                  className="btn-brutal inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-retro-orange text-white font-quicksand font-black text-sm border-2 border-ink shadow-brutal-btn"
                >
                  <span>{event.heroCardConfig?.buttonText || "Get Pass Now"}</span>
                  <ArrowRight className="h-4 w-4 stroke-[3]" />
                </a>

                {event.communityLink && (
                  <a
                    href={event.communityLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-brutal inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-cream text-ink font-quicksand font-bold text-xs border-2 border-ink shadow-brutal-flat"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Community</span>
                  </a>
                )}
              </div>
            </div>

            {/* Right: Framed Polaroid Poster */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-3xl border-2 border-ink bg-[#FFFDF7] p-3 shadow-brutal-card rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="relative h-64 sm:h-72 w-full rounded-2xl border-2 border-ink overflow-hidden bg-retro-yellow/30">
                  {(event.heroCardConfig?.polaroidUrl || coverImageUrl) ? (
                    <img
                      src={event.heroCardConfig?.polaroidUrl || coverImageUrl}
                      alt={event.title}
                      style={{ objectPosition: focalPoint }}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <SmilingSun className="w-16 h-16" />
                      <span className="font-peachy font-black text-xl text-ink">
                        {event.title}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-2.5 right-2.5">
                    <span className="px-3 py-1 rounded-full bg-cream-plus/95 border-2 border-ink font-quicksand font-black text-[10px] uppercase text-ink shadow-brutal-badge">
                      {event.heroCardConfig?.photoBadge || "Free Entry"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between px-2 pt-1">
                  <span className="font-quicksand font-bold text-xs text-ink/75">
                    {event.heroCardConfig?.photoCaption || "SKETCH Official"}
                  </span>
                  <RetroRainbowPill className="h-2.5 w-16" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* EVENT SPECS GRID: Neo-Brutalist Sticker Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border-2 border-ink bg-cream-plus p-4 shadow-brutal-flat flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl border-2 border-ink bg-retro-yellow flex items-center justify-center text-ink shrink-0 shadow-brutal-badge">
              <Calendar className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-quicksand font-bold text-[10px] uppercase tracking-wider text-ink/60">
                Date & Timing
              </div>
              <div className="font-quicksand font-black text-xs text-ink">
                {formatDate(event.startDate)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-ink bg-cream-plus p-4 shadow-brutal-flat flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl border-2 border-ink bg-retro-pink flex items-center justify-center text-ink shrink-0 shadow-brutal-badge">
              <MapPin className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="font-quicksand font-bold text-[10px] uppercase tracking-wider text-ink/60">
                Venue & Mode
              </div>
              <div className="font-quicksand font-black text-xs text-ink truncate">
                {event.venue} ({event.venueMode})
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-ink bg-cream-plus p-4 shadow-brutal-flat flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl border-2 border-ink bg-retro-mango flex items-center justify-center text-ink shrink-0 shadow-brutal-badge">
              <Clock className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-quicksand font-bold text-[10px] uppercase tracking-wider text-ink/60">
                Registration Closes
              </div>
              <div className="font-quicksand font-black text-xs text-ink">
                {formatDate(event.endDate || event.startDate)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-ink bg-cream-plus p-4 shadow-brutal-flat flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl border-2 border-ink bg-retro-orange flex items-center justify-center text-white shrink-0 shadow-brutal-badge">
              <Users className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-quicksand font-bold text-[10px] uppercase tracking-wider text-ink/60">
                Format & Fee
              </div>
              <div className="font-quicksand font-black text-xs text-ink">
                {event.hasTeams
                  ? `Team (${event.minTeamSize || 2}-${event.maxTeamSize || 4}) • Free`
                  : "Individual • Free"}
              </div>
            </div>
          </div>
        </section>

        {/* EXPERIENCE DETAILS & CRITERIA */}
        <section className="rounded-3xl border-2 border-ink bg-cream-plus p-6 sm:p-8 shadow-brutal-card space-y-6">
          <div className="space-y-2">
            <h2 className="font-peachy font-black text-2xl text-ink tracking-tight">
              About this Experience
            </h2>
            <p className="font-quicksand font-semibold text-sm text-ink/80 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Eligibility Sticker */}
          <div className="rounded-2xl border-2 border-ink bg-retro-yellow/25 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-brutal-flat">
            <div className="space-y-1">
              <span className="font-quicksand font-black text-[10px] uppercase tracking-wider text-ink/70">
                Eligibility & Admission
              </span>
              <p className="font-quicksand font-bold text-xs text-ink">
                {event.hasTeams
                  ? `Open to eligible campus teams of ${event.minTeamSize || 2} to ${event.maxTeamSize || 4} participants.`
                  : "Open to all registered student creators, developers, and designers."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3.5 py-1.5 rounded-full border-2 border-ink bg-ink text-white font-quicksand font-black text-xs uppercase tracking-wider shadow-brutal-badge">
                Free Admission
              </span>
              <span className="px-3 py-1.5 rounded-full border-2 border-ink bg-cream-plus font-quicksand font-bold text-xs text-ink shadow-brutal-badge">
                Capacity: {event.capacity}
              </span>
            </div>
          </div>

          {/* Rounds Progression if applicable */}
          {eventRounds.length > 0 && (
            <div className="border-t-2 border-ink/15 pt-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Layers className="h-5 w-5 text-ink stroke-[2.5]" />
                <h3 className="font-peachy font-black text-xl text-ink">
                  Competition Stages & Rounds
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {eventRounds.map((rnd) => (
                  <div
                    key={rnd.id}
                    className="rounded-2xl border-2 border-ink bg-[#FFFDF7] p-4 shadow-brutal-flat space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-quicksand font-black text-[10px] text-retro-orange uppercase">
                        Stage {rnd.order}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full border border-ink text-[10px] font-quicksand font-bold bg-retro-yellow/40 text-ink">
                        {rnd.status.replace("_", " ")}
                      </span>
                    </div>
                    <h4 className="font-quicksand font-black text-sm text-ink">
                      {rnd.name}
                    </h4>
                    <p className="font-quicksand font-semibold text-xs text-ink/70">
                      Venue: {rnd.venue}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organized by Section */}
          <div className="border-t-2 border-ink/15 pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-ink stroke-[2.5]" />
              <h3 className="font-peachy font-black text-xl text-ink">
                Organized by
              </h3>
            </div>
            <div className="rounded-2xl border-2 border-ink bg-[#FFFDF7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-brutal-flat">
              <div>
                <p className="font-quicksand font-black text-sm text-ink">
                  Sketch Campus Operations Team
                </p>
                <p className="font-quicksand font-semibold text-xs text-ink/70">
                  Official Host & Event Management Group
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {event.contactEmail && (
                  <a
                    href={`mailto:${event.contactEmail}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-ink bg-cream-plus font-quicksand font-bold text-xs text-ink shadow-brutal-badge hover:bg-cream"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{event.contactEmail}</span>
                  </a>
                )}
                {event.contactPhone && (
                  <a
                    href={`tel:${event.contactPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-ink bg-cream-plus font-quicksand font-bold text-xs text-ink shadow-brutal-badge hover:bg-cream"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>{event.contactPhone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* REGISTRATION SECTION: The core form container */}
        <section id="register">
          {/* State A: Closed Registration */}
          {isRegistrationClosed ? (
            <div className="rounded-3xl border-2 border-ink bg-cream-plus p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-brutal-card">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-retro-yellow text-ink shadow-brutal-flat">
                <Lock className="h-7 w-7 stroke-[2.5]" />
              </div>
              <h3 className="font-peachy font-black text-2xl text-ink">
                Registration is Closed
              </h3>
              <p className="font-quicksand font-semibold text-xs text-ink/75 leading-relaxed">
                Registrations for this experience are now officially closed. If you already hold a confirmed ticket pass, present your QR code at the desk on event day.
              </p>
              <Link href="/">
                <button className="btn-brutal px-6 py-3 rounded-full border-2 border-ink bg-retro-yellow text-ink font-quicksand font-black text-xs shadow-brutal-btn mt-2">
                  Explore Other Events
                </button>
              </Link>
            </div>
          ) : isRegistrationFull ? (
            /* State B: Full / Sold Out */
            <div className="rounded-3xl border-2 border-ink bg-cream-plus p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-brutal-card">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-retro-pink text-ink shadow-brutal-flat">
                <Users className="h-7 w-7 stroke-[2.5]" />
              </div>
              <h3 className="font-peachy font-black text-2xl text-ink">
                Event Capacity Reached
              </h3>
              <p className="font-quicksand font-semibold text-xs text-ink/75 leading-relaxed">
                All {event.capacity} seats for {event.title} have been reserved. Registration is currently full.
              </p>
              <Link href="/">
                <button className="btn-brutal px-6 py-3 rounded-full border-2 border-ink bg-retro-pink text-white font-quicksand font-black text-xs shadow-brutal-btn mt-2">
                  Discover Available Events
                </button>
              </Link>
            </div>
          ) : isRegistrationUpcoming ? (
            /* State C: Upcoming / Draft */
            <div className="rounded-3xl border-2 border-ink bg-cream-plus p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-brutal-card">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-retro-mango text-ink shadow-brutal-flat">
                <Clock className="h-7 w-7 stroke-[2.5]" />
              </div>
              <h3 className="font-peachy font-black text-2xl text-ink">
                Registration Opening Soon
              </h3>
              <p className="font-quicksand font-semibold text-xs text-ink/75 leading-relaxed">
                Official passes for {event.title} will open shortly. Check back soon!
              </p>
            </div>
          ) : journeyStep === "confirmed" && registrationResult ? (
            /* State D: Confirmed Entry Pass Screen */
            <div className="space-y-6">
              <div className="rounded-3xl border-2 border-ink bg-cream-plus p-6 sm:p-10 shadow-brutal-card text-center space-y-4">
                <div className="flex justify-center">
                  <SmilingSun className="w-16 h-16" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-peachy font-black text-3xl sm:text-4xl text-ink">
                    Registration Confirmed! 🎉
                  </h3>
                  <p className="font-quicksand font-semibold text-sm text-ink/80 max-w-md mx-auto">
                    Your official admission pass has been generated for{" "}
                    <strong className="text-ink font-black">{registrationResult.email}</strong>.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-ink bg-retro-yellow/40 text-ink font-quicksand font-black text-xs shadow-brutal-flat">
                  <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
                  <span>Verified Admission Credential</span>
                </div>
              </div>

              {/* Admission Pass: Custom Design from Ticket Studio if assigned, otherwise Inbuilt Retro Fallback */}
              {customTicketDesign ? (
                <div className="max-w-2xl mx-auto flex justify-center py-2 px-2 overflow-x-auto">
                  <UnifiedTicketCard
                    responsive={true}
                    design={customTicketDesign}
                    event={{
                      title: event.title,
                      category: event.category,
                      venue: event.venue,
                      venueMode: event.venueMode,
                      startDate: event.startDate,
                      endDate: event.endDate,
                      organizerName: "SKETCH",
                    }}
                    attendee={{
                      name: registrationResult.attendeeName,
                      email: registrationResult.email,
                      ticketNumber: registrationResult.ticketNumber || registrationResult.registrationId,
                      teamName: registrationResult.teamName || null,
                      ticketStatus: "active",
                      attendanceStatus: "not_checked_in",
                    }}
                    qr={{
                      type: "static",
                      qrDataUrl: confirmationQrDataUrl,
                      isLoading: !confirmationQrDataUrl,
                    }}
                  />
                </div>
              ) : (
                /* Fallback: Inbuilt Neo-brutalist Tactile Pass Card */
                <div className="max-w-md mx-auto rounded-3xl border-2 border-ink bg-cream-plus shadow-brutal-card overflow-hidden relative">
                  {/* Top Ticket Header */}
                  <div className="p-6 bg-retro-yellow border-b-2 border-ink">
                    <div className="flex items-center justify-between">
                      <span className="font-peachy font-black text-xl text-ink tracking-tight">
                        SKETCH PASS
                      </span>
                      <span className="px-3 py-1 rounded-full border-2 border-ink bg-cream-plus font-mono font-bold text-xs text-ink shadow-brutal-badge">
                        {registrationResult.ticketNumber || registrationResult.registrationId}
                      </span>
                    </div>
                    <h4 className="mt-3 font-peachy font-black text-2xl text-ink leading-tight">
                      {event.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-3 text-xs font-quicksand font-bold text-ink/75">
                      <span>{formatDate(event.startDate)}</span>
                      <span>•</span>
                      <span>{event.venue}</span>
                    </div>
                  </div>

                  {/* QR Display Area */}
                  <div className="p-8 flex flex-col items-center justify-center bg-[#FFFDF7]">
                    <div className="p-4 rounded-2xl border-2 border-ink bg-white shadow-brutal-flat">
                      {confirmationQrDataUrl ? (
                        <img
                          src={confirmationQrDataUrl}
                          alt="QR Code"
                          className="w-44 h-44 object-contain"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center font-quicksand font-bold text-xs text-ink/60">
                          Loading QR...
                        </div>
                      )}
                    </div>
                    <p className="mt-3 font-mono font-bold text-xs text-ink/60 uppercase tracking-widest">
                      Present at Check-in Desk
                    </p>
                  </div>

                  {/* Perforated Tear Line */}
                  <div className="relative flex items-center justify-between border-t-2 border-dashed border-ink bg-[#FFFDF7] px-0">
                    <div className="w-5 h-5 -ml-2.5 rounded-full bg-cream border-2 border-ink" />
                    <div className="w-5 h-5 -mr-2.5 rounded-full bg-cream border-2 border-ink" />
                  </div>

                  {/* Bottom Stub */}
                  <div className="p-5 bg-cream border-t-2 border-ink flex items-center justify-between">
                    <div>
                      <span className="block font-quicksand font-bold text-[10px] uppercase text-ink/60">
                        Holder
                      </span>
                      <span className="font-quicksand font-black text-sm text-ink">
                        {registrationResult.attendeeName}
                      </span>
                    </div>
                    {registrationResult.teamName ? (
                      <div className="text-right">
                        <span className="block font-quicksand font-bold text-[10px] uppercase text-ink/60">
                          Team
                        </span>
                        <span className="font-quicksand font-black text-xs text-retro-orange">
                          {registrationResult.teamName}
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="block font-quicksand font-bold text-[10px] uppercase text-ink/60">
                          Status
                        </span>
                        <span className="font-quicksand font-black text-xs text-emerald-700">
                          Confirmed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Multiple Students Registration Banner in exact FlowFest Retro Neo-Brutalist Theme */}
              <div className="max-w-md mx-auto rounded-3xl border-2 border-ink bg-[#FFFDF7] p-5 text-center space-y-2.5 shadow-brutal-card">
                <div className="flex items-center justify-center gap-2 text-xs font-quicksand font-black text-ink">
                  <Users className="h-4 w-4 stroke-[2.5]" />
                  <span>Need to register for another student in the same mail.</span>
                </div>
                <p className="text-xs font-quicksand font-semibold text-ink/75 leading-relaxed">
                  You can register additional students using{" "}
                  <strong className="text-ink font-black">{registrationResult.email}</strong>.
                  Each student receives their own unique ticket pass and separate registration record.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const retainedEmail = registrationResult.email;
                    clearRegistrationDraft(event.id, event.slug);
                    setFormValues({
                      email: retainedEmail,
                      leader_email: retainedEmail,
                    });
                    setErrors({});
                    setRegistrationResult(null);
                    setDuplicateRecord(null);
                    setJourneyStep("form");
                    window.scrollTo({ top: 350, behavior: "smooth" });
                  }}
                  className="btn-brutal px-5 py-2.5 rounded-full border-2 border-ink bg-retro-yellow text-ink font-quicksand font-black text-xs shadow-brutal-btn"
                >
                  Register Another Student
                </button>
              </div>

              {/* Action Buttons */}
              <div className="max-w-md mx-auto space-y-3 pt-2">
                {registrationResult.liveTicketUrl && (
                  <Link
                    href={registrationResult.liveTicketUrl.replace(/^https?:\/\/[^/]+/, "")}
                    className="btn-brutal w-full py-4 rounded-full bg-retro-orange text-white font-quicksand font-black text-sm border-2 border-ink shadow-brutal-btn flex items-center justify-center gap-2"
                  >
                    <Ticket className="h-4 w-4" />
                    <span>View Verified Admission Pass</span>
                    <ArrowRight className="h-4 w-4 stroke-[3]" />
                  </Link>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadPassSvg}
                    className="btn-brutal flex-1 py-3 rounded-full bg-cream-plus text-ink font-quicksand font-bold text-xs border-2 border-ink shadow-brutal-flat flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download SVG</span>
                  </button>
                  <button
                    onClick={() => {
                      setJourneyStep("form");
                      setFormValues({});
                      setErrors({});
                      setRegistrationResult(null);
                    }}
                    className="btn-brutal flex-1 py-3 rounded-full bg-cream text-ink font-quicksand font-bold text-xs border-2 border-ink shadow-brutal-flat"
                  >
                    Register Another
                  </button>
                </div>
              </div>
            </div>
          ) : journeyStep === "review" ? (
            /* State E: Dynamic Review Step */
            <div className="rounded-3xl border-2 border-ink bg-cream-plus p-6 sm:p-10 shadow-brutal-card space-y-6 max-w-2xl mx-auto">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <NeoBadge bg="bg-retro-yellow" rotate="-rotate-1">
                    Step 2 of 2
                  </NeoBadge>
                  <span className="font-quicksand font-bold text-xs uppercase tracking-wider text-ink/60">
                    Admission Summary
                  </span>
                </div>
                <h2 className="font-peachy font-black text-3xl text-ink">
                  Review Your Details
                </h2>
                <p className="font-quicksand font-semibold text-xs text-ink/70">
                  Please verify your information before generating your official verified pass.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-ink bg-[#FFFDF7] p-4 flex items-center justify-between text-xs font-quicksand shadow-brutal-flat">
                  <div className="flex items-center gap-2">
                    <span className="font-black uppercase tracking-wider text-ink/75">Selected Event</span>
                    <span className="px-2.5 py-0.5 rounded-full border-2 border-ink bg-retro-yellow text-[10px] font-black uppercase text-ink shadow-xs">
                      {event.category || "Event"}
                    </span>
                  </div>
                  <span className="font-peachy font-black text-base text-ink tracking-tight">{event.title}</span>
                </div>

                {formSchema.sections.map((section) => {
                  const visibleFields = section.fields.filter(
                    (f) => f.type !== "info" && isFieldVisible(f, formValues)
                  );
                  if (visibleFields.length === 0) return null;

                  return (
                    <div
                      key={section.id}
                      className="rounded-2xl border-2 border-ink bg-[#FFFDF7] p-5 space-y-3 shadow-brutal-flat font-quicksand"
                    >
                      <h4 className="font-peachy font-black text-lg text-ink border-b-2 border-ink/15 pb-2">
                        {section.title}
                      </h4>
                      <div className="space-y-2.5">
                        {visibleFields.map((field) => {
                          const val = formValues[field.id];
                          let displayVal = "—";
                          if (val !== undefined && val !== null && val !== "") {
                            if (Array.isArray(val)) {
                              displayVal = val.join(", ");
                            } else if (typeof val === "boolean") {
                              displayVal = val ? "Yes" : "No";
                            } else {
                              displayVal = String(val);
                            }
                          }

                          return (
                            <div
                              key={field.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1 border-b border-ink/10 text-xs gap-1"
                            >
                              <span className="font-bold text-ink/60">
                                {field.label}:
                              </span>
                              <span className="font-black text-ink sm:text-right break-words">
                                {displayVal}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {duplicateRecord ? (
                <div className="rounded-2xl border-2 border-retro-orange bg-retro-orange/15 p-4 text-xs font-quicksand space-y-2 text-ink shadow-brutal-flat">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-retro-orange shrink-0 stroke-[2.5]" />
                    <span className="font-black text-sm">Already Registered</span>
                  </div>
                  <p className="font-semibold text-ink/80 leading-relaxed">
                    An active registration already exists for <strong>{duplicateRecord.email}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRegistrationResult({
                        ...duplicateRecord,
                        isExisting: true,
                        isMockPreview: false,
                      });
                      setJourneyStep("confirmed");
                      window.scrollTo({ top: 350, behavior: "smooth" });
                    }}
                    className="btn-brutal px-4 py-2 rounded-full border-2 border-ink bg-retro-yellow text-ink font-black text-xs shadow-brutal-flat inline-flex items-center gap-1.5"
                  >
                    <Ticket className="h-4 w-4" />
                    <span>View Existing Pass &rarr;</span>
                  </button>
                </div>
              ) : submissionError ? (
                <div className="rounded-2xl border-2 border-red-500 bg-red-100 p-4 text-xs font-quicksand text-red-800 space-y-1 shadow-brutal-flat">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>Registration Issue</span>
                  </div>
                  <p className="font-semibold text-red-700">{submissionError}</p>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionError(null);
                    setDuplicateRecord(null);
                    setJourneyStep("form");
                  }}
                  className="btn-brutal py-3.5 px-6 rounded-full border-2 border-ink bg-cream text-ink font-quicksand font-bold text-xs shadow-brutal-flat flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Edit Information</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || Boolean(duplicateRecord)}
                  onClick={handleFinalSubmit}
                  className="btn-brutal flex-1 py-4 px-8 rounded-full border-2 border-ink bg-retro-orange text-white font-quicksand font-black text-sm sm:text-base shadow-brutal-btn flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Issuing Official Pass...</span>
                  ) : (
                    <>
                      <span>Confirm & Claim Pass</span>
                      <ArrowRight className="h-4 w-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* State F: Main Form Screen */
            <div className="space-y-6">
              {/* Form Hero Header */}
              <div className="rounded-3xl border-2 border-ink bg-cream-plus p-6 sm:p-8 shadow-brutal-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <NeoBadge bg="bg-retro-yellow" rotate="-rotate-1">
                      Step 1 of 2
                    </NeoBadge>
                    <span className="font-quicksand font-bold text-xs uppercase tracking-wider text-ink/60">
                      Official Entry
                    </span>
                  </div>
                  <h2 className="font-peachy font-black text-3xl sm:text-4xl text-ink">
                    {event.hasTeams ? "Register Your Team" : "Claim Your Pass"}
                  </h2>
                  <p className="font-quicksand font-semibold text-xs sm:text-sm text-ink/75 leading-relaxed">
                    Direct registration for student creators. Fill in the fields below to generate your official festival admission QR pass.
                  </p>
                </div>

                <div className="hidden sm:flex shrink-0">
                  <SmilingSun className="w-16 h-16 sm:w-20 sm:h-20" spin={true} interactive={true} />
                </div>
              </div>

              {/* Draft Restored Banner */}
              {draftRestored && (
                <div className="rounded-2xl border-2 border-ink bg-retro-yellow/30 p-3 sm:p-4 flex items-center justify-between text-xs font-quicksand font-bold text-ink shadow-brutal-flat">
                  <span>Draft restored from your previous session.</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearRegistrationDraft(event.id, event.slug);
                      setFormValues({});
                      setDraftRestored(false);
                    }}
                    className="btn-brutal px-3 py-1 rounded-full border-2 border-ink bg-white text-ink text-xs font-black shadow-brutal-flat"
                  >
                    Start Fresh
                  </button>
                </div>
              )}

              {/* Dynamic Form Engine in FlowFest Retro Theme */}
              <form onSubmit={handleProceedToReview} className="space-y-6">
                <DynamicFormRenderer
                  schema={formSchema}
                  values={formValues}
                  onChange={handleFieldChange}
                  errors={errors}
                  variant="retro"
                />

                {/* Submit Action Bar */}
                <div className="rounded-3xl border-2 border-ink bg-cream-plus p-6 sm:p-8 shadow-brutal-card space-y-4">
                  <button
                    type="submit"
                    className="btn-brutal w-full py-4 px-8 rounded-full bg-retro-orange text-white font-quicksand font-black text-base sm:text-lg border-2 border-ink shadow-brutal-btn flex items-center justify-center gap-2"
                  >
                    <span>Review Registration & Claim Pass</span>
                    <ArrowRight className="h-5 w-5 stroke-[3]" />
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs font-quicksand font-bold text-ink/60">
                    <ShieldCheck className="h-4 w-4 stroke-[2.5] text-ink" />
                    <span>Instant verified admission. Scannable QR pass sent directly to your email.</span>
                  </div>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* BOTTOM SCALLOPED WAVE ACCENT */}
        <div className="rounded-3xl border-2 border-ink bg-cream-plus shadow-brutal-card overflow-hidden">
          <div className="w-full select-none pointer-events-none -mb-1">
            <ScallopedWave className="w-full h-8 sm:h-12" />
          </div>
          <div className="p-6 sm:p-8 text-center space-y-3">
            <div className="flex justify-center">
              <SmilingSun className="w-16 h-16 sm:w-20 sm:h-20" spin={true} interactive={true} />
            </div>
            <p className="font-peachy font-black text-2xl sm:text-3xl text-ink">
              SKETCH EVENT OPERATIONS
            </p>
            <p className="font-quicksand font-bold text-xs sm:text-sm text-ink/60">
              Powered by the SKETCH campus event platform. See you at the arena!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
