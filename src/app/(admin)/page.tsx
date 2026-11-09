import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardKpiRow, DashboardKpiMetrics } from "@/components/dashboard/kpi-cards";
import { ActiveEventsOverview } from "@/components/dashboard/active-events-overview";
import { UpcomingOperations } from "@/components/dashboard/upcoming-operations";
import { OrganizerActivity } from "@/components/dashboard/organizer-activity";
import { DeskGatewayCard } from "@/components/dashboard/desk-gateway-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SketchRepository } from "@/lib/supabase/repository";

export default async function AdminDashboardPage() {
  const isPreview = SketchRepository.isPreview();
  let isConnected = true;
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
      participantsCount: participants.length > 0 ? participants.length : totalRegistrations,
      upcomingEventsCount: activeEventsCount,
      isConnected: true,
    };
  } catch (err) {
    console.warn("[AdminDashboardPage] Metrics calculation fallback:", err);
    isConnected = false;
    metrics = {
      isConnected: false,
    };
  }

  return (
    <div className="flex flex-col space-y-6 pb-8 max-w-[1400px] mx-auto text-[#17191C]">
      {/* Header: Breadcrumb, Main Heading, Subtitle & Create Event Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-[#858B93] uppercase">
            SKETCHHUB WORKSPACE / OVERVIEW
          </span>
          <div className="flex items-center gap-2.5 mt-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C]">
              Overview
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-semibold bg-white border-[#E5E7E9] text-[#777E86]"
            >
              {isPreview ? "Preview Mode" : isConnected ? "Production Live" : "Disconnected"}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#858B93]">
            Event operations, registrations, attendance, and certificates from connected platform data.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link href="/events/new">
            <Button
              variant="default"
              size="default"
              className="rounded-lg px-4 sm:px-5 h-9 sm:h-10 gap-2 text-xs sm:text-sm font-semibold bg-[#17191C] text-white hover:bg-[#25292F] shadow-xs"
            >
              <Plus className="h-4 w-4 text-white/80" />
              <span>Create Event</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 1: Five Monochromatic Statistics Cards */}
      <DashboardKpiRow metrics={metrics} isPreview={isPreview} />

      {/* Row 2: Two-column Main Dashboard Content */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left Column (7 cols): Active Events Overview */}
        <div className="lg:col-span-7 flex flex-col space-y-5">
          <ActiveEventsOverview events={events} isPreview={isPreview} />
        </div>

        {/* Right Column (5 cols): Quick Actions, Recent Activity & Operations */}
        <div className="lg:col-span-5 flex flex-col space-y-5">
          <QuickActions />
          <OrganizerActivity admins={admins} events={events} isPreview={isPreview} />
          <UpcomingOperations events={events} isPreview={isPreview} />
          <DeskGatewayCard />
        </div>
      </div>
    </div>
  );
}
