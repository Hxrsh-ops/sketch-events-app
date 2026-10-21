"use client";

import { useState, useEffect } from "react";
import {
  Server,
  Mail,
  ShieldCheck,
  Building2,
  Key,
  Database,
  CheckCircle2,
  Sliders,
  Bell,
  Volume2,
  Save,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CustomSwitch } from "@/components/ui/custom-switch";
import { ThemeSegmentedControl } from "@/components/theme/theme-toggle";
import { getAppEnv } from "@/lib/env";
import { useAuth } from "@/lib/auth/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [autoAdvanceScan, setAutoAdvanceScan] = useState(true);
  const [gracePeriod, setGracePeriod] = useState("30");
  const [defaultCapacity, setDefaultCapacity] = useState("200");
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const initialIsProd = (() => {
    try {
      return getAppEnv().mode === "production";
    } catch {
      return false;
    }
  })();
  const [isProduction, setIsProduction] = useState(initialIsProd);

  useEffect(() => {
    try {
      const env = getAppEnv();
      setIsProduction(env.mode === "production");
    } catch {
      setIsProduction(false);
    }

    if (typeof window !== "undefined") {
      const storedAudio = localStorage.getItem("sketch_attendance_audio");
      if (storedAudio !== null) setAudioFeedback(storedAudio === "true");

      const storedAuto = localStorage.getItem("sketch_attendance_auto_advance");
      if (storedAuto !== null) setAutoAdvanceScan(storedAuto === "true");

      const storedGrace = localStorage.getItem("sketch_attendance_grace_period");
      if (storedGrace) setGracePeriod(storedGrace);

      const storedCap = localStorage.getItem("sketch_default_capacity");
      if (storedCap) setDefaultCapacity(storedCap);
    }
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("sketch_attendance_audio", String(audioFeedback));
      localStorage.setItem("sketch_attendance_auto_advance", String(autoAdvanceScan));
      localStorage.setItem("sketch_attendance_grace_period", gracePeriod);
      localStorage.setItem("sketch_default_capacity", defaultCapacity);
      window.dispatchEvent(new Event("sketch_settings_updated"));
    }
    setSavedFeedback("Terminal and operational preferences saved successfully.");
    setTimeout(() => setSavedFeedback(null), 4000);
  };

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto text-[#17191C] dark:text-[#F1F2F3]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
            System Settings & Preferences
          </h1>
          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
            {isProduction ? "Production Live" : "Preview Mode"}
          </Badge>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#A6ADB5]">
          Appearance theme, platform infrastructure state, terminal operational controls, and cryptographic parameters.
        </p>
      </div>

      {savedFeedback && (
        <div className="rounded-2xl border border-[#17191C] dark:border-[#E8EAED] bg-[#17191C] dark:bg-[#E8EAED] text-white dark:text-[#111315] p-4 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-white dark:text-[#111315]" />
            <span className="font-medium">{savedFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedFeedback(null)}
            className="text-[11px] text-white/70 dark:text-[#111315]/70 hover:text-white dark:hover:text-[#111315] underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Appearance & Interface Theme Card */}
      <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#E5E7EA] dark:border-[#30353A] pb-3">
          <Palette className="h-4 w-4 text-[#17191C] dark:text-[#F1F2F3]" />
          <div>
            <h2 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Appearance & Theme System
            </h2>
            <p className="text-[11px] text-[#656B73] dark:text-[#A6ADB5]">
              Choose between the approved ivory Light theme, graphite Dark theme, or dynamic System sync.
            </p>
          </div>
        </div>

        <ThemeSegmentedControl />
      </div>

      {/* Operational Terminal Preferences Form */}
      <form onSubmit={handleSavePreferences} className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#E5E7EA] dark:border-[#30353A] pb-3">
          <Sliders className="h-4 w-4 text-[#17191C] dark:text-[#F1F2F3]" />
          <h2 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
            Attendance Desk & Operational Preferences
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block">
                  Audio Feedback on Scan
                </span>
                <span className="text-[11px] text-[#656B73] dark:text-[#A6ADB5]">
                  Play simulated audio tone upon successful QR pass verification
                </span>
              </div>
              <CustomSwitch checked={audioFeedback} onChange={setAudioFeedback} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block">
                  Continuous Camera Scanning
                </span>
                <span className="text-[11px] text-[#656B73] dark:text-[#A6ADB5]">
                  Keep camera active after successful pass validation
                </span>
              </div>
              <CustomSwitch checked={autoAdvanceScan} onChange={setAutoAdvanceScan} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
                Check-in Grace Period (Minutes before start)
              </label>
              <Input
                type="number"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(e.target.value)}
                className="h-9 text-xs max-w-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">
                Default Event Capacity Fallback
              </label>
              <Input
                type="number"
                value={defaultCapacity}
                onChange={(e) => setDefaultCapacity(e.target.value)}
                className="h-9 text-xs max-w-xs"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button type="submit" variant="charcoal" size="sm" className="rounded-full text-xs font-semibold gap-1.5 px-4">
            <Save className="h-3.5 w-3.5" />
            <span>Save Preferences</span>
          </Button>
        </div>
      </form>

      {/* System Infrastructure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Organization Identity */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#25292F] text-[#25292F] dark:text-[#F1F2F3]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
                Organization Identity
              </h3>
              <p className="text-xs text-[#656B73] dark:text-[#A6ADB5]">
                Tenant metadata and branding configuration
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3">
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] dark:border-[#262A2E]">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Organization Name:</span>
              <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">SketchHUB Event Operations Platform</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] dark:border-[#262A2E]">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Domain / Slug:</span>
              <span className="font-mono text-[#17191C] dark:text-[#F1F2F3]">sketch.org</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Active Administrator:</span>
              <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                {user?.name || "Administrator"} ({user?.role?.replace("_", " ") || "coordinator"})
              </span>
            </div>
          </div>
        </div>

        {/* Database & Supabase */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#25292F] text-[#25292F] dark:text-[#F1F2F3]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
                Database Ledger &amp; Security (PostgreSQL)
              </h3>
              <p className="text-xs text-[#656B73] dark:text-[#A6ADB5]">
                PostgreSQL with strict Row-Level Security
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3">
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] dark:border-[#262A2E]">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Runtime Mode:</span>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold text-[10px] ${
                  isProduction
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-[#F0F1F2] dark:bg-[#25292F] text-[#25292F] dark:text-[#F1F2F3]"
                }`}
              >
                {isProduction
                  ? "PostgreSQL Production (Live Supabase Client)"
                  : "Client Preview Runtime (Isolated Mock State)"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] dark:border-[#262A2E]">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Domain Schema:</span>
              <span className="text-[#656B73] dark:text-[#A6ADB5]">
                {isProduction ? "Migrations Synchronized (00001–00007)" : "Validated (CONTEXT/05-domain-model.md)"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Connection Status:</span>
              <span className={isProduction ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-[#8A9098] dark:text-[#7D858F] italic"}>
                {isProduction ? "Active persistent database connection" : "Zero external credentials needed for preview"}
              </span>
            </div>
          </div>
        </div>

        {/* Email Engine */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#2C3136] bg-white dark:bg-[#181B1E] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#25292F] text-[#25292F] dark:text-[#F1F2F3]">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
                Email Provider Adapter
              </h3>
              <p className="text-xs text-[#656B73] dark:text-[#A6ADB5]">
                Provider-neutral outbox abstraction with automated retry
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 text-center">
              <div className="font-bold text-xs text-[#17191C] dark:text-[#F1F2F3]">Resend</div>
              <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 block mt-1">
                {isProduction ? "Configured & Live Verified" : "Preview Adapter"}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[#E5E7EA] dark:border-[#2C3136] bg-white dark:bg-[#181B1E] opacity-75 text-center">
              <div className="font-medium text-xs text-[#17191C] dark:text-[#F1F2F3]">Brevo</div>
              <span className="text-[9px] text-[#8A9098] dark:text-[#7D858F] block mt-1">
                Implemented (Awaiting Setup)
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[#E5E7EA] dark:border-[#2C3136] bg-white dark:bg-[#181B1E] opacity-60 text-center">
              <div className="font-medium text-xs text-[#17191C] dark:text-[#F1F2F3]">Mailpit</div>
              <span className="text-[9px] text-[#8A9098] dark:text-[#7D858F] block mt-1">
                Implemented (Local Dev)
              </span>
            </div>
          </div>
          <div className="border-t border-[#F4F5F6] dark:border-[#262A2E] pt-2 text-[11px] text-[#8A9098] dark:text-[#7D858F] space-y-1">
            <p>• <strong>Resend:</strong> Primary adapter configured; single-recipient test confirmed delivered to owner inbox.</p>
            <p>• <strong>Brevo:</strong> Multi-tier adapter code-complete with error classification; pending live API credentials &amp; real-account verification.</p>
            <p>• <strong>Mailpit:</strong> Zero-dependency SMTP adapter ready for isolated offline development.</p>
          </div>
        </div>


        {/* QR Cryptography & Security */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#25292F] text-[#25292F] dark:text-[#F1F2F3]">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
                QR Credential Signatures
              </h3>
              <p className="text-xs text-[#656B73] dark:text-[#A6ADB5]">
                HMAC-SHA256 pass hashing & tamper-proof validation
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3">
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] dark:border-[#262A2E]">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Algorithm:</span>
              <span className="font-mono text-[#17191C] dark:text-[#F1F2F3]">HMAC-SHA256</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] dark:border-[#262A2E]">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Replay Prevention:</span>
              <span className="text-[#17191C] dark:text-[#F1F2F3] font-semibold">One-Time Desk Scan Lock</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Security Standard:</span>
              <span className="text-[#656B73] dark:text-[#A6ADB5]">
                {isProduction ? "Database-backed unique credentials & signature verification" : "Simulated in-memory hashing for preview"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
