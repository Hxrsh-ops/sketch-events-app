"use client";

import Link from "next/link";
import { QrCode, Search, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeskGatewayCard() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[#25292F] dark:text-white/90" />
            <h3 className="text-sm font-bold text-[#17191C] dark:text-white">
              Attendance & Desk Control
            </h3>
          </div>
          <span className="rounded-full bg-[#F0F1F2] dark:bg-white/10 border border-[#E5E7EA] dark:border-white/15 px-2 py-0.5 text-[10px] font-medium text-[#5E646E] dark:text-white/80">
            Scanner Ready
          </span>
        </div>

        <p className="mt-2 text-xs text-[#5E646E] dark:text-white/70 leading-relaxed">
          Verify participant event passes via high-speed camera QR scan or search registrations by ID or email.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          <div className="rounded-xl border border-[#F0F1F2] dark:border-[#363C46] bg-[#F8F9FA] dark:bg-[#181B1F] p-2.5">
            <span className="text-[10px] font-medium text-[#828892] dark:text-white/60">Scan Verification</span>
            <p className="mt-0.5 text-xs font-semibold text-[#17191C] dark:text-white">Camera & Manual</p>
          </div>
          <div className="rounded-xl border border-[#F0F1F2] dark:border-[#363C46] bg-[#F8F9FA] dark:bg-[#181B1F] p-2.5">
            <span className="text-[10px] font-medium text-[#828892] dark:text-white/60">Desk Access</span>
            <p className="mt-0.5 text-xs font-semibold text-[#17191C] dark:text-white">Staff Passcode OK</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-2">
        <Link href="/attendance">
          <Button
            variant="charcoal"
            className="w-full h-9 rounded-full text-xs font-semibold shadow-sm gap-2"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Launch Check-in Terminal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
