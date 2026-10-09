"use client";

import { TrendingUp } from "lucide-react";
import { RegistrationAnalytics } from "@/components/dashboard/registration-analytics";
import { EventProgressGauge } from "@/components/dashboard/event-progress-gauge";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#17191C]">
          Analytics & Insights
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#656B73]">
          Comprehensive registration trends, attendance benchmarks, and cross-event engagement metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-xs text-[#8A9098]">Overall Turnout</span>
          <div className="text-3xl font-black text-[#17191C] mt-2">84.2%</div>
          <span className="text-[11px] text-[#656B73] font-medium mt-1 inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +5.4% from last term
          </span>
        </div>
        <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-xs text-[#8A9098]">Avg Reg. Time to Full</span>
          <div className="text-3xl font-black text-[#17191C] mt-2">18h</div>
          <span className="text-[11px] text-[#656B73] mt-1">High demand flag</span>
        </div>
        <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-xs text-[#8A9098]">Unique Attendees</span>
          <div className="text-3xl font-black text-[#17191C] mt-2">892</div>
          <span className="text-[11px] text-[#656B73] mt-1">Across 24 events</span>
        </div>
        <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-xs text-[#8A9098]">Certificates Issued</span>
          <div className="text-3xl font-black text-[#17191C] mt-2">540</div>
          <span className="text-[11px] text-[#656B73] font-medium mt-1">98% delivery rate</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <RegistrationAnalytics />
        </div>
        <div className="lg:col-span-5">
          <EventProgressGauge />
        </div>
      </div>
    </div>
  );
}
