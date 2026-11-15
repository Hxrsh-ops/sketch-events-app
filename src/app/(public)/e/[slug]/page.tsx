import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { SketchRepository } from "@/lib/supabase/repository";
import PublicEventClient from "./public-event-client";
import { SmilingSun } from "@/components/public/retro-elements";
import styles from "./ambient-bg.module.css";

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
    fetchError = err.message || "Failed to load event.";
  }

  // Database Failure State
  if (fetchError) {
    return (
      <div className={styles.ambientWrapper}>
        <div className={styles.ambientBackground} aria-hidden="true">
          <div className={styles.ambientFallback} />
        </div>
        <div className={`${styles.contentContainer} min-h-[70vh] flex items-center justify-center p-4`}>
          <div className="max-w-md w-full rounded-3xl border-2 border-ink bg-cream-plus p-8 text-center shadow-brutal-card space-y-4">
            <div className="flex justify-center">
              <SmilingSun className="w-12 h-12" spin={false} />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-peachy font-black text-2xl text-ink">
                Service Temporarily Unavailable
              </h1>
              <p className="font-quicksand font-semibold text-xs text-ink/75 leading-relaxed">
                We are experiencing difficulties communicating with the event data service. Please try again in a moment.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link href="/">
                <button className="btn-brutal px-5 py-2.5 rounded-full border-2 border-ink bg-cream text-ink font-quicksand font-bold text-xs shadow-brutal-flat">
                  Return to Home
                </button>
              </Link>
              <Link href={`/e/${slug}`}>
                <button className="btn-brutal px-5 py-2.5 rounded-full border-2 border-ink bg-retro-yellow text-ink font-quicksand font-black text-xs shadow-brutal-btn flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Missing, Draft, or Archived Events
  if (!event || (event.lifecycle !== "published" && event.lifecycle !== "live")) {
    return (
      <div className={styles.ambientWrapper}>
        <div className={styles.ambientBackground} aria-hidden="true">
          <div className={styles.ambientFallback} />
        </div>
        <div className={`${styles.contentContainer} min-h-[70vh] flex items-center justify-center p-4`}>
          <div className="max-w-md w-full rounded-3xl border-2 border-ink bg-cream-plus p-8 text-center shadow-brutal-card space-y-4">
            <div className="flex justify-center">
              <SmilingSun className="w-12 h-12" spin={false} />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-peachy font-black text-2xl text-ink">
                Event Not Available
              </h1>
              <p className="font-quicksand font-semibold text-xs text-ink/75 leading-relaxed">
                This event could not be found or is not currently open to the public. If you believe this is an error, please verify the URL or contact the organizing team.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/">
                <button className="btn-brutal px-6 py-3 rounded-full border-2 border-ink bg-retro-yellow text-ink font-quicksand font-black text-xs shadow-brutal-btn">
                  Explore Open Experiences
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <PublicEventClient event={event} rounds={rounds || undefined} isPreview={isPreview} />;
}
