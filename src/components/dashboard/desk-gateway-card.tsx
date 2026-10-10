"use client";

import Link from "next/link";
import { QrCode, Search, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeskGatewayCard() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Attendance & Desk Control
            </h3>
          </div>
          <span className="rounded-full bg-[#F0F1F2] dark:bg-[#25292F] px-2 py-0.5 text-[10px] font-medium text-[#656B73] dark:text-[#A6ADB5]">
            Scanner Ready
          </span>
        </div>

        <p className="mt-2 text-xs text-[#656B73] dark:text-[#A6ADB5] leading-relaxed">
          Verify participant event passes via high-speed camera QR scan or search registrations by ID or email.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          <div className="rounded-xl border border-[#F0F1F2] dark:border-[#262A2E] bg-[#F9FAFB] dark:bg-[#22262A] p-2.5">
            <span className="text-[10px] font-medium text-[#8A9098] dark:text-[#7D858F]">Scan Verification</span>
            <p className="mt-0.5 text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">Camera & Manual</p>
          </div>
          <div className="rounded-xl border border-[#F0F1F2] dark:border-[#262A2E] bg-[#F9FAFB] dark:bg-[#22262A] p-2.5">
            <span className="text-[10px] font-medium text-[#8A9098] dark:text-[#7D858F]">Desk Access</span>
            <p className="mt-0.5 text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">Staff Passcode OK</p>
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
