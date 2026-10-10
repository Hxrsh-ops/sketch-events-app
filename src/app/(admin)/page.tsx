"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardKpiRow } from "@/components/dashboard/kpi-cards";
import { RegistrationAnalytics } from "@/components/dashboard/registration-analytics";
import { ActiveEventsOverview } from "@/components/dashboard/active-events-overview";
import { UpcomingOperations } from "@/components/dashboard/upcoming-operations";
import { OrganizerActivity } from "@/components/dashboard/organizer-activity";
import { DeskGatewayCard } from "@/components/dashboard/desk-gateway-card";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col space-y-6 pb-8 max-w-[1400px] mx-auto text-[#17191C] dark:text-[#F1F2F3]">
      {/* Page Title & Primary Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Operations Overview
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              Preview Mode
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#A6ADB5]">
            Event lifecycle tracking, participant registration volume, and operational dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link href="/events/new">
            <Button
              variant="charcoal"
              size="default"
              className="rounded-full px-4 sm:px-5 h-9 sm:h-10 gap-2 text-xs sm:text-sm font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Event</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 1: KPI Summary Row */}
      <DashboardKpiRow />

      {/* Row 2: Balanced Asymmetric Main Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left / Main Section (7 cols): Analytics Trajectory & Active Events */}
        <div className="lg:col-span-7 flex flex-col space-y-5">
          <RegistrationAnalytics />
          <ActiveEventsOverview />
        </div>

        {/* Right / Operations Sidebar (5 cols): Dispatch Queue, Duty Leads & Desk Gateway */}
        <div className="lg:col-span-5 flex flex-col space-y-5">
          <UpcomingOperations />
          <DeskGatewayCard />
          <OrganizerActivity />
        </div>
      </div>
    </div>
  );
}
