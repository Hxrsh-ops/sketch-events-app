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
import { MOCK_EVENTS } from "@/lib/mock-data";
import { saveEvent } from "@/lib/registration-store";
import { EventItem, RegistrationFormSchema } from "@/types";

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
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPublishedPreview, setIsPublishedPreview] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");

  const [artworkMode, setArtworkMode] = useState<"preset" | "upload">("preset");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Single unified form state with dynamic registration schema
  const [formData, setFormData] = useState({
    title: "",
    category: "Design",
    shortDescription: "",
    description: "",
    venueMode: "in-person",
    venue: "",
    startDate: "",
    endDate: "",
    posterUrl: CURATED_POSTERS[0].url,
    focalPoint: "center center",
    isCustomUpload: false,
    customUploadFileName: "",
    artworkAlt: "",
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Unsupported format. Please upload JPEG, PNG, or WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image exceeds 5 MB limit. Please select a smaller file.");
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({
          ...prev,
          posterUrl: dataUrl,
          isCustomUpload: true,
          customUploadFileName: file.name,
          artworkAlt: prev.title ? `${prev.title} Cover` : "Event Cover Artwork",
        }));
        setArtworkMode("upload");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUpload = () => {
    setFormData((prev) => ({
      ...prev,
      posterUrl: CURATED_POSTERS[0].url,
      isCustomUpload: false,
      customUploadFileName: "",
      focalPoint: "center center",
    }));
    setArtworkMode("preset");
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
        if (formData.minTeamSize < 2) {
          errs.minTeamSize = "Minimum team size must be at least 2.";
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

  const handlePublish = (isDraft: boolean) => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setCurrentStep(1);
      return;
    }

    const generatedSlug =
      formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `event-${Date.now()}`;
    const newId = `evt-${Date.now().toString(36)}`;

    const newEventItem: EventItem = {
      id: newId,
      slug: generatedSlug,
      title: formData.title,
      category: formData.category as any,
      shortDescription: formData.shortDescription,
      description: formData.description || formData.shortDescription,
      posterUrl: formData.posterUrl,
      focalPoint: formData.focalPoint,
      startDate: formData.startDate,
      endDate: formData.endDate,
      venue: formData.venue,
      venueMode: formData.venueMode as any,
      capacity: formData.capacity,
      registeredCount: 0,
      checkedInCount: 0,
      lifecycle: isDraft ? "draft" : "published",
      registrationState: "open",
      hasTeams: formData.participationMode === "team",
      hasRounds: formData.hasRounds,
      minTeamSize: formData.minTeamSize,
      maxTeamSize: formData.maxTeamSize,
      registrationForm: formData.registrationForm,
    };

    saveEvent(newEventItem);
    setCreatedSlug(generatedSlug);

    if (isDraft) {
      alert(`Event "${formData.title}" saved as Draft (Preview Mode).`);
      router.push("/events");
    } else {
      setIsPublishedPreview(true);
    }
  };

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-4xl mx-auto text-[#17191C] dark:text-[#F1F2F3]">
      {/* Top Breadcrumb & Step Info */}
      <div className="flex items-center justify-between">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#656B73] dark:text-[#A6ADB5] hover:text-[#17191C] dark:hover:text-[#F1F2F3] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Event Directory</span>
        </Link>
        <span className="text-xs font-semibold text-[#8A9098] dark:text-[#7D858F]">
          Step {currentStep} of 4: {STEPS[currentStep - 1].name}
        </span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
          Create New Event
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#A6ADB5]">
          Configure event details, registration thresholds, and multi-stage competition pipelines
        </p>
      </div>

      {/* Connected Monochrome Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3 shadow-sm">
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
              className={`flex items-center gap-2.5 rounded-xl p-2 text-left transition-all outline-none ${
                isCurrent
                  ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                  : isCompleted
                  ? "bg-[#F9FAFB] dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#2A2F35] cursor-pointer"
                  : "bg-transparent text-[#8A9098] dark:text-[#7D858F] cursor-not-allowed opacity-60"
              }`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent
                    ? "bg-white dark:bg-[#111315] text-[#25292F] dark:text-[#E8EAED]"
                    : isCompleted
                    ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                    : "bg-[#E5E7EA] dark:bg-[#30353A] text-[#8A9098] dark:text-[#7D858F]"
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : step.id}
              </div>
              <div className="hidden sm:flex flex-col min-w-0">
                <span className={`text-xs font-bold truncate ${isCurrent ? "text-white dark:text-[#111315]" : isCompleted ? "text-[#17191C] dark:text-[#F1F2F3]" : "text-[#8A9098] dark:text-[#7D858F]"}`}>
                  {step.name}
                </span>
                <span className={`text-[10px] truncate ${isCurrent ? "text-white/70 dark:text-[#111315]/70" : "text-[#8A9098] dark:text-[#7D858F]"}`}>
                  {step.summary}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Wizard Form Card */}
      <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 sm:p-8 shadow-sm">
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
              <div className="border-b border-[#F4F5F6] dark:border-[#262A2E] pb-3">
                <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">1. Basic Information & Logistics</h2>
                <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] mt-0.5">Define core event metadata and public presentation.</p>
              </div>

              <div className="space-y-4">
                {/* Event Title */}
                <div>
                  <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
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
                  <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
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
                  <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
                    Short Summary (Event Cards) *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="A concise 1-2 sentence synopsis shown in discovery cards and outbox dispatches..."
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    className="w-full rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] dark:placeholder:text-[#7D858F] focus:border-[#25292F] dark:focus:border-[#E8EAED] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
                  />
                  {errors.shortDescription && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.shortDescription}</p>}
                </div>

                {/* Event Cover Artwork Manager */}
                <div className="space-y-3 rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#F0F1F2] dark:border-[#262A2E] pb-3">
                    <div>
                      <label className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3] block">
                        Event Cover Artwork
                      </label>
                      <p className="text-[11px] text-[#656B73] dark:text-[#8A9098] mt-0.5">
                        Choose an approved curated preset or upload custom artwork from your computer.
                      </p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="inline-flex rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setArtworkMode("preset")}
                        className={`px-3 py-1 rounded-full transition-all ${
                          artworkMode === "preset"
                            ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                            : "text-[#656B73] dark:text-[#8A9098]"
                        }`}
                      >
                        Curated Presets
                      </button>
                      <button
                        type="button"
                        onClick={() => setArtworkMode("upload")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                          artworkMode === "upload"
                            ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                            : "text-[#656B73] dark:text-[#8A9098]"
                        }`}
                      >
                        <Upload className="h-3 w-3" />
                        <span>Upload Custom</span>
                      </button>
                    </div>
                  </div>

                  {artworkMode === "preset" ? (
                    /* Preset Grid */
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      {CURATED_POSTERS.map((poster) => (
                        <div
                          key={poster.label}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              posterUrl: poster.url,
                              isCustomUpload: false,
                              customUploadFileName: "",
                            });
                          }}
                          className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                            formData.posterUrl === poster.url && !formData.isCustomUpload
                              ? "border-[#25292F] dark:border-[#E8EAED] shadow-sm ring-1 ring-[#25292F] dark:ring-[#E8EAED]"
                              : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={poster.url}
                            alt={poster.label}
                            style={{ objectPosition: formData.focalPoint }}
                            className="h-20 w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2">
                            <span className="text-[10px] font-bold text-white leading-tight">
                              {poster.label}
                            </span>
                          </div>
                          {formData.posterUrl === poster.url && !formData.isCustomUpload && (
                            <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Custom Image Upload Dropzone */
                    <div className="space-y-4 pt-1">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border-2 border-dashed border-[#D4D7DC] dark:border-[#30353A] bg-white dark:bg-[#1B1E21]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#151719] text-[#25292F] dark:text-[#E8EAED]">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">
                              {formData.isCustomUpload
                                ? formData.customUploadFileName || "Custom Artwork Uploaded"
                                : "Upload Event Artwork"}
                            </div>
                            <p className="text-[11px] text-[#8A9098] dark:text-[#7D858F]">
                              Supports JPEG, PNG, WebP up to 5 MB. Client preview representation.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] text-xs font-semibold hover:opacity-90 transition-opacity">
                            <Upload className="h-3.5 w-3.5" />
                            <span>{formData.isCustomUpload ? "Replace File" : "Choose File"}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                          {formData.isCustomUpload && (
                            <button
                              type="button"
                              onClick={handleRemoveUpload}
                              className="p-1.5 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Remove custom artwork"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {uploadError && (
                        <div className="flex items-center gap-2 text-xs font-medium text-red-600 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{uploadError}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Crop & Focal Point Controls */}
                  <div className="border-t border-[#F0F1F2] dark:border-[#262A2E] pt-3 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                        <Crop className="h-3.5 w-3.5" />
                        <span>Focal Alignment & Crop Anchor</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {FOCAL_PRESETS.map((fp) => (
                          <button
                            key={fp.label}
                            type="button"
                            onClick={() => setFormData({ ...formData, focalPoint: fp.value })}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                              formData.focalPoint === fp.value
                                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                                : "border border-[#E5E7EA] dark:border-[#30353A] text-[#656B73] dark:text-[#A6ADB5] hover:bg-[#F4F5F6] dark:hover:bg-[#22262A]"
                            }`}
                          >
                            {fp.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dual Live Aspect Ratio Previews */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* 1. Directory Card Presentation */}
                      <div className="rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-2 space-y-1.5">
                        <span className="text-[10px] font-bold text-[#8A9098] uppercase tracking-wider block">
                          Directory Card Preview (16:9)
                        </span>
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-[#17191C]">
                          <img
                            src={formData.posterUrl}
                            alt="Card Cover Preview"
                            style={{ objectPosition: formData.focalPoint }}
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

                      {/* 2. Public Hero Banner Presentation */}
                      <div className="rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-2 space-y-1.5">
                        <span className="text-[10px] font-bold text-[#8A9098] uppercase tracking-wider block">
                          Public Hero Banner Preview (Panoramic)
                        </span>
                        <div className="relative h-[90px] w-full rounded-lg overflow-hidden bg-[#17191C]">
                          <img
                            src={formData.posterUrl}
                            alt="Hero Cover Preview"
                            style={{ objectPosition: formData.focalPoint }}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 text-white">
                            <span className="text-[10px] font-mono tracking-wider uppercase text-white/70 truncate">
                              Official Header Banner
                            </span>
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
              <div className="border-b border-[#F4F5F6] dark:border-[#262A2E] pb-3">
                <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">2. Registration Rules & Capacity</h2>
                <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] mt-0.5">Control attendee quotas, participation structure, and form fields.</p>
              </div>

              <div className="space-y-5">
                {/* Capacity & Participation Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
                      Max Registration Capacity (Seats) *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                      className={errors.capacity ? "border-red-500" : ""}
                    />
                    <p className="text-[11px] text-[#8A9098] dark:text-[#7D858F] mt-1">
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
                    className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
                      <h3 className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">Team Roster Configuration</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#17191C] dark:text-[#F1F2F3] block mb-1">Min Team Members</label>
                        <Input
                          type="number"
                          min={2}
                          value={formData.minTeamSize}
                          onChange={(e) => setFormData({ ...formData, minTeamSize: Number(e.target.value) })}
                        />
                        {errors.minTeamSize && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.minTeamSize}</p>}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#17191C] dark:text-[#F1F2F3] block mb-1">Max Team Members</label>
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
                <div className="space-y-3 border-t border-[#F4F5F6] dark:border-[#262A2E] pt-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
                      <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
                        Custom Registration Form Builder
                      </h3>
                    </div>
                    <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] mt-0.5">
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
              <div className="border-b border-[#F4F5F6] dark:border-[#262A2E] pb-3">
                <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">3. Competition Rounds & Progression</h2>
                <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] mt-0.5">Configure multi-stage elimination or single-stage unified sessions.</p>
              </div>

              {/* Multi-Round Switch */}
              <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4">
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
                    <span className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">
                      Configured Stages ({formData.rounds.length})
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRound}
                      className="rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold gap-1.5 h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Next Stage</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formData.rounds.map((round, idx) => (
                      <div
                        key={round.id}
                        className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-4 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-[#F4F5F6] dark:border-[#262A2E] pb-2">
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
                            <label className="text-[11px] font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
                              Stage Name *
                            </label>
                            <Input
                              placeholder="e.g. Stage 1: Idea Pitch"
                              value={round.name}
                              onChange={(e) => updateRound(idx, "name", e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
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
                          <label className="text-[11px] font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
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
                <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6]/50 dark:bg-[#151719]/50 p-6 text-center space-y-2">
                  <FileCheck2 className="mx-auto h-8 w-8 text-[#8A9098] dark:text-[#7D858F]" />
                  <h3 className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">Single-Stage Unified Session</h3>
                  <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] max-w-md mx-auto">
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
              <div className="border-b border-[#F4F5F6] dark:border-[#262A2E] pb-3">
                <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">4. Review Event Specification</h2>
                <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] mt-0.5">Confirm all configuration before saving or launching.</p>
              </div>

              {/* Review Sections */}
              <div className="space-y-4 text-xs">
                {/* Section 1: Basic Info */}
                <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] pb-2">
                    <span className="font-bold text-[#17191C] dark:text-[#F1F2F3]">Basic Information</span>
                    <button
                      type="button"
                      onClick={() => handleJumpToStep(1)}
                      className="text-[#25292F] dark:text-[#E8EAED] font-semibold hover:underline"
                    >
                      Edit Step 1
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[#656B73] dark:text-[#A6ADB5]">
                    <div>Title: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{formData.title}</strong></div>
                    <div>Category: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{formData.category}</strong></div>
                    <div>Mode: <strong className="text-[#17191C] dark:text-[#F1F2F3] capitalize">{formData.venueMode}</strong></div>
                    <div>Venue: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{formData.venue}</strong></div>
                    <div>Schedule: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{formData.startDate || "TBD"}</strong></div>
                  </div>
                </div>

                {/* Section 2: Registration Rules */}
                <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] pb-2">
                    <span className="font-bold text-[#17191C] dark:text-[#F1F2F3]">Registration Rules & Capacity</span>
                    <button
                      type="button"
                      onClick={() => handleJumpToStep(2)}
                      className="text-[#25292F] dark:text-[#E8EAED] font-semibold hover:underline"
                    >
                      Edit Step 2
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[#656B73] dark:text-[#A6ADB5]">
                    <div>Capacity: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{formData.capacity} Seats</strong></div>
                    <div>Participation: <strong className="text-[#17191C] dark:text-[#F1F2F3] capitalize">{formData.participationMode}</strong></div>
                    {formData.participationMode === "team" && (
                      <div>Team Size: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{formData.minTeamSize} – {formData.maxTeamSize} Members</strong></div>
                    )}
                  </div>
                </div>

                {/* Section 2.5: Custom Registration Form */}
                <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] pb-2">
                    <span className="font-bold text-[#17191C] dark:text-[#F1F2F3]">Configured Registration Form</span>
                    <button
                      type="button"
                      onClick={() => handleJumpToStep(2)}
                      className="text-[#25292F] dark:text-[#E8EAED] font-semibold hover:underline"
                    >
                      Edit Form
                    </button>
                  </div>
                  <div className="space-y-1.5 text-[#656B73] dark:text-[#A6ADB5]">
                    <div>
                      Form Architecture: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{formData.registrationForm.sections.length} Sections, {formData.registrationForm.sections.reduce((acc, s) => acc + s.fields.length, 0)} Total Questions</strong>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formData.registrationForm.sections.flatMap((s) => s.fields).slice(0, 8).map((f) => (
                        <span key={f.id} className="rounded-md bg-white dark:bg-[#25292F] border border-[#E5E7EA] dark:border-[#30353A] px-2 py-0.5 text-[10px] text-[#17191C] dark:text-[#F1F2F3]">
                          {f.label} {f.required && "*"}
                        </span>
                      ))}
                      {formData.registrationForm.sections.flatMap((s) => s.fields).length > 8 && (
                        <span className="text-[10px] text-[#8A9098] self-center">
                          +{formData.registrationForm.sections.flatMap((s) => s.fields).length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Competition Pipeline */}
                <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] pb-2">
                    <span className="font-bold text-[#17191C] dark:text-[#F1F2F3]">Competition Pipeline</span>
                    <button
                      type="button"
                      onClick={() => handleJumpToStep(3)}
                      className="text-[#25292F] dark:text-[#E8EAED] font-semibold hover:underline"
                    >
                      Edit Step 3
                    </button>
                  </div>
                  <div>
                    {formData.hasRounds ? (
                      <p className="text-[#17191C] dark:text-[#F1F2F3] font-semibold">
                        Multi-Stage Structure ({formData.rounds.length} Configured Stages)
                      </p>
                    ) : (
                      <p className="text-[#656B73] dark:text-[#A6ADB5]">Single-Stage Unified Session</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Footer Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-[#F4F5F6] dark:border-[#262A2E] pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold px-5"
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
                className="rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold px-4"
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                variant="charcoal"
                onClick={() => handlePublish(false)}
                className="rounded-full text-xs font-semibold px-5 shadow-sm gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Publish Event (Preview)</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Published Preview Modal */}
      {isPublishedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#17191C] dark:text-[#F1F2F3]">
                Event Published (Preview Mode)
              </h3>
              <p className="text-xs text-[#656B73] dark:text-[#A6ADB5]">
                &quot;{formData.title}&quot; has been configured with its custom registration form and is ready for participant entries.
              </p>
            </div>

            <div className="rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-3 text-xs text-[#656B73] dark:text-[#A6ADB5] text-left space-y-1">
              <div>Capacity: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{formData.capacity} Seats</strong></div>
              <div>Category: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{formData.category}</strong></div>
              <div>Form Questions: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{formData.registrationForm.sections.reduce((acc, s) => acc + s.fields.length, 0)} Fields</strong></div>
            </div>

            <div className="flex gap-2.5">
              <Button
                variant="outline"
                className="flex-1 rounded-full text-xs font-semibold"
                onClick={() => router.push("/events")}
              >
                Return to Directory
              </Button>
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
