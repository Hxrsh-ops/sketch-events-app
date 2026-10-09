"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardKpiRow } from "@/components/dashboard/kpi-cards";
import { RegistrationAnalytics } from "@/components/dashboard/registration-analytics";
import { UpcomingOperations } from "@/components/dashboard/upcoming-operations";
import { OrganizerActivity } from "@/components/dashboard/organizer-activity";
import { EventProgressGauge } from "@/components/dashboard/event-progress-gauge";
import { LiveCheckinClock } from "@/components/dashboard/live-checkin-clock";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col space-y-6">
      {/* Page Title & Contextual Primary Actions (matching Donezo monochrome header) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17191C]">
            Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73]">
            Plan, prioritize and accomplish your task with ease
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/events/new">
            <Button
              variant="charcoal"
              size="default"
              className="rounded-full px-5 py-2.5 gap-1.5 font-medium shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Project</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="default"
            className="rounded-full px-5 py-2.5 font-medium border-[#E5E7EA] text-[#17191C] hover:bg-white shadow-sm"
            onClick={() => alert("Participant and event data import wizard is available in data tools.")}
          >
            <span>Import Data</span>
          </Button>
        </div>
      </div>

      {/* Row 1: KPI Summary Row */}
      <DashboardKpiRow />

      {/* Row 2: Analytics, Reminders & Top Collaborators (3 Column Grid matching Donezo) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-5">
          <RegistrationAnalytics />
        </div>
        <div className="lg:col-span-3">
          <UpcomingOperations />
        </div>
        <div className="lg:col-span-4">
          <OrganizerActivity />
        </div>
      </div>

      {/* Row 3: Project Progress & Time Tracker (2 Column Grid matching Donezo) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-6">
          <EventProgressGauge />
        </div>
        <div className="lg:col-span-6">
          <LiveCheckinClock />
        </div>
      </div>
    </div>
  );
}
