import Link from "next/link";
import { Clock, ArrowRight, Video, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpcomingOperations() {
  return (
    <div className="flex flex-col justify-between rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#929398]">
            Reminders
          </span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-bold text-[#191A1C] leading-snug">
            Design Sprint 2026 — Final Check-in
          </h3>
          <p className="mt-1 text-xs text-[#65666A]">
            Time: 02.00 pm - 04.00 pm · Studio Lab B
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-[#F9F8F6] p-3 text-xs text-[#65666A] space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="font-medium text-[#191A1C]">232 Tickets Delivered</span>
          </div>
          <p className="text-[11px] text-[#929398] pl-5.5">
            Attendance scanner stations 1 & 2 ready for desk operators.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/attendance">
          <Button
            variant="forest"
            className="w-full h-11 rounded-2xl gap-2 font-semibold shadow-md shadow-[#1B4332]/10"
          >
            <Video className="h-4 w-4" />
            <span>Open Attendance Desk</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
