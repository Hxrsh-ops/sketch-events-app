import { Metadata } from "next";
import { getLiveTicketAction } from "@/app/actions/ticket-actions";
import LiveTicketClient from "./live-ticket-client";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Live Entry Ticket | SKETCHHUB Events",
  description: "Official dynamic entry pass with continuously rotating security verification.",
  referrer: "no-referrer",
  robots: "noindex, nofollow",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function LiveTicketPage({ params }: PageProps) {
  const { token } = await params;

  const result = await getLiveTicketAction(token);

  if (!result.success || !result.data) {
    return (
      <main className="min-h-screen bg-[#0C0E10] text-[#F3F4F6] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#14171A] border border-[#23272C] text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Ticket Pass Not Found</h1>
          <p className="text-xs text-[#8E95A0] leading-relaxed">
            {result.message || "This ticket access link is invalid, expired, or has been revoked by the event administration."}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Event Platform</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <LiveTicketClient ticket={result.data} bearerToken={token} />;
}
