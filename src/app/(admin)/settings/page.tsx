"use client";

import { Server, Mail } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#17191C]">
          System Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#656B73]">
          Platform configuration, Supabase database integration status, and transactional email routing.
        </p>
      </div>

      <div className="space-y-6">
        {/* Backend & Supabase Status */}
        <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0F1F2] text-[#17191C]">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17191C]">
                Database & Authentication
              </h3>
              <p className="text-xs text-[#656B73]">
                PostgreSQL with Row-Level Security (Supabase)
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#F4F5F6] p-4 text-xs space-y-2 border border-[#E5E7EA]">
            <div className="flex justify-between">
              <span className="text-[#8A9098]">Mode:</span>
              <span className="font-semibold text-[#17191C]">Client UI Preview & Isolated Mock Data</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A9098]">Required for UI Preview:</span>
              <span className="text-[#656B73]">None (Mock data active by default)</span>
            </div>
          </div>
        </div>

        {/* Email Delivery Adapter */}
        <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0F1F2] text-[#17191C]">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17191C]">
                Email Provider Adapter
              </h3>
              <p className="text-xs text-[#656B73]">
                Provider-neutral outbox abstraction with retries and failover
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border-2 border-[#25292F] bg-white flex flex-col justify-between">
              <div className="font-bold text-xs text-[#17191C]">Resend</div>
              <span className="text-[10px] text-[#17191C] font-semibold mt-1">Default Configured</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-[#E5E7EA] bg-[#F4F5F6]/60 opacity-60">
              <div className="font-semibold text-xs text-[#17191C]">Postmark</div>
              <span className="text-[10px] text-[#8A9098]">Adapter Supported</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-[#E5E7EA] bg-[#F4F5F6]/60 opacity-60">
              <div className="font-semibold text-xs text-[#17191C]">SendGrid / Brevo</div>
              <span className="text-[10px] text-[#8A9098]">Adapter Supported</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
