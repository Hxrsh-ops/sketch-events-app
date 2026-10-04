"use client";

import { Settings, Shield, Server, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="flex flex-col space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#191A1C]">
          System Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
          Platform configuration, Supabase database integration status, and transactional email routing.
        </p>
      </div>

      <div className="space-y-6">
        {/* Backend & Supabase Status */}
        <div className="rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191A1C]">
                Database & Authentication
              </h3>
              <p className="text-xs text-[#65666A]">
                PostgreSQL with Row-Level Security (Supabase)
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-[#F9F8F6] p-4 text-xs space-y-2 border border-[#EAE8E3]">
            <div className="flex justify-between">
              <span className="text-[#929398]">Mode:</span>
              <span className="font-semibold text-emerald-700">Client UI Scaffolding & Mock Fallback</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#929398]">Required for Dev:</span>
              <span className="text-[#65666A]">None (Mock data active by default)</span>
            </div>
          </div>
        </div>

        {/* Email Delivery Adapter */}
        <div className="rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EB] text-[#8F2635]">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191A1C]">
                Email Provider Adapter
              </h3>
              <p className="text-xs text-[#65666A]">
                Provider-neutral outbox abstraction with retries and failover
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-emerald-500 bg-emerald-50/50 flex flex-col justify-between">
              <div className="font-bold text-xs text-[#191A1C]">Resend</div>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1">Default Selected</span>
            </div>
            <div className="p-3 rounded-xl border border-[#EAE8E3] bg-[#F9F8F6] opacity-60">
              <div className="font-semibold text-xs text-[#191A1C]">Postmark</div>
              <span className="text-[10px] text-[#929398]">Adapter Supported</span>
            </div>
            <div className="p-3 rounded-xl border border-[#EAE8E3] bg-[#F9F8F6] opacity-60">
              <div className="font-semibold text-xs text-[#191A1C]">SendGrid / Brevo</div>
              <span className="text-[10px] text-[#929398]">Adapter Supported</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
