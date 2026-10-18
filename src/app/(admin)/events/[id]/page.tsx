import Link from "next/link";
import { ArrowLeft, CalendarX2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SketchRepository } from "@/lib/supabase/repository";
import { verifyAdminSession } from "@/lib/auth/session";
import EventDetailClient from "./event-detail-client";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const isPreview = SketchRepository.isPreview();
  const session = await verifyAdminSession();

  let event = null;
  let attendees: any[] = [];
  let fetchError: string | null = null;

  try {
    event = await SketchRepository.getEventById(id);
    if (event) {
      attendees = await SketchRepository.getEventAttendees(id);
    }
  } catch (err: any) {
    fetchError = err.message || "Failed to load event.";
  }

  // Dedicated Database / Infrastructure Failure State
  if (fetchError) {
    return (
      <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto min-w-0">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Event Directory</span>
        </Link>

        <div className="rounded-[20px] border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 p-12 text-center shadow-sm max-w-xl mx-auto space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-lg font-bold text-red-900 dark:text-red-200">
                Database Infrastructure Failure
              </h1>
              <Badge variant="destructive" className="text-[10px] uppercase font-semibold">
                {isPreview ? "Preview Store Error" : "Database Outage"}
              </Badge>
            </div>
            <p className="text-xs text-red-700/80 dark:text-red-300/80 leading-relaxed">
              An error occurred while communicating with the persistence layer:
            </p>
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white/80 dark:bg-[#111315]/80 p-3 text-xs font-mono text-red-800 dark:text-red-300 text-left overflow-x-auto">
              {fetchError}
            </div>
            <p className="text-[11px] text-[#656B73] dark:text-[#A6ADB5] pt-1">
              This is an infrastructure or repository failure, not a confirmation that event &quot;{id}&quot; does not exist.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link href={`/events/${id}`}>
              <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold px-4 gap-1.5 border-red-200 dark:border-red-800/40">
                <RefreshCw className="h-3 w-3" />
                <span>Retry Request</span>
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="charcoal" size="sm" className="rounded-full text-xs font-semibold px-5">
                Return to Directory
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Graceful, Purposeful 404 Not-Found State
  if (!event) {
    return (
      <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto min-w-0">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Event Directory</span>
        </Link>

        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-12 text-center shadow-sm max-w-xl mx-auto space-y-4">
          <CalendarX2 className="mx-auto h-12 w-12 text-[#8A9098] dark:text-[#7D858F] opacity-50" />
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-lg font-bold text-[#17191C] dark:text-[#F1F2F3]">
                Event Not Found
              </h1>
              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                {isPreview ? "Preview Store" : "Production DB"}
              </Badge>
            </div>
            <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] leading-relaxed">
              We could not locate any event with identifier &quot;{id}&quot;. It may have been archived, renamed, or never created.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/events">
              <Button variant="charcoal" size="sm" className="rounded-full text-xs font-semibold px-5">
                Return to Directory
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <EventDetailClient
      initialEvent={event}
      initialAttendees={attendees}
      isPreview={isPreview}
      currentUserRole={session.user?.role}
    />
  );
}
