"use client";

import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardKpiRow } from "@/components/dashboard/kpi-cards";
import { RegistrationAnalytics } from "@/components/dashboard/registration-analytics";
import { UpcomingOperations } from "@/components/dashboard/upcoming-operations";
import { RecentEvents } from "@/components/dashboard/recent-events";
import { OrganizerActivity } from "@/components/dashboard/organizer-activity";
import { EventProgressGauge } from "@/components/dashboard/event-progress-gauge";
import { LiveCheckinClock } from "@/components/dashboard/live-checkin-clock";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col space-y-6">
      {/* Page Title & Contextual Primary Actions (matching Donezo header) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191A1C]">
            Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
            Plan, prioritize, and coordinate your event operations with calm precision.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/events/new">
            <Button
              variant="forest"
              size="default"
              className="rounded-2xl gap-2 font-semibold shadow-md shadow-[#1B4332]/10"
            >
              <Plus className="h-4 w-4" />
              <span>Add Event</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="default"
            className="rounded-2xl gap-2 font-semibold border-[#E8E6E1] text-[#191A1C] hover:bg-white shadow-sm"
            onClick={() => alert("CSV/XLSX participant import wizard will be available in Phase 4.")}
          >
            <Download className="h-4 w-4 text-[#65666A]" />
            <span>Import Data</span>
          </Button>
        </div>
      </div>

      {/* Row 1: KPI Summary Row */}
      <DashboardKpiRow />

      {/* Row 2: Analytics, Reminders & Recent Events */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <RegistrationAnalytics />
        </div>
        <div className="lg:col-span-3">
          <UpcomingOperations />
        </div>
        <div className="lg:col-span-4">
          <RecentEvents />
        </div>
      </div>

      {/* Row 3: Organizer Activity, Event Progress & Live Check-in Clock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <OrganizerActivity />
        </div>
        <div className="lg:col-span-3">
          <EventProgressGauge />
        </div>
        <div className="lg:col-span-4">
          <LiveCheckinClock />
        </div>
      </div>
    </div>
  );
}
