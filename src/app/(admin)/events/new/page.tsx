"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Users,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  AlertCircle,
  FileCheck2,
  Upload,
  Image as ImageIcon,
  Crop,
  RotateCcw,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect, SelectOption } from "@/components/ui/custom-select";
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { CustomSwitch } from "@/components/ui/custom-switch";
import { CustomDateTimePicker } from "@/components/ui/custom-datetime-picker";
import { RegistrationFormBuilder } from "@/components/forms/registration-form-builder";
import {
  DIET_CODE_TEMPLATE,
  STANDARD_INDIVIDUAL_TEMPLATE,
  HACKATHON_TEAM_TEMPLATE,
  cloneFormSchema,
} from "@/lib/form-templates";
import { saveEvent } from "@/lib/registration-store";
import { createEventAction } from "@/app/actions/event-actions";
import { EventItem, RegistrationFormSchema, HeroCardConfig } from "@/types";
import { useAuth } from "@/lib/auth/auth-context";
import { AccessDenied } from "@/components/auth/access-denied";
import { SmilingSun, RetroRainbowPill } from "@/components/public/retro-elements";

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: "Design", label: "Design", description: "Design sprints, UI/UX hackathons, and creative design systems" },
  { value: "Workshop", label: "Workshop", description: "Hands-on masterclasses and technical skill-building sessions" },
  { value: "Hackathon", label: "Hackathon", description: "Multi-stage rapid prototyping and developer competitions" },
  { value: "Conference", label: "Conference", description: "Keynote talks, panel discussions, and symposiums" },
  { value: "Exhibition", label: "Exhibition", description: "Kinetic typography, student archives, and installation galleries" },
];

const VENUE_MODE_OPTIONS: SelectOption[] = [
  { value: "in-person", label: "In-Person (On-Campus)", description: "Physical attendance at studio or auditorium" },
  { value: "online", label: "Virtual / Online", description: "Remote attendance via livestream or meeting room" },
  { value: "hybrid", label: "Hybrid", description: "Both physical venue and online broadcast stream" },
];

const PARTICIPATION_OPTIONS: SelectOption[] = [
  { value: "individual", label: "Individual Participants", description: "Single-attendee ticket registration" },
  { value: "team", label: "Team-Based Registration", description: "Groups with a designated team captain" },
];

const CURATED_POSTERS = [
  {
    label: "Minimal Architectural",
    url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Digital Monochrome",
    url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Studio Workshop",
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Kinetic Typography",
    url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80",
  },
];

interface RoundConfig {
  id: string;
  name: string;
  venue: string;
  advancementCriteria: string;
}

const STEPS = [
  { id: 1, name: "Basic Information", summary: "Event title, category & venue" },
  { id: 2, name: "Registration Form", summary: "Dynamic builder & capacity" },
  { id: 3, name: "Rounds & Stages", summary: "Competition pipeline" },
  { id: 4, name: "Review & Publish", summary: "Final confirmation" },
];

const FOCAL_PRESETS = [
  { label: "Center", value: "center center" },
  { label: "Top", value: "center top" },
  { label: "Bottom", value: "center bottom" },
  { label: "Left", value: "left center" },
  { label: "Right", value: "right center" },
];

