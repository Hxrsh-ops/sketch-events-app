"use client";

import Link from "next/link";
import { QrCode, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeskGatewayCard() {
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#E5E7E9] bg-white p-5 shadow-xs">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[#777E86]" />
            <h3 className="text-sm font-semibold text-[#34383D]">
              Attendance &amp; Desk Control
            </h3>
          </div>
          <span className="rounded-md bg-[#F6F7F8] border border-[#E5E7E9] px-2 py-0.5 text-[10px] font-medium text-[#858B93]">
            Scanner Ready
          </span>
        </div>

        <p className="mt-2 text-xs text-[#858B93] leading-relaxed">
          Verify participant event passes via high-speed camera QR scan or search registrations by ID or email.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          <div className="rounded-lg border border-[#E5E7E9] bg-[#F6F7F8] p-2.5">
            <span className="text-[10px] font-medium text-[#858B93]">Scan Verification</span>
            <p className="mt-0.5 text-xs font-semibold text-[#34383D]">Camera &amp; Manual</p>
          </div>
          <div className="rounded-lg border border-[#E5E7E9] bg-[#F6F7F8] p-2.5">
            <span className="text-[10px] font-medium text-[#858B93]">Desk Access</span>
            <p className="mt-0.5 text-xs font-semibold text-[#34383D]">Staff Passcode OK</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-2">
        <Link href="/attendance">
          <Button
            variant="charcoal"
            className="w-full h-8 rounded-lg text-xs font-semibold bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] hover:bg-[#D9DCE0] gap-2"
          >
            <QrCode className="h-3.5 w-3.5 text-[#777E86]" />
            <span>Launch Check-in Terminal</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#777E86]" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
