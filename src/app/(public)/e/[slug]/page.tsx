"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Mail,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Download,
  Share2,
  Sparkles,
  AlertCircle,
  Clock,
  Phone,
  Building2,
  UserPlus,
  Trash2,
  Shield,
  Layers,
  ArrowLeft,
  Check,
  Lock,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { MOCK_EVENTS, MOCK_ROUNDS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

interface PublicEventPageProps {
  params: Promise<{ slug: string }>;
}

interface TeamMemberInput {
  name: string;
  email: string;
  department: string;
}

export default function PublicEventPage({ params }: PublicEventPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  // Match event by slug or fallback
  const event =
    MOCK_EVENTS.find(
      (e) => e.slug === slug || e.slug === slug.replace("sketch-", "") || e.id === slug
    ) || MOCK_EVENTS[0];

  const eventRounds = MOCK_ROUNDS.filter((r) => r.eventId === event.id);

  // Registration journey state: "form" | "review" | "confirmed"
  const [journeyStep, setJourneyStep] = useState<"form" | "review" | "confirmed">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Individual form state
  const [individualData, setIndividualData] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "Computer Science",
    year: "3rd Year",
    dietary: "none",
    portfolioUrl: "",
    agreeTerms: true,
  });

  // Team form state (when event has teams)
  const [teamData, setTeamData] = useState({
    teamName: "",
    captainName: "",
    captainEmail: "",
    captainPhone: "",
    captainDepartment: "Computer Science",
    captainYear: "3rd Year",
    members: [
      { name: "", email: "", department: "Visual Arts" },
    ] as TeamMemberInput[],
    agreeTerms: true,
  });

  // Generated Registration Result
  const [registrationResult, setRegistrationResult] = useState<{
    registrationId: string;
    qrCredentialId: string;
    registeredAt: string;
    attendeeName: string;
    email: string;
    teamName?: string;
  } | null>(null);

  // Email format validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Add team member slot
  const handleAddMember = () => {
    if (teamData.members.length < 3) {
      setTeamData({
        ...teamData,
        members: [...teamData.members, { name: "", email: "", department: "Design" }],
      });
    }
  };

  // Remove team member slot
  const handleRemoveMember = (index: number) => {
    if (teamData.members.length > 1) {
      setTeamData({
        ...teamData,
        members: teamData.members.filter((_, i) => i !== index),
      });
    }
  };

  // Validate Step 1 form fields
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (event.hasTeams) {
      if (!teamData.teamName.trim()) newErrors.teamName = "Team name is required.";
      if (!teamData.captainName.trim()) newErrors.captainName = "Team captain name is required.";
      if (!teamData.captainEmail.trim()) {
        newErrors.captainEmail = "Captain email address is required.";
      } else if (!isValidEmail(teamData.captainEmail)) {
        newErrors.captainEmail = "Please enter a valid email address.";
      }

      teamData.members.forEach((m, idx) => {
        if (!m.name.trim()) newErrors[`member_${idx}_name`] = `Member #${idx + 2} name is required.`;
        if (!m.email.trim()) {
          newErrors[`member_${idx}_email`] = `Member #${idx + 2} email is required.`;
        } else if (!isValidEmail(m.email)) {
          newErrors[`member_${idx}_email`] = `Invalid email for Member #${idx + 2}.`;
        }
      });
    } else {
      if (!individualData.fullName.trim()) newErrors.fullName = "Full name is required.";
      if (!individualData.email.trim()) {
        newErrors.email = "Email address is required.";
      } else if (!isValidEmail(individualData.email)) {
        newErrors.email = "Please enter a valid university or personal email.";
      }
      if (!individualData.department.trim()) newErrors.department = "Department / Major is required.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setJourneyStep("review");
      window.scrollTo({ top: 450, behavior: "smooth" });
    }
  };

  // Final submission execution
  const handleFinalSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const generatedRegId = `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const generatedCredHash = `qr_cred_${Math.random().toString(36).substring(2, 10)}`;

      setRegistrationResult({
        registrationId: generatedRegId,
        qrCredentialId: generatedCredHash,
        registeredAt: new Date().toISOString(),
        attendeeName: event.hasTeams ? teamData.captainName : individualData.fullName,
        email: event.hasTeams ? teamData.captainEmail : individualData.email,
        teamName: event.hasTeams ? teamData.teamName : undefined,
      });

      setIsSubmitting(false);
      setJourneyStep("confirmed");
      window.scrollTo({ top: 350, behavior: "smooth" });
    }, 600);
  };

  // Download SVG Pass Image
  const handleDownloadPassSvg = () => {
    if (!registrationResult) return;

    const svgPass = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
  <rect width="600" height="800" rx="30" fill="#17191C"/>
  <circle cx="300" cy="150" r="240" fill="#FFFFFF" fill-opacity="0.04"/>
  
  <text x="50" y="70" font-family="sans-serif" font-size="12" font-weight="bold" letter-spacing="3" fill="#8A9098">SKETCH OFFICIAL EVENT PASS</text>
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
  
  <text x="50" y="630" font-family="sans-serif" font-size="11" fill="#8A9098">PARTICIPANT / CAPTAIN</text>
  <text x="50" y="655" font-family="sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF">${registrationResult.attendeeName}</text>
  
  ${registrationResult.teamName ? `<text x="50" y="695" font-family="sans-serif" font-size="11" fill="#8A9098">TEAM AFFILIATION</text><text x="50" y="720" font-family="sans-serif" font-size="16" font-weight="bold" fill="#FFFFFF">${registrationResult.teamName}</text>` : `<text x="50" y="695" font-family="sans-serif" font-size="11" fill="#8A9098">REGISTRATION STATUS</text><text x="50" y="720" font-family="sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF">Confirmed Individual Attendee</text>`}
  
  <text x="300" y="775" font-family="sans-serif" font-size="10" fill="#656B73" text-anchor="middle">CLIENT PREVIEW CREDENTIAL • PRESENT AT DESK SCANNER</text>
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

  const departmentOptions = [
    { value: "Computer Science", label: "Computer Science & Engineering" },
    { value: "Visual Arts", label: "Visual Arts & Communication" },
    { value: "Product Design", label: "Industrial & Product Design" },
    { value: "Human-Computer Interaction", label: "Human-Computer Interaction (HCI)" },
    { value: "Information Technology", label: "Information Technology" },
    { value: "Media Studies", label: "Design & Media Studies" },
    { value: "Other", label: "Other Academic Department" },
  ];

  const yearOptions = [
    { value: "1st Year", label: "1st Year (Freshman)" },
    { value: "2nd Year", label: "2nd Year (Sophomore)" },
    { value: "3rd Year", label: "3rd Year (Junior)" },
    { value: "4th Year", label: "4th Year (Senior)" },
    { value: "Postgraduate / Alumni", label: "Postgraduate / Master's / Alumni" },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Event Hero Card */}
      <div className="overflow-hidden rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-sm">
        {/* Poster Header */}
        <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-[#17191C]">
          <img
            src={event.posterUrl}
            alt={event.title}
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
                {event.hasTeams ? "Team (2-4 Members)" : "Individual Attendance"}
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
                Registration Confirmed!
              </h3>
              <p className="text-xs text-[#656B73] dark:text-[#8A9098] max-w-md mx-auto">
                Your official participant event pass has been generated for <strong className="text-[#17191C] dark:text-[#F1F2F3]">{registrationResult.email}</strong>.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F5F6] dark:bg-[#151719] border border-transparent dark:border-[#30353A] text-[10px] font-semibold text-[#656B73] dark:text-[#8A9098]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#17191C] dark:text-[#E8EAED]" />
                <span>Client Preview Credential • Valid for Terminal Check-in</span>
              </div>
            </div>

            {/* Live Visual Pass Card */}
            <div className="max-w-md mx-auto overflow-hidden rounded-3xl border-2 border-[#17191C] dark:border-[#30353A] bg-[#17191C] text-white p-6 shadow-xl relative">
              <div className="absolute top-0 right-0 p-8 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_70%)] pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                    SKETCH OFFICIAL PASS
                  </span>
                  <p className="font-mono text-xs font-bold text-white mt-0.5">
                    {registrationResult.registrationId}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-white text-[#17191C] font-bold text-[10px]">
                  VERIFIED ENTRY
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
                  setIndividualData({
                    fullName: "",
                    email: "",
                    phone: "",
                    department: "Computer Science",
                    year: "3rd Year",
                    dietary: "none",
                    portfolioUrl: "",
                    agreeTerms: true,
                  });
                }}
              >
                <span>Register Another</span>
              </Button>
            </div>
          </div>
        ) : journeyStep === "review" ? (
          /* State E: Review & Confirm Step */
          <div className="space-y-6 max-w-lg mx-auto">
            <div>
              <h2 className="text-lg font-bold text-[#17191C] dark:text-[#F1F2F3]">Review Registration Details</h2>
              <p className="text-xs text-[#656B73] dark:text-[#8A9098] mt-0.5">
                Confirm your submission information before generating your event pass.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                <span className="text-[#8A9098]">Experience:</span>
                <strong className="text-[#17191C] dark:text-[#F1F2F3]">{event.title}</strong>
              </div>

              {event.hasTeams ? (
                <>
                  <div className="flex justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                    <span className="text-[#8A9098]">Team Name:</span>
                    <strong className="text-[#17191C] dark:text-[#F1F2F3]">{teamData.teamName}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                    <span className="text-[#8A9098]">Captain:</span>
                    <span className="text-[#17191C] dark:text-[#F1F2F3] font-semibold">
                      {teamData.captainName} ({teamData.captainEmail})
                    </span>
                  </div>
                  <div className="py-1">
                    <span className="text-[#8A9098] block mb-1">Roster Members:</span>
                    {teamData.members.map((m, i) => (
                      <div key={i} className="text-[#17191C] dark:text-[#F1F2F3] pl-2 font-medium">
                        • {m.name} ({m.email}) — {m.department}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                    <span className="text-[#8A9098]">Attendee:</span>
                    <strong className="text-[#17191C] dark:text-[#F1F2F3]">{individualData.fullName}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                    <span className="text-[#8A9098]">Email:</span>
                    <span className="text-[#17191C] dark:text-[#F1F2F3]">{individualData.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                    <span className="text-[#8A9098]">Department:</span>
                    <span className="text-[#17191C] dark:text-[#F1F2F3]">{individualData.department}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#8A9098]">Academic Year:</span>
                    <span className="text-[#17191C] dark:text-[#F1F2F3]">{individualData.year}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="rounded-full text-xs h-11 px-5 border-[#E5E7EA] dark:border-[#30353A] dark:bg-[#1B1E21] dark:text-[#F1F2F3] dark:hover:bg-[#22262A]"
                onClick={() => setJourneyStep("form")}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Edit Info
              </Button>
              <Button
                variant="charcoal"
                className="flex-1 rounded-full text-xs font-bold h-11 shadow-sm"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
              >
                {isSubmitting ? "Generating Ticket Pass..." : "Confirm & Claim Pass"}
              </Button>
            </div>
          </div>
        ) : (
          /* State F: Main Registration Form */
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
                <h2 className="text-xl font-bold text-[#17191C] dark:text-[#F1F2F3]">
                  {event.hasTeams ? "Team Pass Registration" : "Attendee Pass Registration"}
                </h2>
              </div>
              <p className="mt-1 text-xs text-[#656B73] dark:text-[#8A9098]">
                Direct registration for campus creators and technologists. No persistent student login required.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleProceedToReview} className="space-y-5">
              {event.hasTeams ? (
                /* Team-Based Registration Fields */
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
                      Team Name *
                    </label>
                    <Input
                      placeholder="e.g., Pixel Forge / Syntax Sisters"
                      value={teamData.teamName}
                      onChange={(e) => setTeamData({ ...teamData, teamName: e.target.value })}
                      className={errors.teamName ? "border-red-500" : ""}
                    />
                    {errors.teamName && (
                      <p className="mt-1 text-[11px] font-medium text-red-600">{errors.teamName}</p>
                    )}
                  </div>

                  {/* Captain Details Box */}
                  <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
                      <h3 className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">Team Captain Information</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">Captain Name *</label>
                        <Input
                          placeholder="e.g., Aarav Sharma"
                          value={teamData.captainName}
                          onChange={(e) => setTeamData({ ...teamData, captainName: e.target.value })}
                          className={errors.captainName ? "border-red-500" : ""}
                        />
                        {errors.captainName && (
                          <p className="mt-1 text-[11px] font-medium text-red-600">{errors.captainName}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">Captain Email *</label>
                        <Input
                          type="email"
                          placeholder="e.g., aarav@college.edu"
                          value={teamData.captainEmail}
                          onChange={(e) => setTeamData({ ...teamData, captainEmail: e.target.value })}
                          className={errors.captainEmail ? "border-red-500" : ""}
                        />
                        {errors.captainEmail && (
                          <p className="mt-1 text-[11px] font-medium text-red-600">{errors.captainEmail}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <CustomSelect
                        label="Department"
                        options={departmentOptions}
                        value={teamData.captainDepartment}
                        onChange={(val) => setTeamData({ ...teamData, captainDepartment: val })}
                      />
                      <CustomSelect
                        label="Academic Year"
                        options={yearOptions}
                        value={teamData.captainYear}
                        onChange={(val) => setTeamData({ ...teamData, captainYear: val })}
                      />
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#656B73] dark:text-[#8A9098]">
                        Team Roster Members ({teamData.members.length + 1} of 4)
                      </h3>
                      {teamData.members.length < 3 && (
                        <button
                          type="button"
                          onClick={handleAddMember}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] hover:underline"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Add Member</span>
                        </button>
                      )}
                    </div>

                    {teamData.members.map((member, idx) => (
                      <div key={idx} className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] p-4 space-y-3 bg-white dark:bg-[#1B1E21]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">Member #{idx + 2}</span>
                          {teamData.members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(idx)}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Input
                              placeholder="Member Full Name *"
                              value={member.name}
                              onChange={(e) => {
                                const next = [...teamData.members];
                                next[idx].name = e.target.value;
                                setTeamData({ ...teamData, members: next });
                              }}
                              className={errors[`member_${idx}_name`] ? "border-red-500" : ""}
                            />
                            {errors[`member_${idx}_name`] && (
                              <p className="mt-1 text-[11px] font-medium text-red-600">
                                {errors[`member_${idx}_name`]}
                              </p>
                            )}
                          </div>

                          <div>
                            <Input
                              type="email"
                              placeholder="Member Email *"
                              value={member.email}
                              onChange={(e) => {
                                const next = [...teamData.members];
                                next[idx].email = e.target.value;
                                setTeamData({ ...teamData, members: next });
                              }}
                              className={errors[`member_${idx}_email`] ? "border-red-500" : ""}
                            />
                            {errors[`member_${idx}_email`] && (
                              <p className="mt-1 text-[11px] font-medium text-red-600">
                                {errors[`member_${idx}_email`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Individual Registration Fields */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
                        Full Name *
                      </label>
                      <Input
                        placeholder="e.g., Alex Morgan"
                        value={individualData.fullName}
                        onChange={(e) => setIndividualData({ ...individualData, fullName: e.target.value })}
                        className={errors.fullName ? "border-red-500" : ""}
                      />
                      {errors.fullName && (
                        <p className="mt-1 text-[11px] font-medium text-red-600">{errors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
                        University Email Address *
                      </label>
                      <Input
                        type="email"
                        placeholder="e.g., alex.morgan@college.edu"
                        value={individualData.email}
                        onChange={(e) => setIndividualData({ ...individualData, email: e.target.value })}
                        className={errors.email ? "border-red-500" : ""}
                      />
                      {errors.email && (
                        <p className="mt-1 text-[11px] font-medium text-red-600">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CustomSelect
                      label="Academic Department / Major *"
                      options={departmentOptions}
                      value={individualData.department}
                      onChange={(val) => setIndividualData({ ...individualData, department: val })}
                    />
                    <CustomSelect
                      label="Academic Year"
                      options={yearOptions}
                      value={individualData.year}
                      onChange={(val) => setIndividualData({ ...individualData, year: val })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
                      Phone Number (Optional)
                    </label>
                    <Input
                      type="tel"
                      placeholder="e.g., +91 98765 43210"
                      value={individualData.phone}
                      onChange={(e) => setIndividualData({ ...individualData, phone: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Terms & Submit */}
              <div className="pt-3 border-t border-[#F0F1F2] dark:border-[#262A2E]">
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
                <span>Free instant registration. No permanent student account required.</span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