export default function NewEventPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (user && user.role !== "master_admin" && user.role !== "event_manager") {
    return (
      <AccessDenied
        currentRole={user.role}
        requiredRoles={["master_admin", "event_manager"]}
        moduleName="Event Creation Wizard"
      />
    );
  }

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPublishedPreview, setIsPublishedPreview] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");
  const [createdEventId, setCreatedEventId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingMode, setSubmittingMode] = useState<"draft" | "publish" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [activeArtworkTab, setActiveArtworkTab] = useState<"directory" | "hero" | "herobox">("directory");
  const [directoryArtworkMode, setDirectoryArtworkMode] = useState<"preset" | "upload">("preset");
  const [heroArtworkMode, setHeroArtworkMode] = useState<"preset" | "upload">("preset");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Single unified form state with separate artwork assets and dynamic registration schema
  const [formData, setFormData] = useState({
    title: "",
    category: "Design",
    shortDescription: "",
    description: "",
    venueMode: "in-person",
    venue: "",
    startDate: "",
    endDate: "",
    // Legacy fallback + Directory Card Artwork (16:9)
    posterUrl: CURATED_POSTERS[0].url,
    focalPoint: "center center",
    directoryImage: CURATED_POSTERS[0].url,
    directoryImageFocalPoint: "center center",
    isDirectoryCustomUpload: false,
    directoryCustomFileName: "",
    // Public Hero Panoramic Artwork
    heroImage: CURATED_POSTERS[1].url,
    heroImageFocalPoint: "center center",
    isHeroCustomUpload: false,
    heroCustomFileName: "",
    artworkAlt: "",
    // Retro Hero Card Box Customization (FlowFest Neo-Brutalist Theme)
    heroCardConfig: {
      kicker: "CAMPUS CREATORS & INNOVATORS EXPERIENCE",
      bubbleText: "",
      buttonText: "Get Pass Now",
      photoBadge: "Free Entry",
      photoCaption: "SKETCH Official",
      polaroidUrl: "",
      bgColor: "#FFFDF7",
      bgImageUrl: "",
      showMascot: true,
    } as HeroCardConfig,
    capacity: 150,
    registrationDeadline: "",
    participationMode: "individual",
    minTeamSize: 2,
    maxTeamSize: 4,
    registrationForm: cloneFormSchema(STANDARD_INDIVIDUAL_TEMPLATE),
    hasRounds: false,
    rounds: [
      {
        id: "r-1",
        name: "Stage 1: Idea Pitch & Wireframe Review",
        venue: "Studio Lab A",
        advancementCriteria: "Top 25 teams advance to Stage 2",
      },
      {
        id: "r-2",
        name: "Stage 2: High-Fidelity Prototype Demo",
        venue: "Auditorium Main Stage",
        advancementCriteria: "Final 5 teams pitch to jury",
      },
    ] as RoundConfig[],
  });

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "directory" | "hero" | "polaroid" | "herobg"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Unsupported format. Please upload JPEG, PNG, or WebP.");
      return;
    }

    const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Image exceeds the 4 MB limit. Please select a smaller image.");
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const rawDataUrl = loadEvt.target?.result as string;
      if (!rawDataUrl) return;

      const applyOptimizedImage = (finalDataUrl: string) => {
        if (target === "directory") {
          setFormData((prev) => ({
            ...prev,
            directoryImage: finalDataUrl,
            posterUrl: finalDataUrl, // legacy compatibility
            isDirectoryCustomUpload: true,
            directoryCustomFileName: file.name,
          }));
          setDirectoryArtworkMode("upload");
        } else if (target === "hero") {
          setFormData((prev) => ({
            ...prev,
            heroImage: finalDataUrl,
            isHeroCustomUpload: true,
            heroCustomFileName: file.name,
          }));
          setHeroArtworkMode("upload");
        } else if (target === "polaroid") {
          setFormData((prev) => ({
            ...prev,
            heroCardConfig: {
              ...prev.heroCardConfig,
              polaroidUrl: finalDataUrl,
            },
          }));
        } else if (target === "herobg") {
          setFormData((prev) => ({
            ...prev,
            heroCardConfig: {
              ...prev.heroCardConfig,
              bgImageUrl: finalDataUrl,
            },
          }));
        }
      };

      const img = new window.Image();
      img.onload = () => {
        try {
          const maxDimension = 1600;
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            applyOptimizedImage(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const outputMime = file.type === "image/png" ? "image/webp" : "image/jpeg";
          const compressed = canvas.toDataURL(outputMime, 0.84);
          applyOptimizedImage(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
        } catch {
          applyOptimizedImage(rawDataUrl);
        }
      };
      img.onerror = () => applyOptimizedImage(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUpload = (target: "directory" | "hero") => {
    if (target === "directory") {
      setFormData((prev) => ({
        ...prev,
        directoryImage: CURATED_POSTERS[0].url,
        posterUrl: CURATED_POSTERS[0].url,
        isDirectoryCustomUpload: false,
        directoryCustomFileName: "",
        directoryImageFocalPoint: "center center",
        focalPoint: "center center",
      }));
      setDirectoryArtworkMode("preset");
    } else {
      setFormData((prev) => ({
        ...prev,
        heroImage: CURATED_POSTERS[1].url,
        isHeroCustomUpload: false,
        heroCustomFileName: "",
        heroImageFocalPoint: "center center",
      }));
      setHeroArtworkMode("preset");
    }
    setUploadError(null);
  };

  // Validation logic per step
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title.trim()) {
        errs.title = "Event title is required.";
      } else if (formData.title.trim().length < 4) {
        errs.title = "Event title must be at least 4 characters.";
      }

      if (!formData.venue.trim()) {
        errs.venue = "Venue location or meeting link is required.";
      }

      if (!formData.shortDescription.trim()) {
        errs.shortDescription = "A short summary is required for event cards.";
      }

      if (!formData.startDate) {
        errs.startDate = "Event start date & time is required.";
      }

      if (!formData.endDate) {
        errs.endDate = "Event end date & time is required.";
      } else if (formData.startDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
        errs.endDate = "End date & time must be after the start date.";
      }
    }

    if (step === 2) {
      if (!formData.capacity || formData.capacity < 1) {
        errs.capacity = "Capacity must be at least 1 participant.";
      }

      if (formData.participationMode === "team") {
        if (formData.minTeamSize < 1) {
          errs.minTeamSize = "Minimum team size must be at least 1.";
        }
        if (formData.maxTeamSize < formData.minTeamSize) {
          errs.maxTeamSize = "Maximum team size cannot be less than minimum size.";
        }
      }
    }

    if (step === 3) {
      if (formData.hasRounds) {
        if (formData.rounds.length === 0) {
          errs.rounds = "Please configure at least one stage or disable multi-round structure.";
        } else {
          formData.rounds.forEach((r, idx) => {
            if (!r.name.trim()) {
              errs[`round_${idx}`] = `Stage #${idx + 1} requires a valid name.`;
            }
          });
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrors({});
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrev = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleJumpToStep = (stepNumber: number) => {
    setErrors({});
    setCurrentStep(stepNumber);
  };

  // Round management
  const addRound = () => {
    const nextIdx = formData.rounds.length + 1;
    setFormData({
      ...formData,
      rounds: [
        ...formData.rounds,
        {
          id: `r-${Date.now()}`,
          name: `Stage ${nextIdx}: Evaluation Round`,
          venue: formData.venue || "Design Lab Studio",
          advancementCriteria: "Advancement by Jury Score",
        },
      ],
    });
  };

  const updateRound = (index: number, field: keyof RoundConfig, val: string) => {
    const updated = [...formData.rounds];
    updated[index] = { ...updated[index], [field]: val };
    setFormData({ ...formData, rounds: updated });
  };

  const removeRound = (index: number) => {
    if (formData.rounds.length <= 1) return;
    const updated = formData.rounds.filter((_, i) => i !== index);
    setFormData({ ...formData, rounds: updated });
  };

  const handlePublish = async (isDraft: boolean) => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      if (!validateStep(1)) setCurrentStep(1);
      else if (!validateStep(2)) setCurrentStep(2);
      else setCurrentStep(3);
      return;
    }

    const toIsoString = (val: string) => {
      if (!val) return "";
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toISOString();
        }
      } catch {}
      return val;
    };

    const generatedSlug =
      formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `event-${Date.now()}`;

    setIsSubmitting(true);
    setSubmittingMode(isDraft ? "draft" : "publish");
    setSubmitError(null);

    const payload = {
      title: formData.title.trim(),
      slug: generatedSlug,
      category: formData.category,
      shortDescription: formData.shortDescription.trim() || undefined,
      description: (formData.description || formData.shortDescription).trim() || undefined,
      posterUrl: formData.directoryImage || formData.posterUrl || "",
      heroImage: formData.heroImage || formData.directoryImage || formData.posterUrl || "",
      heroImageFocalPoint: formData.heroImageFocalPoint || formData.directoryImageFocalPoint || formData.focalPoint || "center center",
      directoryImage: formData.directoryImage || formData.posterUrl || "",
      directoryImageFocalPoint: formData.directoryImageFocalPoint || formData.focalPoint || "center center",
      startDate: toIsoString(formData.startDate),
      endDate: toIsoString(formData.endDate),
      venue: formData.venue.trim(),
      venueMode: formData.venueMode as "in-person" | "online" | "hybrid",
      capacity: Number(formData.capacity) || 1,
      lifecycle: isDraft ? ("draft" as const) : ("published" as const),
      registrationState: isDraft ? ("upcoming" as const) : ("open" as const),
      hasTeams: formData.participationMode === "team",
      minTeamSize: formData.participationMode === "team" ? Number(formData.minTeamSize) : null,
      maxTeamSize: formData.participationMode === "team" ? Number(formData.maxTeamSize) : null,
      hasRounds: formData.hasRounds,
      featured: false,
      heroCardConfig: formData.heroCardConfig as unknown as Record<string, unknown>,
      registrationForm: formData.registrationForm as unknown as Record<string, unknown>,
    };

    try {
      const res = await createEventAction(payload);
      if (!res.success) {
        setSubmitError(res.message || "Failed to create event. Please verify all fields.");
        setIsSubmitting(false);
        setSubmittingMode(null);
        return;
      }

      const created = res.data;
      setCreatedSlug(created.slug);
      setCreatedEventId(created.id);
      setIsSubmitting(false);
      setSubmittingMode(null);

      if (isDraft) {
        router.push(`/events/${created.id}`);
      } else {
        setIsPublishedPreview(true);
      }
    } catch (err: any) {
      setSubmitError(err?.message || "An unexpected error occurred during submission.");
      setIsSubmitting(false);
      setSubmittingMode(null);
    }
  };

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-5xl mx-auto text-[#17191C]">
      {/* Top Breadcrumb & Step Info */}
      <div className="flex items-center justify-between">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#858B93] hover:text-[#17191C] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Event Directory</span>
        </Link>
        <span className="text-xs font-semibold text-[#858B93]">
          Step {currentStep} of 4: {STEPS[currentStep - 1].name}
        </span>
      </div>

      <div>
        <span className="text-[11px] font-semibold tracking-wider text-[#858B93] uppercase">
          SKETCHHUB WORKSPACE / EVENTS / NEW EVENT
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight text-[#17191C]">
          Create New Event
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#858B93]">
          Configure event details, dynamic registration form, and multi-stage competition pipelines
        </p>
      </div>

      {/* Connected Monochrome Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-[#E5E7E9] bg-white p-3 shadow-xs">
        {STEPS.map((step) => {
          const isCurrent = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (step.id < currentStep) handleJumpToStep(step.id);
              }}
              disabled={step.id > currentStep}
              className={`flex items-center gap-2.5 rounded-lg p-2.5 text-left transition-all outline-none focus-visible:ring-1 focus-visible:ring-[#17191C] ${
                isCurrent
                  ? "bg-[#17191C] text-white shadow-xs"
                  : isCompleted
                  ? "bg-[#F8F9FA] text-[#17191C] hover:bg-[#F2F3F4] cursor-pointer border border-[#E5E7E9]"
                  : "bg-transparent text-[#858B93] cursor-not-allowed opacity-60"
              }`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                  isCurrent
                    ? "bg-white text-[#17191C]"
                    : isCompleted
                    ? "bg-[#17191C] text-white"
                    : "bg-[#EAECEF] text-[#858B93]"
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : step.id}
              </div>
              <div className="hidden sm:flex flex-col min-w-0">
                <span className={`text-xs font-bold truncate ${isCurrent ? "text-white" : isCompleted ? "text-[#17191C]" : "text-[#858B93]"}`}>
                  {step.name}
                </span>
                <span className={`text-[10px] truncate ${isCurrent ? "text-white/70" : "text-[#858B93]"}`}>
                  {step.summary}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Wizard Form Card */}
      <div className="rounded-xl border border-[#E5E7E9]  bg-white p-6 sm:p-8 shadow-sm">
        <AnimatePresence mode="wait">
          {/* STEP 1: Basic Information */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-[#F4F5F6]  pb-3">
                <h2 className="text-base font-bold text-[#34383D] ">1. Basic Information & Logistics</h2>
                <p className="text-xs text-[#858B93]  mt-0.5">Define core event metadata and public presentation.</p>
              </div>

              <div className="space-y-4">
                {/* Event Title */}
                <div>
                  <label className="text-xs font-semibold text-[#34383D]  block mb-1">
                    Event Title *
                  </label>
                  <Input
                    placeholder="e.g., Sketch Design Sprint 2026"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.title}</p>}
                </div>

                {/* Category & Venue Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CustomSelect
                    label="Category *"
                    options={CATEGORY_OPTIONS}
                    value={formData.category}
                    onChange={(val) => setFormData({ ...formData, category: val })}
                  />

                  <CustomSelect
                    label="Delivery Mode *"
                    options={VENUE_MODE_OPTIONS}
                    value={formData.venueMode}
                    onChange={(val) => setFormData({ ...formData, venueMode: val })}
                  />
                </div>

                {/* Venue Location */}
                <div>
                  <label className="text-xs font-semibold text-[#34383D]  block mb-1">
                    Venue / Room / Online Link *
                  </label>
                  <Input
                    placeholder="e.g., Design Lab Studio A & B, Campus Media Center"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className={errors.venue ? "border-red-500" : ""}
                  />
                  {errors.venue && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.venue}</p>}
                </div>

                {/* Date & Time Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CustomDateTimePicker
                    label="Start Date & Time"
                    required
                    value={formData.startDate}
                    onChange={(val) => {
                      setFormData({ ...formData, startDate: val });
                      if (errors.startDate) setErrors({ ...errors, startDate: "" });
                    }}
                    error={errors.startDate}
                    placeholder="Select start date & time..."
                  />

                  <CustomDateTimePicker
                    label="End Date & Time"
                    required
                    value={formData.endDate}
                    onChange={(val) => {
                      setFormData({ ...formData, endDate: val });
                      if (errors.endDate) setErrors({ ...errors, endDate: "" });
                    }}
                    error={errors.endDate}
                    minDate={formData.startDate}
                    placeholder="Select end date & time..."
                  />
                </div>

                {/* Short Description */}
                <div>
                  <label className="text-xs font-semibold text-[#34383D]  block mb-1">
                    Short Summary (Event Cards) *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="A concise 1-2 sentence synopsis shown in discovery cards and outbox dispatches..."
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E7E9]  bg-white p-3 text-xs text-[#34383D]  placeholder:text-[#858B93] dark:placeholder:text-[#7D858F] focus:border-[#25292F] dark:focus:border-[#E8EAED] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
                  />
                  {errors.shortDescription && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.shortDescription}</p>}
                </div>

                {/* Event Cover Artwork Manager (Separate Directory Card & Public Hero Assets) */}
                <div className="space-y-4 rounded-xl border border-[#E5E7E9]  bg-[#F9FAFB]  p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#F0F1F2]  pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-[#34383D]  block">
                          Event Artwork Assets
                        </label>
                        <span className="rounded-full bg-[#EAECEF]  px-2 py-0.2 text-[9.5px] font-semibold text-[#858B93] ">
                          Independent 16:9 & Hero
                        </span>
                      </div>
                      <p className="text-[11px] text-[#858B93]  mt-0.5">
                        Configure independent images and crop anchors for Directory Cards and the Public Registration Hero banner.
                      </p>
                    </div>

                    {/* Role Tab Selector (Directory vs Hero vs HeroBox) */}
                    <div className="inline-flex rounded-full border border-[#E5E7E9] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-0.5 text-xs font-semibold shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveArtworkTab("directory")}
                        className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                          activeArtworkTab === "directory"
                            ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                            : "text-[#858B93] hover:text-[#34383D] dark:hover:text-[#F1F2F3]"
                        }`}
                      >
                        <span>Directory Card (16:9)</span>
                        {formData.isDirectoryCustomUpload && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveArtworkTab("hero")}
                        className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                          activeArtworkTab === "hero"
                            ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                            : "text-[#858B93] hover:text-[#34383D] dark:hover:text-[#F1F2F3]"
                        }`}
                      >
                        <span>Public Banner</span>
                        {formData.isHeroCustomUpload && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveArtworkTab("herobox")}
                        className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                          activeArtworkTab === "herobox"
                            ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                            : "text-[#858B93] hover:text-[#34383D] dark:hover:text-[#F1F2F3]"
                        }`}
                      >
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span>Retro Hero Box</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Asset Configuration Panel */}
                  {activeArtworkTab === "directory" && (
                    /* ===================== DIRECTORY ARTWORK TAB ===================== */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#858B93] ">
                          Directory Card Image Source
                        </span>
                        <div className="inline-flex rounded-full border border-[#E5E7E9]  bg-white p-0.5 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setDirectoryArtworkMode("preset")}
                            className={`px-2.5 py-0.5 rounded-full transition-all ${
                              directoryArtworkMode === "preset"
                                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                                : "text-[#858B93] "
                            }`}
                          >
                            Presets
                          </button>
                          <button
                            type="button"
                            onClick={() => setDirectoryArtworkMode("upload")}
                            className={`px-2.5 py-0.5 rounded-full transition-all flex items-center gap-1 ${
                              directoryArtworkMode === "upload"
                                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                                : "text-[#858B93] "
                            }`}
                          >
                            <Upload className="h-3 w-3" />
                            <span>Upload</span>
                          </button>
                        </div>
                      </div>

                      {directoryArtworkMode === "preset" ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {CURATED_POSTERS.map((poster) => (
                            <div
                              key={poster.label}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  directoryImage: poster.url,
                                  posterUrl: poster.url,
                                  isDirectoryCustomUpload: false,
                                  directoryCustomFileName: "",
                                });
                              }}
                              className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                                formData.directoryImage === poster.url && !formData.isDirectoryCustomUpload
                                  ? "border-[#25292F] dark:border-[#E8EAED] shadow-sm ring-1 ring-[#25292F] dark:ring-[#E8EAED]"
                                  : "border-transparent opacity-70 hover:opacity-100"
                              }`}
                            >
                              <img
                                src={poster.url}
                                alt={poster.label}
                                style={{ objectPosition: formData.directoryImageFocalPoint }}
                                className="h-16 w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1.5">
                                <span className="text-[9.5px] font-bold text-white leading-tight">
                                  {poster.label}
                                </span>
                              </div>
                              {formData.directoryImage === poster.url && !formData.isDirectoryCustomUpload && (
                                <div className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]">
                                  <Check className="h-2 w-2 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border-2 border-dashed border-[#D4D7DC]  bg-white">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6F7F8]  text-[#25292F] ">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#34383D] ">
                                {formData.isDirectoryCustomUpload
                                  ? formData.directoryCustomFileName || "Custom Directory Image"
                                  : "Upload Directory Card Image"}
                              </div>
                              <p className="text-[11px] text-[#858B93] ">
                                JPEG, PNG, or WebP · Max 4 MB (auto-optimized).
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] text-xs font-semibold hover:opacity-90 transition-opacity">
                              <Upload className="h-3 w-3" />
                              <span>{formData.isDirectoryCustomUpload ? "Replace" : "Choose File"}</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => handleFileUpload(e, "directory")}
                                className="hidden"
                              />
                            </label>
                            {formData.isDirectoryCustomUpload && (
                              <button
                                type="button"
                                onClick={() => handleRemoveUpload("directory")}
                                className="p-1 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Remove directory upload"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Directory Focal Controls */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#34383D] ">
                          <Crop className="h-3.5 w-3.5" />
                          <span>Directory 16:9 Focal Anchor</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {FOCAL_PRESETS.map((fp) => (
                            <button
                              key={fp.label}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  directoryImageFocalPoint: fp.value,
                                  focalPoint: fp.value,
                                })
                              }
                              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-medium transition-colors ${
                                formData.directoryImageFocalPoint === fp.value
                                  ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                                  : "border border-[#E5E7E9]  text-[#858B93]  hover:bg-[#F6F7F8] dark:hover:bg-[#22262A]"
                              }`}
                            >
                              {fp.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===================== PUBLIC HERO BANNER TAB ===================== */}
                  {activeArtworkTab === "hero" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#858B93] ">
                          Public Hero Banner Image Source
                        </span>
                        <div className="inline-flex rounded-full border border-[#E5E7E9]  bg-white p-0.5 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setHeroArtworkMode("preset")}
                            className={`px-2.5 py-0.5 rounded-full transition-all ${
                              heroArtworkMode === "preset"
                                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                                : "text-[#858B93] "
                            }`}
                          >
                            Presets
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeroArtworkMode("upload")}
                            className={`px-2.5 py-0.5 rounded-full transition-all flex items-center gap-1 ${
                              heroArtworkMode === "upload"
                                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                                : "text-[#858B93] "
                            }`}
                          >
                            <Upload className="h-3 w-3" />
                            <span>Upload</span>
                          </button>
                        </div>
                      </div>

                      {heroArtworkMode === "preset" ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {CURATED_POSTERS.map((poster) => (
                            <div
                              key={poster.label}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  heroImage: poster.url,
                                  isHeroCustomUpload: false,
                                  heroCustomFileName: "",
                                });
                              }}
                              className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                                formData.heroImage === poster.url && !formData.isHeroCustomUpload
                                  ? "border-[#25292F] dark:border-[#E8EAED] shadow-sm ring-1 ring-[#25292F] dark:ring-[#E8EAED]"
                                  : "border-transparent opacity-70 hover:opacity-100"
                              }`}
                            >
                              <img
                                src={poster.url}
                                alt={poster.label}
                                style={{ objectPosition: formData.heroImageFocalPoint }}
                                className="h-16 w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1.5">
                                <span className="text-[9.5px] font-bold text-white leading-tight">
                                  {poster.label}
                                </span>
                              </div>
                              {formData.heroImage === poster.url && !formData.isHeroCustomUpload && (
                                <div className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]">
                                  <Check className="h-2 w-2 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border-2 border-dashed border-[#D4D7DC]  bg-white">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6F7F8]  text-[#25292F] ">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#34383D] ">
                                {formData.isHeroCustomUpload
                                  ? formData.heroCustomFileName || "Custom Hero Banner"
                                  : "Upload Public Hero Banner Image"}
                              </div>
                              <p className="text-[11px] text-[#858B93] ">
                                JPEG, PNG, or WebP · Max 4 MB (auto-optimized · Panoramic crop).
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] text-xs font-semibold hover:opacity-90 transition-opacity">
                              <Upload className="h-3 w-3" />
                              <span>{formData.isHeroCustomUpload ? "Replace" : "Choose File"}</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => handleFileUpload(e, "hero")}
                                className="hidden"
                              />
                            </label>
                            {formData.isHeroCustomUpload && (
                              <button
                                type="button"
                                onClick={() => handleRemoveUpload("hero")}
                                className="p-1 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Remove hero upload"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hero Focal Controls */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#34383D] ">
                          <Crop className="h-3.5 w-3.5" />
                          <span>Hero Panoramic Focal Anchor</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {FOCAL_PRESETS.map((fp) => (
                            <button
                              key={fp.label}
                              type="button"
                              onClick={() => setFormData({ ...formData, heroImageFocalPoint: fp.value })}
                              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-medium transition-colors ${
                                formData.heroImageFocalPoint === fp.value
                                  ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                                  : "border border-[#E5E7E9]  text-[#858B93]  hover:bg-[#F6F7F8] dark:hover:bg-[#22262A]"
                              }`}
                            >
                              {fp.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===================== RETRO HERO BOX & POLAROID TAB ===================== */}
                  {activeArtworkTab === "herobox" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#858B93]">
                          Retro Hero Box & Polaroid Styling (FlowFest Theme)
                        </span>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Applied to Public Event Page
                        </span>
                      </div>

                      {/* Controls Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#F8F9FA] dark:bg-[#1A1D20] p-3.5 rounded-2xl border border-[#E5E7E9] dark:border-[#2E3338]">
                        {/* Kicker subtitle */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#34383D] dark:text-[#E8EAED]">
                            Header Kicker Subtitle
                          </label>
                          <Input
                            value={formData.heroCardConfig.kicker || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                heroCardConfig: { ...formData.heroCardConfig, kicker: e.target.value },
                              })
                            }
                            placeholder="e.g. CAMPUS CREATORS & INNOVATORS EXPERIENCE"
                            className="h-8 text-xs bg-white dark:bg-[#22262A]"
                          />
                        </div>

                        {/* Speech Bubble text */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#34383D] dark:text-[#E8EAED]">
                            Mascot Speech Bubble Text
                          </label>
                          <Input
                            value={formData.heroCardConfig.bubbleText || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                heroCardConfig: { ...formData.heroCardConfig, bubbleText: e.target.value },
                              })
                            }
                            placeholder="Auto: Date • Venue (or custom text)"
                            className="h-8 text-xs bg-white dark:bg-[#22262A]"
                          />
                        </div>

                        {/* CTA Button Text */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#34383D] dark:text-[#E8EAED]">
                            Action CTA Button Text
                          </label>
                          <Input
                            value={formData.heroCardConfig.buttonText || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                heroCardConfig: { ...formData.heroCardConfig, buttonText: e.target.value },
                              })
                            }
                            placeholder="e.g. Get Pass Now"
                            className="h-8 text-xs bg-white dark:bg-[#22262A]"
                          />
                        </div>

                        {/* Mascot Sun Toggle */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#22262A] border border-[#E5E7E9] dark:border-[#30353A]">
                          <div>
                            <span className="text-xs font-bold text-[#34383D] dark:text-[#E8EAED] block">
                              Show Smiling Sun Mascot
                            </span>
                            <span className="text-[10.5px] text-[#858B93]">
                              Interactive spinning sun with winking face
                            </span>
                          </div>
                          <CustomSwitch
                            checked={formData.heroCardConfig.showMascot !== false}
                            onChange={(checked) =>
                              setFormData({
                                ...formData,
                                heroCardConfig: { ...formData.heroCardConfig, showMascot: checked },
                              })
                            }
                          />
                        </div>

                        {/* Polaroid Corner Badge */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#34383D] dark:text-[#E8EAED]">
                            Polaroid Corner Badge
                          </label>
                          <Input
                            value={formData.heroCardConfig.photoBadge || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                heroCardConfig: { ...formData.heroCardConfig, photoBadge: e.target.value },
                              })
                            }
                            placeholder="e.g. Free Entry, VIP, RSVP"
                            className="h-8 text-xs bg-white dark:bg-[#22262A]"
                          />
                        </div>

                        {/* Polaroid Bottom Caption */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#34383D] dark:text-[#E8EAED]">
                            Polaroid Bottom Caption
                          </label>
                          <Input
                            value={formData.heroCardConfig.photoCaption || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                heroCardConfig: { ...formData.heroCardConfig, photoCaption: e.target.value },
                              })
                            }
                            placeholder="e.g. SKETCH Official"
                            className="h-8 text-xs bg-white dark:bg-[#22262A]"
                          />
                        </div>

                        {/* Card Background Color Selector */}
                        <div className="sm:col-span-2 space-y-1.5">
                          <label className="text-[11px] font-bold text-[#34383D] dark:text-[#E8EAED] flex items-center justify-between">
                            <span>Card Background Color Tint</span>
                            <span className="text-[10px] text-[#858B93] font-mono">{formData.heroCardConfig.bgColor || "#FFFDF7"}</span>
                          </label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {[
                              { label: "Classic Cream", value: "#FFFDF7" },
                              { label: "Pure White", value: "#FFFFFF" },
                              { label: "Warm Sand", value: "#FFF8E7" },
                              { label: "Peach Glow", value: "#FDF2E9" },
                              { label: "Soft Mint", value: "#F0FDF4" },
                            ].map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    heroCardConfig: { ...formData.heroCardConfig, bgColor: c.value },
                                  })
                                }
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                  (formData.heroCardConfig.bgColor || "#FFFDF7") === c.value
                                    ? "border-[#121212] ring-2 ring-[#121212]/30 shadow-xs bg-white dark:bg-[#22262A]"
                                    : "border-[#E5E7E9] dark:border-[#3A3F45] bg-white/60 dark:bg-[#1B1E21] hover:opacity-90"
                                }`}
                              >
                                <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: c.value }} />
                                <span>{c.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Polaroid Photo Custom Upload / URL */}
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] font-bold text-[#34383D] dark:text-[#E8EAED]">
                            Custom Polaroid Photo (Optional · Defaults to Event Artwork)
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={formData.heroCardConfig.polaroidUrl || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  heroCardConfig: { ...formData.heroCardConfig, polaroidUrl: e.target.value },
                                })
                              }
                              placeholder="Image URL or upload custom photo ->"
                              className="h-8 text-xs flex-1 bg-white dark:bg-[#22262A]"
                            />
                            <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] text-xs font-semibold hover:opacity-90 transition-opacity shrink-0">
                              <Upload className="h-3 w-3" />
                              <span>Upload Photo</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => handleFileUpload(e, "polaroid")}
                                className="hidden"
                              />
                            </label>
                            {formData.heroCardConfig.polaroidUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    heroCardConfig: { ...formData.heroCardConfig, polaroidUrl: "" },
                                  })
                                }
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Clear custom polaroid"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card Background Image Texture */}
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] font-bold text-[#34383D] dark:text-[#E8EAED]">
                            Card Background Image Texture / Pattern (Optional)
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={formData.heroCardConfig.bgImageUrl || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  heroCardConfig: { ...formData.heroCardConfig, bgImageUrl: e.target.value },
                                })
                              }
                              placeholder="Subtle background pattern or texture URL ->"
                              className="h-8 text-xs flex-1 bg-white dark:bg-[#22262A]"
                            />
                            <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] text-xs font-semibold hover:opacity-90 transition-opacity shrink-0">
                              <Upload className="h-3 w-3" />
                              <span>Upload Pattern</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => handleFileUpload(e, "herobg")}
                                className="hidden"
                              />
                            </label>
                            {formData.heroCardConfig.bgImageUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    heroCardConfig: { ...formData.heroCardConfig, bgImageUrl: "" },
                                  })
                                }
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Clear texture"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mini Live Preview of the Retro Hero Box */}
                      <div
                        className="rounded-2xl border-2 border-black p-4 shadow-[3px_4px_0_0_#121212] space-y-3 transition-colors"
                        style={{
                          backgroundColor: formData.heroCardConfig.bgColor || "#FFFDF7",
                          backgroundImage: formData.heroCardConfig.bgImageUrl ? `url(${formData.heroCardConfig.bgImageUrl})` : undefined,
                          backgroundSize: "cover",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-black/60 font-quicksand">
                            Live Retro Hero Box Preview
                          </span>
                          <RetroRainbowPill className="h-2.5 w-14" />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              {formData.heroCardConfig.showMascot !== false && (
                                <SmilingSun className="w-8 h-8 shrink-0" spin={false} interactive={false} />
                              )}
                              <div className="px-3 py-1 rounded-xl bg-retro-orange text-white text-[11px] font-bold border border-black shadow-[2px_2px_0_0_#121212]">
                                {formData.heroCardConfig.bubbleText || `${formData.startDate ? formData.startDate.slice(0, 10) : "Nov 15, 2026"} • ${formData.venue || "Studio Lab"}`}
                              </div>
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/60 font-quicksand">
                              {formData.heroCardConfig.kicker || "CAMPUS CREATORS & INNOVATORS EXPERIENCE"}
                            </div>
                            <div className="font-peachy font-black text-xl text-black">
                              {formData.title || "Sketch Event Title"}
                            </div>
                            <button type="button" className="px-4 py-1.5 rounded-full bg-retro-orange text-white text-xs font-black border border-black shadow-[2px_2px_0_0_#121212] flex items-center gap-1 font-quicksand">
                              <span>{formData.heroCardConfig.buttonText || "Get Pass Now"}</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Polaroid Mini Card */}
                          <div className="w-36 rounded-xl border-2 border-black bg-white p-1.5 shadow-[2px_3px_0_0_#121212] rotate-1 shrink-0">
                            <div className="relative h-24 w-full rounded-lg border border-black overflow-hidden bg-retro-yellow/30">
                              <img
                                src={formData.heroCardConfig.polaroidUrl || formData.directoryImage || formData.heroImage || CURATED_POSTERS[0].url}
                                alt="Polaroid Preview"
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-white text-[8px] font-black border border-black font-quicksand">
                                {formData.heroCardConfig.photoBadge || "Free Entry"}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between px-1">
                              <span className="text-[9px] font-bold text-black/70 font-quicksand">
                                {formData.heroCardConfig.photoCaption || "SKETCH Official"}
                              </span>
                              <RetroRainbowPill className="h-1.5 w-8" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="flex items-center gap-2 text-xs font-medium text-red-600 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Triple Independent Live Previews */}
                  <div className="border-t border-[#F0F1F2] dark:border-[#25292F] pt-3">
                    <span className="text-[10px] font-bold text-[#858B93] uppercase tracking-wider block mb-2">
                      Live Layout Previews (Click to Edit Any Asset)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* 1. Directory Card Presentation (Renders directoryImage) */}
                      <div
                        onClick={() => setActiveArtworkTab("directory")}
                        className={`cursor-pointer rounded-xl border p-2 space-y-1.5 transition-all ${
                          activeArtworkTab === "directory"
                            ? "border-[#25292F] dark:border-[#E8EAED] bg-white dark:bg-[#1B1E21] shadow-xs"
                            : "border-[#E5E7E9] dark:border-[#30353A] bg-white/60 dark:bg-[#1B1E21]/60 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#858B93] uppercase tracking-wider">
                            1. Directory Card (16:9)
                          </span>
                          {activeArtworkTab === "directory" && (
                            <span className="text-[9.5px] font-semibold text-[#34383D] dark:text-[#E8EAED] underline">
                              Editing
                            </span>
                          )}
                        </div>
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-[#17191C]">
                          <img
                            src={formData.directoryImage || formData.posterUrl}
                            alt="Card Cover Preview"
                            style={{ objectPosition: formData.directoryImageFocalPoint || formData.focalPoint }}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white uppercase backdrop-blur-xs">
                            {formData.category}
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 text-white">
                            <p className="text-xs font-bold truncate">{formData.title || "Untitled Experience"}</p>
                          </div>
                        </div>
                      </div>

                      {/* 2. Public Hero Banner Presentation (Renders heroImage) */}
                      <div
                        onClick={() => setActiveArtworkTab("hero")}
                        className={`cursor-pointer rounded-xl border p-2 space-y-1.5 transition-all ${
                          activeArtworkTab === "hero"
                            ? "border-[#25292F] dark:border-[#E8EAED] bg-white dark:bg-[#1B1E21] shadow-xs"
                            : "border-[#E5E7E9] dark:border-[#30353A] bg-white/60 dark:bg-[#1B1E21]/60 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#858B93] uppercase tracking-wider">
                            2. Public Banner
                          </span>
                          {activeArtworkTab === "hero" && (
                            <span className="text-[9.5px] font-semibold text-[#34383D] dark:text-[#E8EAED] underline">
                              Editing
                            </span>
                          )}
                        </div>
                        <div className="relative aspect-video sm:h-[95px] w-full rounded-lg overflow-hidden bg-[#17191C]">
                          <img
                            src={formData.heroImage || formData.directoryImage || formData.posterUrl}
                            alt="Hero Cover Preview"
                            style={{ objectPosition: formData.heroImageFocalPoint || formData.focalPoint }}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 text-white">
                            <span className="text-[9.5px] font-mono tracking-wider uppercase text-white/70 truncate">
                              Panoramic Banner
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3. Retro Hero Box Presentation (Renders heroCardConfig) */}
                      <div
                        onClick={() => setActiveArtworkTab("herobox")}
                        className={`cursor-pointer rounded-xl border p-2 space-y-1.5 transition-all ${
                          activeArtworkTab === "herobox"
                            ? "border-[#25292F] dark:border-[#E8EAED] bg-white dark:bg-[#1B1E21] shadow-xs"
                            : "border-[#E5E7E9] dark:border-[#30353A] bg-white/60 dark:bg-[#1B1E21]/60 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#858B93] uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                            <span>3. Retro Hero Box</span>
                          </span>
                          {activeArtworkTab === "herobox" && (
                            <span className="text-[9.5px] font-semibold text-[#34383D] dark:text-[#E8EAED] underline">
                              Editing
                            </span>
                          )}
                        </div>
                        <div
                          className="relative aspect-video sm:h-[95px] w-full rounded-lg border border-black/30 p-2 flex items-center justify-between overflow-hidden shadow-xs"
                          style={{
                            backgroundColor: formData.heroCardConfig.bgColor || "#FFFDF7",
                            backgroundImage: formData.heroCardConfig.bgImageUrl ? `url(${formData.heroCardConfig.bgImageUrl})` : undefined,
                            backgroundSize: "cover",
                          }}
                        >
                          <div className="space-y-1 z-10 max-w-[65%]">
                            <div className="flex items-center gap-1">
                              {formData.heroCardConfig.showMascot !== false && (
                                <SmilingSun className="w-4 h-4 shrink-0" spin={false} interactive={false} />
                              )}
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-retro-orange text-white border border-black truncate">
                                {formData.heroCardConfig.bubbleText || "Date • Venue"}
                              </span>
                            </div>
                            <p className="font-peachy font-black text-xs text-black truncate leading-tight">
                              {formData.title || "Sketch Event"}
                            </p>
                            <span className="inline-block text-[8px] font-bold px-2 py-0.5 rounded-full bg-retro-orange text-white border border-black">
                              {formData.heroCardConfig.buttonText || "Get Pass"}
                            </span>
                          </div>
                          <div className="w-14 h-16 rounded border border-black bg-white p-0.5 rotate-2 shrink-0 shadow-xs">
                            <div className="relative h-10 w-full overflow-hidden rounded-xs bg-retro-yellow/30">
                              <img
                                src={formData.heroCardConfig.polaroidUrl || formData.directoryImage || formData.heroImage || CURATED_POSTERS[0].url}
                                alt="Polaroid"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="text-[6px] font-bold text-center text-black/70 pt-0.5 truncate">
                              {formData.heroCardConfig.photoCaption || "SKETCH"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Registration Rules & Capacity */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-[#F4F5F6]  pb-3">
                <h2 className="text-base font-bold text-[#34383D] ">2. Registration Rules & Capacity</h2>
                <p className="text-xs text-[#858B93]  mt-0.5">Control attendee quotas, participation structure, and form fields.</p>
              </div>

              <div className="space-y-5">
                {/* Capacity & Participation Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#34383D]  block mb-1">
                      Max Registration Capacity (Seats) *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                      className={errors.capacity ? "border-red-500" : ""}
                    />
                    <p className="text-[11px] text-[#858B93]  mt-1">
                      Public registration automatically closes when capacity is reached.
                    </p>
                    {errors.capacity && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.capacity}</p>}
                  </div>

                  <CustomSelect
                    label="Participation Mode *"
                    options={PARTICIPATION_OPTIONS}
                    value={formData.participationMode}
                    onChange={(val) => setFormData({ ...formData, participationMode: val })}
                  />
                </div>

                {/* Conditional Team Size Settings */}
                {formData.participationMode === "team" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-[#E5E7E9]  bg-[#F9FAFB]  p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#25292F] " />
                      <h3 className="text-xs font-bold text-[#34383D] ">Team Roster Configuration</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#34383D]  block mb-1">Min Team Members</label>
                        <Input
                          type="number"
                          min={1}
                          value={formData.minTeamSize}
                          onChange={(e) => setFormData({ ...formData, minTeamSize: Number(e.target.value) })}
                        />
                        {errors.minTeamSize && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.minTeamSize}</p>}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#34383D]  block mb-1">Max Team Members</label>
                        <Input
                          type="number"
                          min={formData.minTeamSize}
                          value={formData.maxTeamSize}
                          onChange={(e) => setFormData({ ...formData, maxTeamSize: Number(e.target.value) })}
                        />
                        {errors.maxTeamSize && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.maxTeamSize}</p>}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Registration Form Builder */}
                <div className="space-y-3 border-t border-[#F4F5F6]  pt-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-[#25292F] " />
                      <h3 className="text-sm font-bold text-[#34383D] ">
                        Custom Registration Form Builder
                      </h3>
                    </div>
                    <p className="text-xs text-[#858B93]  mt-0.5">
                      Design custom questions, dropdowns, conditional logic, and member rules. Test interactive behavior in the live preview.
                    </p>
                  </div>

                  <RegistrationFormBuilder
                    schema={formData.registrationForm}
                    onChange={(nextSchema) =>
                      setFormData({ ...formData, registrationForm: nextSchema })
                    }
                    participationMode={formData.participationMode}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Rounds & Competition Stages */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-[#F4F5F6]  pb-3">
                <h2 className="text-base font-bold text-[#34383D] ">3. Competition Rounds & Progression</h2>
                <p className="text-xs text-[#858B93]  mt-0.5">Configure multi-stage elimination or single-stage unified sessions.</p>
              </div>

              {/* Multi-Round Switch */}
              <div className="rounded-xl border border-[#E5E7E9]  bg-[#F9FAFB]  p-4">
                <CustomSwitch
                  checked={formData.hasRounds}
                  onChange={(c) => setFormData({ ...formData, hasRounds: c })}
                  label="Enable Multi-Stage Progression Structure"
                  description="Required for Hackathons and Sprints with jury shortlisting between rounds."
                />
              </div>

              {/* Conditional Round Builder */}
              {formData.hasRounds ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#34383D] ">
                      Configured Stages ({formData.rounds.length})
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRound}
                      className="rounded-full border-[#E5E7E9]  text-xs font-semibold gap-1.5 h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Next Stage</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formData.rounds.map((round, idx) => (
                      <div
                        key={round.id}
                        className="rounded-xl border border-[#E5E7E9]  bg-white  p-4 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-[#F4F5F6]  pb-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] text-xs font-bold">
                            {idx + 1}
                          </span>
                          {formData.rounds.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRound(idx)}
                              className="text-xs text-red-500 hover:text-red-400 font-semibold inline-flex items-center gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-[#34383D]  block mb-1">
                              Stage Name *
                            </label>
                            <Input
                              placeholder="e.g. Stage 1: Idea Pitch"
                              value={round.name}
                              onChange={(e) => updateRound(idx, "name", e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-[#34383D]  block mb-1">
                              Stage Venue / Room
                            </label>
                            <Input
                              placeholder="e.g. Auditorium Stage"
                              value={round.venue}
                              onChange={(e) => updateRound(idx, "venue", e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-[#34383D]  block mb-1">
                            Advancement Criteria / Quota
                          </label>
                          <Input
                            placeholder="e.g., Top 20 teams qualify by Jury Score"
                            value={round.advancementCriteria}
                            onChange={(e) => updateRound(idx, "advancementCriteria", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#E5E7E9]  bg-[#F6F7F8]/50 /50 p-6 text-center space-y-2">
                  <FileCheck2 className="mx-auto h-8 w-8 text-[#858B93] " />
                  <h3 className="text-xs font-bold text-[#34383D] ">Single-Stage Unified Session</h3>
                  <p className="text-xs text-[#858B93]  max-w-md mx-auto">
                    All registered attendees participate in a single continuous session. Recommended for workshops, keynotes, and exhibitions.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: Review & Publish */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-[#F4F5F6]  pb-3">
                <h2 className="text-base font-bold text-[#34383D] ">4. Review Event Specification</h2>
                <p className="text-xs text-[#858B93]  mt-0.5">Confirm all configuration before saving or launching.</p>
              </div>

              {/* Submission Error Banner */}
              {submitError && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-red-900 dark:text-red-200">
                      Failed to Create Event
                    </h4>
                    <p className="text-xs text-red-700/90 dark:text-red-300/90 leading-relaxed">
                      {submitError}
                    </p>
                  </div>
                </div>
              )}

              {/* Review Sections */}
              <div className="space-y-4 text-xs">
                {/* Section 1: Basic Info */}
                <div className="rounded-xl border border-[#E5E7E9]  bg-[#F9FAFB]  p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E5E7E9]  pb-2">
                    <span className="font-bold text-[#34383D] ">Basic Information</span>
                    <button
                      type="button"
                      onClick={() => handleJumpToStep(1)}
                      className="text-[#25292F]  font-semibold hover:underline"
                    >
                      Edit Step 1
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[#858B93] ">
                    <div>Title: <strong className="text-[#34383D] ">{formData.title}</strong></div>
                    <div>Category: <strong className="text-[#34383D] ">{formData.category}</strong></div>
                    <div>Mode: <strong className="text-[#34383D]  capitalize">{formData.venueMode}</strong></div>
                    <div>Venue: <strong className="text-[#34383D] ">{formData.venue}</strong></div>
                    <div>Schedule: <strong className="text-[#34383D] ">{formData.startDate || "TBD"}</strong></div>
                  </div>
                </div>

                {/* Section 2: Registration Rules */}
                <div className="rounded-xl border border-[#E5E7E9]  bg-[#F9FAFB]  p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E5E7E9]  pb-2">
                    <span className="font-bold text-[#34383D] ">Registration Rules & Capacity</span>
                    <button
                      type="button"
                      onClick={() => handleJumpToStep(2)}
                      className="text-[#25292F]  font-semibold hover:underline"
                    >
                      Edit Step 2
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[#858B93] ">
                    <div>Capacity: <strong className="text-[#34383D] ">{formData.capacity} Seats</strong></div>
                    <div>Participation: <strong className="text-[#34383D]  capitalize">{formData.participationMode}</strong></div>
                    {formData.participationMode === "team" && (
                      <div>Team Size: <strong className="text-[#34383D] ">{formData.minTeamSize} – {formData.maxTeamSize} Members</strong></div>
                    )}
                  </div>
                </div>

                {/* Section 2.5: Custom Registration Form */}
                <div className="rounded-xl border border-[#E5E7E9]  bg-[#F9FAFB]  p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E5E7E9]  pb-2">
                    <span className="font-bold text-[#34383D] ">Configured Registration Form</span>
                    <button
                      type="button"
                      onClick={() => handleJumpToStep(2)}
                      className="text-[#25292F]  font-semibold hover:underline"
                    >
                      Edit Form
                    </button>
                  </div>
                  <div className="space-y-1.5 text-[#858B93] ">
                    <div>
                      Form Architecture: <strong className="text-[#34383D] ">{formData.registrationForm.sections.length} Sections, {formData.registrationForm.sections.reduce((acc, s) => acc + s.fields.length, 0)} Total Questions</strong>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formData.registrationForm.sections.flatMap((s) => s.fields).slice(0, 8).map((f) => (
                        <span key={f.id} className="rounded-md bg-white  border border-[#E5E7E9]  px-2 py-0.5 text-[10px] text-[#34383D] ">
                          {f.label} {f.required && "*"}
                        </span>
                      ))}
                      {formData.registrationForm.sections.flatMap((s) => s.fields).length > 8 && (
                        <span className="text-[10px] text-[#858B93] self-center">
                          +{formData.registrationForm.sections.flatMap((s) => s.fields).length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Competition Pipeline */}
                <div className="rounded-xl border border-[#E5E7E9]  bg-[#F9FAFB]  p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E5E7E9]  pb-2">
                    <span className="font-bold text-[#34383D] ">Competition Pipeline</span>
                    <button
                      type="button"
                      onClick={() => handleJumpToStep(3)}
                      className="text-[#25292F]  font-semibold hover:underline"
                    >
                      Edit Step 3
                    </button>
                  </div>
                  <div>
                    {formData.hasRounds ? (
                      <p className="text-[#34383D]  font-semibold">
                        Multi-Stage Structure ({formData.rounds.length} Configured Stages)
                      </p>
                    ) : (
                      <p className="text-[#858B93] ">Single-Stage Unified Session</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Footer Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-[#F4F5F6]  pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1 || isSubmitting}
            className="rounded-full border-[#E5E7E9]  text-xs font-semibold px-5"
          >
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              variant="charcoal"
              onClick={handleNext}
              className="rounded-full text-xs font-semibold px-6 gap-1.5 shadow-sm"
            >
              <span>Next Step</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePublish(true)}
                disabled={isSubmitting}
                className="rounded-full border-[#E5E7E9]  text-xs font-semibold px-4 gap-1.5"
              >
                {isSubmitting && submittingMode === "draft" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Draft...</span>
                  </>
                ) : (
                  <span>Save as Draft</span>
                )}
              </Button>
              <Button
                type="button"
                variant="charcoal"
                onClick={() => handlePublish(false)}
                disabled={isSubmitting}
                className="rounded-full text-xs font-semibold px-5 shadow-sm gap-1.5"
              >
                {isSubmitting && submittingMode === "publish" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Publishing Event...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Publish Event</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Published Preview Modal */}
      {isPublishedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#E5E7E9]  bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#34383D] ">
                Event Published (Preview Mode)
              </h3>
              <p className="text-xs text-[#858B93] ">
                &quot;{formData.title}&quot; has been configured with its custom registration form and is ready for participant entries.
              </p>
            </div>

            <div className="rounded-xl border border-[#E5E7E9]  bg-[#F9FAFB]  p-3 text-xs text-[#858B93]  text-left space-y-1">
              <div>Capacity: <strong className="text-[#34383D] ">{formData.capacity} Seats</strong></div>
              <div>Category: <strong className="text-[#34383D] ">{formData.category}</strong></div>
              <div>Form Questions: <strong className="text-[#34383D] ">{formData.registrationForm.sections.reduce((acc, s) => acc + s.fields.length, 0)} Fields</strong></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full text-xs font-semibold"
                onClick={() => router.push("/events")}
              >
                Return to Directory
              </Button>
              {createdEventId && (
                <Link href={`/events/${createdEventId}`} className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full rounded-full text-xs font-semibold"
                  >
                    Manage Event
                  </Button>
                </Link>
              )}
              <Link href={`/e/${createdSlug}`} className="flex-1">
                <Button
                  variant="charcoal"
                  className="w-full rounded-full text-xs font-semibold shadow-sm"
                >
                  View Public Form
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
