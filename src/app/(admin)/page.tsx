import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardKpiRow, DashboardKpiMetrics } from "@/components/dashboard/kpi-cards";
import { RegistrationAnalytics } from "@/components/dashboard/registration-analytics";
import { ActiveEventsOverview } from "@/components/dashboard/active-events-overview";
import { UpcomingOperations } from "@/components/dashboard/upcoming-operations";
import { OrganizerActivity } from "@/components/dashboard/organizer-activity";
import { DeskGatewayCard } from "@/components/dashboard/desk-gateway-card";
import { SketchRepository } from "@/lib/supabase/repository";

export default async function AdminDashboardPage() {
  const isPreview = SketchRepository.isPreview();
  let metrics: DashboardKpiMetrics | undefined = undefined;
  let events: any[] = [];
  let participants: any[] = [];
  let admins: any[] = [];

  try {
    const [fetchedEvents, fetchedParticipants, certs, fetchedAdmins] = await Promise.all([
      SketchRepository.listEvents(),
      SketchRepository.listParticipants(),
      SketchRepository.listCertificates(),
      SketchRepository.listAdminProfiles(),
    ]);

    events = fetchedEvents;
    participants = fetchedParticipants;
    admins = fetchedAdmins;

    const totalRegistrations =
      participants.length > 0
        ? participants.length
        : events.reduce((acc, e) => acc + (e.registeredCount || 0), 0);
    const totalCapacity = events.reduce((acc, e) => acc + (e.capacity || 0), 0);
    const checkedInCount = participants.filter((p) => p.attendanceStatus === "checked_in").length;
    const checkInConversion =
      totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;
    const activeEventsCount = events.filter(
      (e) => e.lifecycle === "published" || e.lifecycle === "live"
    ).length;
    const certificatesIssued = certs.length;

    metrics = {
      totalRegistrations,
      totalCapacity: totalCapacity > 0 ? totalCapacity : (isPreview ? 2200 : totalCapacity),
      checkInConversion: totalRegistrations > 0 ? checkInConversion : (isPreview ? 82.4 : 0),
      activeEventsCount: activeEventsCount > 0 ? activeEventsCount : (isPreview ? events.length : activeEventsCount),
      certificatesIssued: certificatesIssued > 0 ? certificatesIssued : (isPreview ? 620 : 0),
    };
  } catch (err) {
    console.warn("[AdminDashboardPage] Metrics calculation fallback:", err);
  }

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
              {isPreview ? "Preview Mode" : "Production Live"}
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
      <DashboardKpiRow metrics={metrics} isPreview={isPreview} />

      {/* Row 2: Balanced Asymmetric Main Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left / Main Section (7 cols): Analytics Trajectory & Active Events */}
        <div className="lg:col-span-7 flex flex-col space-y-5">
          <RegistrationAnalytics participants={participants} isPreview={isPreview} />
          <ActiveEventsOverview events={events} isPreview={isPreview} />
        </div>

        {/* Right / Operations Sidebar (5 cols): Dispatch Queue, Duty Leads & Desk Gateway */}
        <div className="lg:col-span-5 flex flex-col space-y-5">
          <UpcomingOperations events={events} isPreview={isPreview} />
          <DeskGatewayCard />
          <OrganizerActivity admins={admins} events={events} isPreview={isPreview} />
        </div>
      </div>
    </div>
  );
}
