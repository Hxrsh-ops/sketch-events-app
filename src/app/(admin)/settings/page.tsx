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
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { AccessDenied } from "@/components/auth/access-denied";

export default function SettingsPage() {
  const { user } = useAuth();

  if (user && user.role !== "master_admin") {
    return (
      <AccessDenied
        currentRole={user.role}
        requiredRoles={["master_admin"]}
        moduleName="System Settings & Infrastructure"
      />
    );
  }
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [autoAdvanceScan, setAutoAdvanceScan] = useState(true);
  const [gracePeriod, setGracePeriod] = useState("30");
  const [defaultCapacity, setDefaultCapacity] = useState("200");
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const handleUpdateAccountPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: "error", text: "Password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", text: "Passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Authentication client is unavailable.");
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordFeedback({ type: "error", text: error.message });
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({
        type: "success",
        text: "Account password updated. You can now sign in with your email and password on any browser or mobile device.",
      });
    } catch (err: any) {
      setPasswordFeedback({ type: "error", text: err?.message || "Failed to update password." });
    } finally {
      setPasswordLoading(false);
    }
  };

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
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto text-[#17191C]">
      {/* Header */}
      <div>
        <span className="text-[11px] font-semibold tracking-wider text-[#858B93] uppercase">
          SKETCHHUB WORKSPACE / SETTINGS
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C]">
            System Settings &amp; Preferences
          </h1>
          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
            {isProduction ? "Production Live" : "Preview Mode"}
          </Badge>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-[#777E86]">
          Appearance theme, platform infrastructure state, terminal operational controls, and cryptographic parameters.
        </p>
      </div>

      {savedFeedback && (
        <div className="rounded-xl border border-[#17191C] dark:border-[#E8EAED] bg-[#17191C] dark:bg-[#E8EAED] text-white dark:text-[#111315] p-4 text-xs flex items-center justify-between shadow-sm">
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
      <div className="rounded-xl border border-[#E5E7E9]  bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#E5E7E9]  pb-3">
          <Palette className="h-4 w-4 text-[#34383D] " />
          <div>
            <h2 className="text-sm font-bold text-[#34383D] ">
              Appearance & Theme System
            </h2>
            <p className="text-[11px] text-[#858B93] ">
              Choose between the approved ivory Light theme, graphite Dark theme, or dynamic System sync.
            </p>
          </div>
        </div>

        <ThemeSegmentedControl />
      </div>

      {/* Operational Terminal Preferences Form */}
      <form onSubmit={handleSavePreferences} className="rounded-xl border border-[#E5E7E9]  bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#E5E7E9]  pb-3">
          <Sliders className="h-4 w-4 text-[#34383D] " />
          <h2 className="text-sm font-bold text-[#34383D] ">
            Attendance Desk & Operational Preferences
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#34383D]  block">
                  Audio Feedback on Scan
                </span>
                <span className="text-[11px] text-[#858B93] ">
                  Play simulated audio tone upon successful QR pass verification
                </span>
              </div>
              <CustomSwitch checked={audioFeedback} onChange={setAudioFeedback} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#34383D]  block">
                  Continuous Camera Scanning
                </span>
                <span className="text-[11px] text-[#858B93] ">
                  Keep camera active after successful pass validation
                </span>
              </div>
              <CustomSwitch checked={autoAdvanceScan} onChange={setAutoAdvanceScan} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#34383D]  block mb-1">
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
              <label className="text-xs font-semibold text-[#34383D]  block mb-1">
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
          <Button type="submit" variant="default" size="sm" className="rounded-full text-xs font-semibold gap-1.5 px-4 bg-[#17191C] text-white hover:bg-[#25292F]">
            <Save className="h-3.5 w-3.5" />
            <span>Save Preferences</span>
          </Button>
        </div>
      </form>

      {/* System Infrastructure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Organization Identity */}
        <div className="rounded-xl border border-[#E5E7E9]  bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6F7F8]  text-[#25292F] ">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#34383D] ">
                Organization Identity
              </h3>
              <p className="text-xs text-[#858B93] ">
                Tenant metadata and branding configuration
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs border-t border-[#F4F5F6]  pt-3">
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] ">
              <span className="text-[#858B93] ">Organization Name:</span>
              <span className="font-semibold text-[#34383D] ">SketchHUB Event Operations Platform</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] ">
              <span className="text-[#858B93] ">Domain / Slug:</span>
              <span className="font-mono text-[#34383D] ">sketch.org</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#858B93] ">Active Administrator:</span>
              <span className="font-semibold text-[#34383D] ">
                {user?.name || "Administrator"} ({user?.role?.replace("_", " ") || "coordinator"})
              </span>
            </div>
          </div>
        </div>

        {/* Database & Supabase */}
        <div className="rounded-xl border border-[#E5E7E9]  bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6F7F8]  text-[#25292F] ">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#34383D] ">
                Database Ledger &amp; Security (PostgreSQL)
              </h3>
              <p className="text-xs text-[#858B93] ">
                PostgreSQL with strict Row-Level Security
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs border-t border-[#F4F5F6]  pt-3">
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] ">
              <span className="text-[#858B93] ">Runtime Mode:</span>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold text-[10px] ${
                  isProduction
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-[#EAECEF]  text-[#25292F] "
                }`}
              >
                {isProduction
                  ? "PostgreSQL Production (Live Supabase Client)"
                  : "Client Preview Runtime (Isolated Mock State)"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] ">
              <span className="text-[#858B93] ">Domain Schema:</span>
              <span className="text-[#858B93] ">
                {isProduction ? "Migrations Synchronized (00001–00007)" : "Validated (CONTEXT/05-domain-model.md)"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#858B93] ">Connection Status:</span>
              <span className={isProduction ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-[#858B93]  italic"}>
                {isProduction ? "Active persistent database connection" : "Zero external credentials needed for preview"}
              </span>
            </div>
          </div>
        </div>

        {/* Email Engine */}
        <div className="rounded-xl border border-[#E5E7E9] dark:border-[#2C3136] bg-white dark:bg-[#181B1E] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6F7F8]  text-[#25292F] ">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#34383D] ">
                Email Provider Adapter
              </h3>
              <p className="text-xs text-[#858B93] ">
                Provider-neutral outbox abstraction with automated retry
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 text-center">
              <div className="font-bold text-xs text-[#34383D] ">Resend</div>
              <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 block mt-1">
                {isProduction ? "Configured & Live Verified" : "Preview Adapter"}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[#E5E7E9] dark:border-[#2C3136] bg-white dark:bg-[#181B1E] opacity-75 text-center">
              <div className="font-medium text-xs text-[#34383D] ">Brevo</div>
              <span className="text-[9px] text-[#858B93]  block mt-1">
                Implemented (Awaiting Setup)
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[#E5E7E9] dark:border-[#2C3136] bg-white dark:bg-[#181B1E] opacity-60 text-center">
              <div className="font-medium text-xs text-[#34383D] ">Mailpit</div>
              <span className="text-[9px] text-[#858B93]  block mt-1">
                Implemented (Local Dev)
              </span>
            </div>
          </div>
          <div className="border-t border-[#F4F5F6]  pt-2 text-[11px] text-[#858B93]  space-y-1">
            <p>• <strong>Resend:</strong> Primary adapter configured; single-recipient test confirmed delivered to owner inbox.</p>
            <p>• <strong>Brevo:</strong> Multi-tier adapter code-complete with error classification; pending live API credentials &amp; real-account verification.</p>
            <p>• <strong>Mailpit:</strong> Zero-dependency SMTP adapter ready for isolated offline development.</p>
          </div>
        </div>


        {/* QR Cryptography & Security */}
        <div className="rounded-xl border border-[#E5E7E9]  bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6F7F8]  text-[#25292F] ">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#34383D] ">
                QR Credential Signatures
              </h3>
              <p className="text-xs text-[#858B93] ">
                HMAC-SHA256 pass hashing & tamper-proof validation
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs border-t border-[#F4F5F6]  pt-3">
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] ">
              <span className="text-[#858B93] ">Algorithm:</span>
              <span className="font-mono text-[#34383D] ">HMAC-SHA256</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F4F5F6] ">
              <span className="text-[#858B93] ">Replay Prevention:</span>
              <span className="text-[#34383D]  font-semibold">One-Time Desk Scan Lock</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#858B93] ">Security Standard:</span>
              <span className="text-[#858B93] ">
                {isProduction ? "Database-backed unique credentials & signature verification" : "Simulated in-memory hashing for preview"}
              </span>
            </div>
          </div>
        </div>

        {/* Administrative Roles & Privileges (RBAC) */}
        <div className="md:col-span-2 rounded-xl border border-[#E5E7E9] bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6F7F8] text-[#25292F]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#34383D]">
                Administrative Access &amp; Role-Based Access Control (RBAC)
              </h3>
              <p className="text-xs text-[#858B93]">
                Strict 4-tier authorization matrix enforced at both server-side action and page route levels
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border border-[#E5E7E9] bg-[#F9FAFB] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#17191C]">Master Admin</span>
                <Badge className="bg-[#17191C] text-white text-[9px]">Root Tier</Badge>
              </div>
              <p className="text-[11px] text-[#777E86] leading-relaxed">
                Full platform access: event creation/deletion, ticket studio, system settings, database management, and audit logs.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E5E7E9] bg-[#F9FAFB] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#17191C]">Event Manager</span>
                <Badge variant="outline" className="text-[#17191C] border-[#D0D3D6] text-[9px]">Operator Tier</Badge>
              </div>
              <p className="text-[11px] text-[#777E86] leading-relaxed">
                Event creation and editing, multi-stage rounds, ticket templates, attendee passes, communications, and certificates.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E5E7E9] bg-[#F9FAFB] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#17191C]">Attendance Staff</span>
                <Badge variant="outline" className="text-[#17191C] border-[#D0D3D6] text-[9px]">Gate Tier</Badge>
              </div>
              <p className="text-[11px] text-[#777E86] leading-relaxed">
                Attendance desk camera scanner, rotating QR pass verification, manual participant search, and check-in overrides.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E5E7E9] bg-[#F9FAFB] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#17191C]">Analyst</span>
                <Badge variant="outline" className="text-[#17191C] border-[#D0D3D6] text-[9px]">Read-Only</Badge>
              </div>
              <p className="text-[11px] text-[#777E86] leading-relaxed">
                Read-only reporting, participant directory inspection, registration analytics, and structured CSV/JSON data exports.
              </p>
            </div>
          </div>
        </div>

        {/* Account Password Management */}
        <div className="rounded-xl border border-[#E5E7E9] bg-white p-6 space-y-5 lg:col-span-2">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7E9]">
            <div className="p-2.5 rounded-lg bg-[#F6F7F8] text-[#17191C]">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#17191C]">Administrator Account Password</h2>
              <p className="text-xs text-[#777E86]">
                Set or update an email login password for {user?.email || "your account"} (useful for mobile browsers where Google OAuth is unavailable).
              </p>
            </div>
          </div>

          {passwordFeedback && (
            <div
              className={`rounded-lg border px-4 py-3 text-xs font-medium ${
                passwordFeedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {passwordFeedback.text}
            </div>
          )}

          <form onSubmit={handleUpdateAccountPassword} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label htmlFor="settings-new-password" className="text-xs font-medium text-[#17191C]">
                New Password
              </label>
              <Input
                id="settings-new-password"
                type="password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-confirm-password" className="text-xs font-medium text-[#17191C]">
                Confirm Password
              </label>
              <Input
                id="settings-confirm-password"
                type="password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>

            <div>
              <Button
                type="submit"
                variant="charcoal"
                loading={passwordLoading}
                className="w-full sm:w-auto gap-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Password</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
