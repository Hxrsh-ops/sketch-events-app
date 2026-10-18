"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
} from "@/lib/form-templates";
import { saveSubmission } from "@/lib/registration-store";
import { registerForEventAction } from "@/app/actions/registration-actions";
import {
  EventItem,
  RegistrationFormSchema,
  RegistrationSubmission,
  TeamMemberSubmission,
} from "@/types";

interface PublicEventClientProps {
  event: EventItem;
  isPreview?: boolean;
}

export default function PublicEventClient({
  event,
  isPreview = false,
}: PublicEventClientProps) {
  const eventRounds = event.hasRounds
    ? MOCK_ROUNDS.filter((r) => r.eventId === event.id)
    : [];

  // Active form schema for this event
  const formSchema: RegistrationFormSchema = useMemo(() => {
    if (event.registrationForm && event.registrationForm.sections?.length > 0) {
      return event.registrationForm;
    }
    return event.hasTeams ? HACKATHON_TEAM_TEMPLATE : STANDARD_INDIVIDUAL_TEMPLATE;
  }, [event]);

  // Registration journey state: "form" | "review" | "confirmed"
  const [journeyStep, setJourneyStep] = useState<"form" | "review" | "confirmed">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  // Generated Registration Result
  const [registrationResult, setRegistrationResult] = useState<{
    registrationId: string;
    qrCredentialId: string;
    registeredAt: string;
    attendeeName: string;
    email: string;
    teamName?: string;
    isMockPreview?: boolean;
  } | null>(null);

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    if (submissionError) {
      setSubmissionError(null);
    }
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
    // 1. Team Name
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

    // 2. Attendee / Leader Name
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

    // 3. Attendee / Leader Email
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
        // Evaluate conditional visibility: hidden fields are never validated
        if (!isFieldVisible(field, formValues)) {
          return;
        }

        // Info type has no user inputs
        if (field.type === "info") {
          return;
        }

        const val = formValues[field.id];
        const isBlank =
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0);

        // Required validation
        if (field.required && isBlank) {
          newErrors[field.id] = `${field.label} is required.`;
          return;
        }

        if (!isBlank) {
          const strVal = String(val).trim();

          // Email validation
          if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
            newErrors[field.id] = "Please enter a valid email address.";
            return;
          }

          // Phone validation
          if (field.type === "phone" && !/^[0-9+\s\-().]{7,20}$/.test(strVal)) {
            newErrors[field.id] = "Please enter a valid phone number.";
            return;
          }

          // URL validation
          if (
            field.type === "url" &&
            !/^(https?:\/\/|www\.)[^\s/$.?#].[^\s]*$/i.test(strVal)
          ) {
            newErrors[field.id] = "Please enter a valid URL (e.g. https://...).";
            return;
          }

          // Number validation
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
      window.scrollTo({ top: 450, behavior: "smooth" });
    } else {
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

    // Extract structured team members from form values if present
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

    if (isPreview) {
      setTimeout(() => {
        const generatedRegId = `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const generatedCredHash = `qr_cred_${Math.random().toString(36).substring(2, 10)}`;

        // Save submission record into shared preview repository if in preview mode
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
          department: (formValues["department"] as string) || (formValues["leader_department"] as string) || undefined,
          year: (formValues["year"] as string) || (formValues["academic_year"] as string) || undefined,
          teamName: event.hasTeams || teamName ? teamName : undefined,
          teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
          answers: { ...formValues },
          schemaVersion: formSchema.version || 1,
          qrCredentialId: generatedCredHash,
          attendanceStatus: "not_checked_in",
        };

        saveSubmission(submissionRecord);

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
          department: (formValues["department"] as string) || (formValues["leader_department"] as string) || undefined,
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
          setSubmissionError(result.message || "Registration could not be completed.");
          setIsSubmitting(false);
          return;
        }

        setRegistrationResult({
          registrationId: result.data.registrationId,
          qrCredentialId: result.data.qrCredentialId,
          registeredAt: result.data.registeredAt,
          attendeeName: result.data.attendeeName,
          email: result.data.email,
          teamName: result.data.teamName,
          isMockPreview: false,
        });

        setIsSubmitting(false);
        setJourneyStep("confirmed");
        window.scrollTo({ top: 350, behavior: "smooth" });
      } catch {
        setSubmissionError("Network or server connection error. Please try again.");
        setIsSubmitting(false);
      }
    }
  };

  // Download SVG Pass Image
  const handleDownloadPassSvg = () => {
    if (!registrationResult) return;

    const isMock = Boolean(registrationResult.isMockPreview ?? isPreview);
    const passHeader = isMock
      ? "SKETCH PREVIEW EVENT PASS • LOCAL DEMO ONLY"
      : "SKETCH OFFICIAL EVENT PASS";
    const passFooter = isMock
      ? "CLIENT PREVIEW CREDENTIAL • LOCAL TERMINAL TESTING ONLY"
      : "OFFICIAL EVENT CREDENTIAL • PRESENT AT DESK SCANNER";

    const svgPass = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
  <rect width="600" height="800" rx="30" fill="#17191C"/>
  <circle cx="300" cy="150" r="240" fill="#FFFFFF" fill-opacity="0.04"/>

  <text x="50" y="70" font-family="sans-serif" font-size="12" font-weight="bold" letter-spacing="3" fill="#8A9098">${passHeader}</text>
  <text x="50" y="110" font-family="sans-serif" font-size="24" font-weight="900" fill="#FFFFFF">${event.title}</text>
  <text x="50" y="140" font-family="sans-serif" font-size="13" fill="#AEB3BA">${event.venue} • ${formatDate(event.startDate)}</text>

  <rect x="150" y="190" width="300" height="300" rx="20" fill="#FFFFFF"/>
  <rect x="180" y="220" width="240" height="240" fill="#17191C"/>
  <rect x="200" y="240" width="80" height="80" fill="#FFFFFF"/>
  <rect x="220" y="260" width="40" height="40" fill="#17191C"/>
  <rect x="320" y="240" width="80" height="80" fill="#FFFFFF"/>
  <rect x="340" y="260" width="40" height="40" fill="#17191C"/>
  <rect x="200" y="360" width="80" height="80" fill="#FFFFFF"/>
  <rect x="220" y="380" width="40" height="40" fill="#17191C"/>

  <text x="300" y="530" font-family="monospace" font-size="18" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${registrationResult.registrationId}</text>
  <text x="300" y="555" font-family="sans-serif" font-size="11" fill="#8A9098" text-anchor="middle">HASH: ${registrationResult.qrCredentialId}</text>

  <line x1="50" y1="590" x2="550" y2="590" stroke="#25292F" stroke-width="2"/>

  <text x="50" y="630" font-family="sans-serif" font-size="11" fill="#8A9098">PARTICIPANT / REPRESENTATIVE</text>
  <text x="50" y="655" font-family="sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF">${registrationResult.attendeeName}</text>

  ${registrationResult.teamName ? `<text x="50" y="695" font-family="sans-serif" font-size="11" fill="#8A9098">TEAM AFFILIATION</text><text x="50" y="720" font-family="sans-serif" font-size="16" font-weight="bold" fill="#FFFFFF">${registrationResult.teamName}</text>` : `<text x="50" y="695" font-family="sans-serif" font-size="11" fill="#8A9098">REGISTRATION STATUS</text><text x="50" y="720" font-family="sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF">Confirmed Individual Attendee</text>`}

  <text x="300" y="775" font-family="sans-serif" font-size="10" fill="#656B73" text-anchor="middle">${passFooter}</text>
</svg>`;

    const blob = new Blob([svgPass], { type: "image/svg+xml;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${registrationResult.registrationId}_pass.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isRegistrationClosed = event.registrationState === "closed" || event.lifecycle === "completed";
  const isRegistrationFull = event.registrationState === "full" || event.registeredCount >= event.capacity;
  const isRegistrationUpcoming = event.registrationState === "upcoming" || event.lifecycle === "draft";

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Event Hero Card */}
      <div className="overflow-hidden rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-sm">
        {/* Poster Header */}
        <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-[#17191C]">
          <img
            src={event.heroImage || event.posterUrl}
            alt={event.title}
            style={{ objectPosition: event.heroImageFocalPoint || event.focalPoint || "center" }}
            className="h-full w-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17191C] via-[#17191C]/50 to-transparent" />

          {/* Top Category & Lifecycle Badges */}
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <span className="rounded-full bg-white/95 dark:bg-[#1B1E21]/95 px-3 py-1 text-xs font-bold text-[#17191C] dark:text-[#F1F2F3] backdrop-blur-md shadow-xs">
              {event.category}
            </span>
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/20">
              {event.lifecycle}
            </span>
          </div>

          {/* Bottom Title & Subtitle */}
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/70">
              OFFICIAL SKETCH EXPERIENCE
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm text-white">
              {event.title}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 line-clamp-2 max-w-2xl leading-relaxed">
              {event.shortDescription}
            </p>
          </div>
        </div>

        {/* Operational Metadata Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#F4F5F6] dark:divide-[#262A2E] border-b border-[#F4F5F6] dark:border-[#262A2E] bg-[#F9FAFB] dark:bg-[#151719] text-xs text-[#656B73] dark:text-[#8A9098]">
          <div className="p-4 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED] shrink-0" />
            <div>
              <div className="text-[10px] text-[#8A9098] font-bold uppercase">Date & Timing</div>
              <div className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">{formatDate(event.startDate)}</div>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <MapPin className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED] shrink-0" />
            <div>
              <div className="text-[10px] text-[#8A9098] font-bold uppercase">Venue Mode</div>
              <div className="font-semibold text-[#17191C] dark:text-[#F1F2F3] line-clamp-1">
                {event.venue} ({event.venueMode})
              </div>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <Users className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED] shrink-0" />
            <div>
              <div className="text-[10px] text-[#8A9098] font-bold uppercase">Participation Format</div>
              <div className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                {event.hasTeams
                  ? `Team (${event.minTeamSize || 2}-${event.maxTeamSize || 4} Members)`
                  : "Individual Attendance"}
              </div>
            </div>
          </div>
        </div>

        {/* Event Narrative Body & Stage Pipeline */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">About this Experience</h2>
            <p className="mt-2 text-xs sm:text-sm text-[#656B73] dark:text-[#8A9098] leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* If Event has Stages / Rounds, Display Agenda Schedule */}
          {eventRounds.length > 0 && (
            <div className="border-t border-[#F0F1F2] dark:border-[#262A2E] pt-6 space-y-3">
              <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
                Competition Progression & Stages
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eventRounds.map((rnd) => (
                  <div key={rnd.id} className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#8A9098] uppercase">Stage {rnd.order}</span>
                      <Badge variant="secondary" className="text-[9px] capitalize">{rnd.status.replace("_", " ")}</Badge>
                    </div>
                    <h4 className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">{rnd.name}</h4>
                    <p className="text-[11px] text-[#656B73] dark:text-[#8A9098]">Venue: {rnd.venue}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Registration Section */}
      <div id="register" className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 sm:p-8 shadow-sm">
        {/* State A: Closed Registration */}
        {isRegistrationClosed ? (
          <div className="py-8 text-center space-y-3 max-w-md mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F5F6] dark:bg-[#151719] text-[#8A9098]">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17191C] dark:text-[#F1F2F3]">Registration is Closed</h3>
            <p className="text-xs text-[#656B73] dark:text-[#8A9098] leading-relaxed">
              Registrations for this event are now officially closed. If you already hold a valid entry pass, please present your QR code at the desk on the event day.
            </p>
            <Link href="/">
              <Button variant="outline" size="sm" className="rounded-full text-xs mt-2 border-[#E5E7EA] dark:border-[#30353A]">
                Explore Other SKETCH Events
              </Button>
            </Link>
          </div>
        ) : isRegistrationFull ? (
          /* State B: Full / Sold Out */
          <div className="py-8 text-center space-y-3 max-w-md mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F5F6] dark:bg-[#151719] text-[#8A9098]">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17191C] dark:text-[#F1F2F3]">Event Capacity Reached</h3>
            <p className="text-xs text-[#656B73] dark:text-[#8A9098] leading-relaxed">
              All {event.capacity} seats for {event.title} have been filled. Registration is currently full.
            </p>
            <Link href="/">
              <Button variant="outline" size="sm" className="rounded-full text-xs mt-2 border-[#E5E7EA] dark:border-[#30353A]">
                Discover Available Events
              </Button>
            </Link>
          </div>
        ) : isRegistrationUpcoming ? (
          /* State C: Upcoming / Draft */
          <div className="py-8 text-center space-y-3 max-w-md mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F5F6] dark:bg-[#151719] text-[#8A9098]">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17191C] dark:text-[#F1F2F3]">Registration Opening Soon</h3>
            <p className="text-xs text-[#656B73] dark:text-[#8A9098] leading-relaxed">
              Official registration for {event.title} is scheduled to open shortly. Check back or visit our event portal for announcements.
            </p>
          </div>
        ) : journeyStep === "confirmed" && registrationResult ? (
          /* State D: Confirmed Entry Pass Screen */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-sm">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#17191C] dark:text-[#F1F2F3]">
                {Boolean(registrationResult.isMockPreview ?? isPreview)
                  ? "Preview Registration Recorded"
                  : "Registration Confirmed!"}
              </h3>
              <p className="text-xs text-[#656B73] dark:text-[#8A9098] max-w-md mx-auto">
                {Boolean(registrationResult.isMockPreview ?? isPreview)
                  ? "A simulated participant pass has been generated in Preview Mode for "
                  : "Your official participant event pass has been generated for "}
                <strong className="text-[#17191C] dark:text-[#F1F2F3]">{registrationResult.email}</strong>.
              </p>

              {Boolean(registrationResult.isMockPreview ?? isPreview) && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200 max-w-md mx-auto text-center space-y-1">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-300">
                    Preview Mode • Local Non-Production Persistence
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This registration was validated and recorded in local preview storage. Authoritative database persistence will be active once connected to production Supabase.
                  </p>
                </div>
              )}

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F5F6] dark:bg-[#151719] border border-transparent dark:border-[#30353A] text-[10px] font-semibold text-[#656B73] dark:text-[#8A9098]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#17191C] dark:text-[#E8EAED]" />
                <span>
                  {Boolean(registrationResult.isMockPreview ?? isPreview)
                    ? "Client Preview Credential • Valid for Terminal Simulation"
                    : "Authoritative Verified Credential"}
                </span>
              </div>
            </div>

            {/* Live Visual Pass Card */}
            <div className="max-w-md mx-auto overflow-hidden rounded-3xl border-2 border-[#17191C] dark:border-[#30353A] bg-[#17191C] text-white p-6 shadow-xl relative">
              <div className="absolute top-0 right-0 p-8 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_70%)] pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                    {Boolean(registrationResult.isMockPreview ?? isPreview)
                      ? "SKETCH PREVIEW PASS"
                      : "SKETCH OFFICIAL PASS"}
                  </span>
                  <p className="font-mono text-xs font-bold text-white mt-0.5">
                    {registrationResult.registrationId}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-white text-[#17191C] font-bold text-[10px]">
                  {Boolean(registrationResult.isMockPreview ?? isPreview)
                    ? "PREVIEW PASS"
                    : "VERIFIED ENTRY"}
                </Badge>
              </div>

              {/* QR Code Frame */}
              <div className="my-5 flex flex-col items-center justify-center rounded-2xl bg-white p-4 text-[#17191C]">
                <div className="w-36 h-36 border-2 border-[#17191C] p-2 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-7 h-7 bg-[#17191C] p-1"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-[#17191C]" /></div></div>
                    <div className="w-7 h-7 bg-[#17191C] p-1"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-[#17191C]" /></div></div>
                  </div>
                  <div className="text-[9px] font-mono font-bold text-center">SKETCH PASS</div>
                  <div className="flex justify-between items-end">
                    <div className="w-7 h-7 bg-[#17191C] p-1"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-[#17191C]" /></div></div>
                    <div className="w-5 h-5 border border-dashed border-[#17191C]" />
                  </div>
                </div>
                <span className="mt-2 font-mono text-xs font-bold text-[#17191C]">
                  {registrationResult.registrationId}
                </span>
                <span className="text-[10px] text-[#8A9098]">
                  Hash: {registrationResult.qrCredentialId}
                </span>
              </div>

              <div className="space-y-1 text-center border-t border-white/10 pt-3">
                <h4 className="text-base font-bold text-white">{registrationResult.attendeeName}</h4>
                {registrationResult.teamName && (
                  <p className="text-xs font-medium text-white/80">Team: {registrationResult.teamName}</p>
                )}
                <p className="text-xs text-white/70">{event.title}</p>
                <p className="text-[11px] text-white/50">{event.venue}</p>
              </div>
            </div>

            {/* Official Community Link */}
            {event.communityLink && (
              <div className="max-w-md mx-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  <MessageCircle className="h-4 w-4" />
                  <span>Join the Official Participant Community</span>
                </div>
                <p className="text-[11px] text-[#656B73] dark:text-[#8A9098]">
                  Connect with fellow participants, team organizers, and mentors before the event day.
                </p>
                <a
                  href={event.communityLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] text-xs font-bold transition-transform hover:scale-[1.02] outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED]"
                >
                  <span>Join Discussion Group</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* Organizer Contact Info */}
            {(event.contactEmail || event.contactPhone) && (
              <div className="max-w-md mx-auto text-center text-xs text-[#8A9098] space-y-1 pt-2">
                <p className="font-medium text-[#656B73] dark:text-[#AEB3BA]">Questions or Check-in Assistance?</p>
                <div className="flex items-center justify-center flex-wrap gap-4 text-[11px]">
                  {event.contactEmail && (
                    <a href={`mailto:${event.contactEmail}`} className="hover:underline flex items-center gap-1">
                      <Mail className="h-3 w-3 text-[#17191C] dark:text-[#E8EAED]" />
                      <span>{event.contactEmail}</span>
                    </a>
                  )}
                  {event.contactPhone && (
                    <a href={`tel:${event.contactPhone}`} className="hover:underline flex items-center gap-1">
                      <Phone className="h-3 w-3 text-[#17191C] dark:text-[#E8EAED]" />
                      <span>{event.contactPhone}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="charcoal"
                className="flex-1 rounded-full text-xs font-semibold gap-1.5 h-11 shadow-sm"
                onClick={handleDownloadPassSvg}
              >
                <Download className="h-4 w-4" />
                <span>Download Pass (SVG)</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold h-11 dark:bg-[#1B1E21] dark:text-[#F1F2F3] dark:hover:bg-[#22262A]"
                onClick={() => {
                  setJourneyStep("form");
                  setFormValues({});
                  setErrors({});
                  setRegistrationResult(null);
                }}
              >
                <span>Register Another</span>
              </Button>
            </div>
          </div>
        ) : journeyStep === "review" ? (
          /* State E: Dynamic Review & Confirm Step */
          <div className="space-y-6 max-w-xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-[#17191C] dark:text-[#F1F2F3]">Review Registration Details</h2>
              <p className="text-xs text-[#656B73] dark:text-[#8A9098] mt-0.5">
                Confirm your submission information before generating your verified event entry pass.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#8A9098] font-medium">Selected Experience:</span>
                  <strong className="text-[#17191C] dark:text-[#F1F2F3]">{event.title}</strong>
                </div>
              </div>

              {formSchema.sections.map((section) => {
                const visibleFields = section.fields.filter(
                  (f) => f.type !== "info" && isFieldVisible(f, formValues)
                );
                if (visibleFields.length === 0) return null;

                return (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-5 space-y-3 text-xs"
                  >
                    <div className="font-bold text-[#17191C] dark:text-[#F1F2F3] border-b border-[#F0F1F2] dark:border-[#262A2E] pb-2 text-[13px]">
                      {section.title}
                    </div>
                    <div className="space-y-2">
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
                            className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-[#F0F1F2]/60 dark:border-[#262A2E]/60 gap-1"
                          >
                            <span className="text-[#8A9098] shrink-0 font-medium sm:max-w-[45%]">
                              {field.label}:
                            </span>
                            <span className="text-[#17191C] dark:text-[#F1F2F3] font-semibold sm:text-right break-words">
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

            {submissionError && (
              <div className="rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="space-y-1">
                  <p className="font-bold">Registration Failed</p>
                  <p>{submissionError}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="rounded-full text-xs h-11 px-5 border-[#E5E7EA] dark:border-[#30353A] dark:bg-[#1B1E21] dark:text-[#F1F2F3] dark:hover:bg-[#22262A]"
                onClick={() => {
                  setSubmissionError(null);
                  setJourneyStep("form");
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Edit Information
              </Button>
              <Button
                variant="charcoal"
                className="flex-1 rounded-full text-xs font-bold h-11 shadow-sm"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
              >
                {isSubmitting ? "Verifying & Generating Pass..." : "Confirm & Claim Pass"}
              </Button>
            </div>
          </div>
        ) : (
          /* State F: Main Dynamic Registration Form */
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
                <h2 className="text-xl font-bold text-[#17191C] dark:text-[#F1F2F3]">
                  {event.hasTeams ? "Team Pass Registration" : "Attendee Pass Registration"}
                </h2>
              </div>
              <p className="mt-1 text-xs text-[#656B73] dark:text-[#8A9098]">
                Direct registration for campus creators and technologists. Complete the form below to claim your verified pass.
              </p>
            </div>

            {/* Dynamic Form Engine */}
            <form onSubmit={handleProceedToReview} className="space-y-6">
              <DynamicFormRenderer
                schema={formSchema}
                values={formValues}
                onChange={handleFieldChange}
                errors={errors}
              />

              {/* Terms & Submit */}
              <div className="pt-4 border-t border-[#F0F1F2] dark:border-[#262A2E]">
                <Button
                  type="submit"
                  variant="charcoal"
                  size="lg"
                  className="w-full rounded-full font-bold shadow-sm h-11"
                >
                  <span>Review Registration & Claim Pass</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-[#8A9098]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#25292F] dark:text-[#E8EAED]" />
                <span>Instant verified registration. Free entry pass generated upon submission.</span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
