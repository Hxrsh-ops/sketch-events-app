"use client";

import { useState } from "react";
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

export default function SettingsPage() {
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [autoAdvanceScan, setAutoAdvanceScan] = useState(true);
  const [gracePeriod, setGracePeriod] = useState("30");
  const [defaultCapacity, setDefaultCapacity] = useState("200");
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedFeedback("Terminal and operational preferences updated in local preview state.");
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
            Preview Mode
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
              <span className="text-[#8A9098] dark:text-[#7D858F]">Master Administrator:</span>
              <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">Harshanth (Admin)</span>
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
                Database & Auth (Supabase)
              </h3>
              <p className="text-xs text-[#656B73] dark:text-[#A6ADB5]">
                PostgreSQL with strict Row-Level Security
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3">
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] dark:border-[#262A2E]">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Runtime Mode:</span>
              <span className="rounded-full bg-[#F0F1F2] dark:bg-[#25292F] px-2 py-0.5 font-semibold text-[#25292F] dark:text-[#F1F2F3] text-[10px]">
                Client Preview Runtime (Isolated Mock State)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] dark:border-[#262A2E]">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Domain Schema:</span>
              <span className="text-[#656B73] dark:text-[#A6ADB5]">Validated (CONTEXT/05-domain-model.md)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#8A9098] dark:text-[#7D858F]">Client Credentials:</span>
              <span className="text-[#8A9098] dark:text-[#7D858F] italic">Zero external credentials needed for preview</span>
            </div>
          </div>
        </div>

        {/* Email Engine */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm space-y-4">
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
            <div className="p-3 rounded-xl border border-[#25292F] dark:border-[#E8EAED] bg-[#F9FAFB] dark:bg-[#22262A] text-center">
              <div className="font-bold text-xs text-[#17191C] dark:text-[#F1F2F3]">Resend</div>
              <span className="text-[9px] font-semibold text-[#25292F] dark:text-[#E8EAED] block mt-1">Mock Adapter</span>
            </div>
            <div className="p-3 rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] opacity-60 text-center">
              <div className="font-medium text-xs text-[#17191C] dark:text-[#F1F2F3]">Postmark</div>
              <span className="text-[9px] text-[#8A9098] dark:text-[#7D858F] block mt-1">Supported</span>
            </div>
            <div className="p-3 rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] opacity-60 text-center">
              <div className="font-medium text-xs text-[#17191C] dark:text-[#F1F2F3]">SendGrid</div>
              <span className="text-[9px] text-[#8A9098] dark:text-[#7D858F] block mt-1">Supported</span>
            </div>
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
              <span className="text-[#8A9098] dark:text-[#7D858F]">Key Security:</span>
              <span className="text-[#656B73] dark:text-[#A6ADB5]">Simulated in-memory hashing; no production keys exposed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
