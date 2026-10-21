import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SketchRepository } from "@/lib/supabase/repository";
import PublicEventClient from "./public-event-client";

interface PublicEventPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicEventPage({ params }: PublicEventPageProps) {
  const { slug } = await params;
  const isPreview = SketchRepository.isPreview();

  let event = null;
  let rounds = null;
  let fetchError: string | null = null;

  try {
    event = await SketchRepository.getEventBySlug(slug);
    if (event && event.hasRounds) {
      rounds = await SketchRepository.listRounds(event.id);
    }
  } catch (err: any) {
    // Transparently capture production repository failures
    fetchError = err.message || "Failed to load event.";
  }

  // Database Infrastructure Failure State (Honest error without leaking internal secrets)
  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#F4F5F6] dark:bg-[#0E1012] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-[24px] border border-rose-300 dark:border-rose-900 bg-white dark:bg-[#1B1E21] p-8 text-center shadow-lg space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Service Temporarily Unavailable
            </h1>
            <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] leading-relaxed">
              We are experiencing difficulties communicating with the event data service. Please try again in a moment.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link href="/">
              <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold px-4 border-[#E5E7EA] dark:border-[#30353A]">
                Return to Home
              </Button>
            </Link>
            <Link href={`/e/${slug}`}>
              <Button variant="charcoal" size="sm" className="rounded-full text-xs font-semibold px-4 gap-1.5 shadow-sm">
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Missing, Draft, or Archived Events (Public Draft Protection)
  if (!event || (event.lifecycle !== "published" && event.lifecycle !== "live")) {
    return (
      <div className="min-h-screen bg-[#F4F5F6] dark:bg-[#0E1012] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-8 text-center shadow-lg space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-[#8A9098] dark:text-[#7D858F] opacity-50" />
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Event Not Available
            </h1>
            <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] leading-relaxed">
              This event could not be found or is not currently open to the public. If you believe this is an error, please verify the URL or contact the organizing team.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/">
              <Button variant="charcoal" size="sm" className="rounded-full text-xs font-semibold px-5">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <PublicEventClient event={event} rounds={rounds || undefined} isPreview={isPreview} />;
}
