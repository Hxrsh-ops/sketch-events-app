"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STEPS = [
  { id: 1, name: "Basic Information" },
  { id: 2, name: "Registration Rules" },
  { id: 3, name: "Rounds & Stages" },
  { id: 4, name: "Review & Publish" },
];

export function EventCreationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    category: "Design",
    shortDescription: "",
    venue: "",
    venueMode: "in-person",
    capacity: 100,
    startDate: "",
    endDate: "",
    participationMode: "individual",
    hasRounds: false,
  });

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="flex flex-col space-y-8 max-w-4xl mx-auto">
      {/* Back button and Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#65666A] hover:text-[#191A1C] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Events</span>
        </Link>
        <span className="text-xs text-[#929398]">Step {currentStep} of 4</span>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#191A1C]">
          Create New Event
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
          Follow the guided steps to set up public information, registration capacity, and event rounds.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between rounded-2xl border border-[#EAE8E3] bg-white p-4 shadow-sm">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                currentStep === step.id
                  ? "bg-[#1B4332] text-white shadow-sm"
                  : currentStep > step.id
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-[#F5F4F1] text-[#929398]"
              }`}
            >
              {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
            </div>
            <span
              className={`hidden sm:inline text-xs font-medium ${
                currentStep === step.id ? "font-bold text-[#191A1C]" : "text-[#929398]"
              }`}
            >
              {step.name}
            </span>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="hidden sm:inline h-4 w-4 text-[#D8D5CF] ml-2" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content Card */}
      <div className="rounded-[22px] border border-[#EAE8E3] bg-white p-6 sm:p-8 shadow-sm">
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#191A1C]">1. Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#191A1C]">Event Title *</label>
                <Input
                  placeholder="e.g., Sketch Design Sprint 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#191A1C]">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1.5 flex h-10 w-full rounded-xl border border-[#E8E6E1] bg-white px-3.5 py-2 text-sm text-[#191A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2635]"
                  >
                    <option value="Design">Design</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Conference">Conference</option>
                    <option value="Exhibition">Exhibition</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#191A1C]">Venue / Room *</label>
                  <Input
                    placeholder="e.g. Studio Lab B"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#191A1C]">Short Description *</label>
                <textarea
                  rows={3}
                  placeholder="A concise summary shown on event cards and discovery previews..."
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  className="mt-1.5 flex w-full rounded-xl border border-[#E8E6E1] bg-white p-3 text-sm text-[#191A1C] placeholder:text-[#929398] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2635]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#191A1C]">Event Poster / Banner</label>
                <div className="mt-1.5 flex justify-center rounded-2xl border-2 border-dashed border-[#E8E6E1] p-6 hover:border-[#1B4332] transition-colors cursor-pointer bg-[#FAF9F7]">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-[#929398]" />
                    <p className="mt-2 text-xs text-[#65666A]">
                      <strong className="text-[#191A1C]">Click to upload</strong> or drag and drop
                    </p>
                    <p className="text-[11px] text-[#929398]">PNG, JPG or WebP (max 5MB)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#191A1C]">2. Registration Rules & Capacity</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#191A1C]">Max Capacity (Seats)</label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="mt-1.5"
                  />
                  <p className="text-[11px] text-[#929398] mt-1">Registrations automatically close when full.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#191A1C]">Participation Mode</label>
                  <select
                    value={formData.participationMode}
                    onChange={(e) => setFormData({ ...formData, participationMode: e.target.value })}
                    className="mt-1.5 flex h-10 w-full rounded-xl border border-[#E8E6E1] bg-white px-3.5 py-2 text-sm text-[#191A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2635]"
                  >
                    <option value="individual">Individual Participants</option>
                    <option value="team">Team Registration (2-4 Members)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F9F8F6] border border-[#EAE8E3] text-xs text-[#65666A] space-y-1">
                <div className="font-semibold text-[#191A1C]">Registration Form Fields:</div>
                <div>Full Name, Email Address, Department, and Academic Year are collected by default.</div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#191A1C]">3. Rounds & Competition Stages</h2>
            <p className="text-xs text-[#65666A]">
              Does this event include multi-stage elimination or progressive rounds?
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-[#EAE8E3] bg-[#FAF9F7] cursor-pointer hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={formData.hasRounds}
                  onChange={(e) => setFormData({ ...formData, hasRounds: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E8E6E1] text-[#1B4332] focus:ring-[#1B4332]"
                />
                <div>
                  <div className="text-xs font-bold text-[#191A1C]">Enable Multi-Round Structure</div>
                  <div className="text-[11px] text-[#65666A]">
                    Configure progression thresholds, jury scoring, and round advancements.
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#191A1C]">4. Review & Publish</h2>
            <div className="rounded-xl bg-[#FAF9F7] border border-[#EAE8E3] p-5 space-y-3 text-xs">
              <div className="flex justify-between border-b border-[#EAE8E3] pb-2">
                <span className="text-[#65666A]">Event Title:</span>
                <span className="font-bold text-[#191A1C]">{formData.title || "Untitled Draft"}</span>
              </div>
              <div className="flex justify-between border-b border-[#EAE8E3] pb-2">
                <span className="text-[#65666A]">Category:</span>
                <span className="font-bold text-[#191A1C]">{formData.category}</span>
              </div>
              <div className="flex justify-between border-b border-[#EAE8E3] pb-2">
                <span className="text-[#65666A]">Capacity:</span>
                <span className="font-bold text-[#191A1C]">{formData.capacity} Participants</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#65666A]">Mode:</span>
                <span className="font-bold text-[#191A1C]">{formData.participationMode}</span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-[#F5F4F1] pt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="rounded-xl border-[#E8E6E1]"
          >
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button variant="forest" onClick={nextStep} className="rounded-xl">
              Next Step
            </Button>
          ) : (
            <Button
              variant="forest"
              onClick={() => alert("Draft saved. In Phase 2/3, this will persist to Supabase.")}
              className="rounded-xl font-bold shadow-md shadow-[#1B4332]/10"
            >
              Save Draft & Preview
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewEventPage() {
  return <EventCreationWizard />;
}
