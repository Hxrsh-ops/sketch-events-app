"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Menu,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { isPreviewMode } from "@/lib/env";
import { BrandedInitScreen } from "@/components/feedback/branded-init-screen";
import { sanitizeInternalRedirect } from "@/lib/auth/redirect";
import { getAuthErrorMessage } from "@/lib/auth/auth-errors";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectTarget = sanitizeInternalRedirect(rawRedirect, "/");
  const urlError = searchParams.get("error");
  const urlDetails = searchParams.get("details");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Only show full-screen verification during genuine non-preview server-side auth checking
  const [checkingExistingSession, setCheckingExistingSession] = useState(false);

  // Password Recovery Dialog State
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Help & Navigation Toast State
  const [navNotice, setNavNotice] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(
    getAuthErrorMessage(urlError, urlDetails)
  );
  const isPreview = isPreviewMode();

  // Genuine session check on initial mount
  useEffect(() => {
    let mounted = true;

    async function checkExistingAuth() {
      if (isPreview) {
        if (mounted) setCheckingExistingSession(false);
        return;
      }

      try {
        const supabase = createClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && mounted) {
            router.replace(redirectTarget);
            return;
          }
        }
      } catch {
        // Proceed to show login
      } finally {
        if (mounted) setCheckingExistingSession(false);
      }
    }

    checkExistingAuth();
    return () => {
      mounted = false;
    };
  }, [isPreview, redirectTarget, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both administrator email and password.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setErrorMessage("Please enter a valid administrator email address.");
      return;
    }

    setEmailLoading(true);

    try {
      if (isPreview) {
        // Establish an explicit preview session cookie via server route
        const res = await fetch("/api/auth/preview-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, role: "master_admin" }),
        });

        if (!res.ok) {
          throw new Error("Unable to establish preview session.");
        }

        router.replace(redirectTarget);
        router.refresh();
        return;
      }

      // Production Supabase Auth Flow
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Authentication client is unavailable. Check environment variables.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setEmailLoading(false);
        return;
      }

      if (data.user) {
        // Verify admin profile exists in PostgreSQL database
        const { data: profile, error: profileErr } = await (supabase as any)
          .from("admin_profiles")
          .select("id, role")
          .eq("id", data.user.id)
          .single();

        if (profileErr || !profile) {
          await supabase.auth.signOut();
          setErrorMessage(
            "Access Denied: This account is not registered in the SketchHUB administrator roster."
          );
          setEmailLoading(false);
          return;
        }

        router.replace(redirectTarget);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during authentication.");
      setEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);

    try {
      if (isPreview) {
        // In local preview environment where Supabase is not configured:
        // Do NOT silently fake production OAuth. Provide honest, actionable feedback.
        setErrorMessage(
          "Google OAuth requires a remote Supabase project. In Preview Workspace mode, you can sign in directly using email & password or click the preview demo indicator above."
        );
        setGoogleLoading(false);
        return;
      }

      // Production Supabase Google OAuth Flow
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Authentication service is unavailable. Please check Supabase environment configuration.");
      }

      // Derive absolute callback URL
      const callbackUrl = new URL("/api/auth/callback", window.location.origin);
      if (redirectTarget && redirectTarget !== "/") {
        callbackUrl.searchParams.set("redirect", redirectTarget);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setErrorMessage(
          `Google OAuth initialization failed: ${error.message}. Ensure Google provider is enabled in the Supabase Dashboard.`
        );
        setGoogleLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Google OAuth initialization failed.");
      setGoogleLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryMessage(null);
    const trimmed = recoveryEmail.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setRecoveryMessage({ type: "error", text: "Please enter a valid administrator email address." });
      return;
    }

    setRecoveryLoading(true);
    try {
      if (isPreview) {
        // Honest preview feedback
        setRecoveryMessage({
          type: "success",
          text: `[Preview Mode] Password reset instructions simulated for ${trimmed}. In production, Supabase Auth will send a secure recovery link.`,
        });
        setRecoveryLoading(false);
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        throw new Error("Authentication service is unavailable.");
      }

      const resetUrl = new URL("/login", window.location.origin).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: resetUrl,
      });

      if (error) {
        setRecoveryMessage({ type: "error", text: error.message });
      } else {
        setRecoveryMessage({
          type: "success",
          text: `If an authorized administrator account is associated with ${trimmed}, password recovery instructions have been sent. Please check your inbox.`,
        });
      }
    } catch (err: any) {
      setRecoveryMessage({
        type: "error",
        text: err.message || "Unable to send password recovery email.",
      });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleQuickPreviewFill = () => {
    setEmail("admin@sketch.org");
    setPassword("••••••••••••");
  };

  const isAnyLoading = emailLoading || googleLoading;

  if (checkingExistingSession) {
    return (
      <BrandedInitScreen
        message="Checking existing session"
        subMessage="Connecting to SketchHUB administrator gateway"
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden selection:bg-[#EA4F3C] selection:text-white">
      {/*
        ========================================================================
        1. FULL-VIEWPORT CINEMATIC BACKGROUND
        Edge-to-edge sunset imagery with modern architectural terrace foreground,
        infinity pool reflections, coastal horizon, and subtle dark overlay.
        ========================================================================
      */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <Image
          src="/assets/cinematic-sunset-bg.jpg"
          alt="Sketch Cinematic Sunset Terrace"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_right] sm:object-center transition-opacity duration-1000"
          quality={90}
        />
        {/* Carefully tuned subtle dark overlay to ensure high contrast and text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/*
        ========================================================================
        2. EDITORIAL TOP NAVIGATION HEADER
        Discreet, widely tracked branding on left, contextual navigation on right.
        ========================================================================
      */}
      <header className="relative z-20 w-full px-5 sm:px-12 pt-6 sm:pt-8 flex flex-wrap items-center justify-between text-white/90 gap-3">
        {/* Left: Menu icon & SKETCH | CAMPUS OPERATIONS */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <button
            type="button"
            onClick={() => {
              setNavNotice("Main menu is reserved for active administrator sessions.");
              setTimeout(() => setNavNotice(null), 4000);
            }}
            className="p-1 text-white/80 hover:text-white transition-colors cursor-pointer rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
            aria-label="Navigation Menu"
          >
            <Menu className="h-5 w-5 tracking-tight stroke-[1.75]" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-semibold tracking-[0.18em] sm:tracking-[0.22em] uppercase">
            <span className="text-white">SKETCH</span>
            <span className="text-white/40 font-light">|</span>
            <span className="text-white/80 font-normal hidden xs:inline sm:inline">CAMPUS OPERATIONS</span>
            <span className="text-white/80 font-normal inline xs:hidden sm:hidden">OPS</span>
          </div>
        </div>

        {/* Right: BACK TO SKETCH & NEED HELP? */}
        <div className="flex items-center gap-4 sm:gap-10 text-[10px] sm:text-xs font-semibold tracking-[0.14em] sm:tracking-[0.18em] uppercase">
          <Link
            href="/e/diet-code-2026"
            className="text-white/70 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 rounded py-0.5"
          >
            BACK TO SKETCH
          </Link>
          <button
            type="button"
            onClick={() => {
              setNavNotice("For login support or credential reset, email ops-support@sketch.org.");
              setTimeout(() => setNavNotice(null), 5000);
            }}
            className="text-white/70 hover:text-white transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 rounded py-0.5"
          >
            NEED HELP?
          </button>
        </div>
      </header>

      {/* Feedback Notification Toast */}
      <AnimatePresence>
        {navNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 right-6 sm:right-12 z-50 max-w-sm rounded-xl border border-white/20 bg-black/75 backdrop-blur-md px-4 py-3 text-xs text-white/90 shadow-2xl flex items-center justify-between gap-3"
          >
            <span>{navNotice}</span>
            <button
              onClick={() => setNavNotice(null)}
              className="text-white/60 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        ========================================================================
        3. CENTRAL BRAND IDENTITY & TRANSLUCENT LOGIN COMPOSITION
        Recreates the exact visual hierarchy of the reference:
        Isometric Mark -> SketchHUB Title + OPS badge -> Subtitle -> Form
        ========================================================================
      */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[430px] flex flex-col items-center text-center"
        >
          {/* Authentic Isometric Metallic Sketch Logo Mark */}
          <div className="relative mb-3 flex items-center justify-center">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              <img
                src="/assets/sketch-isometric-mark.png"
                alt="Sketch Isometric Mark"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* Product Name & Coral/Red OPS Badge */}
          <div className="flex items-center justify-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white drop-shadow-md">
              SketchHUB
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border border-[#EA4F3C] text-[10px] font-bold tracking-wider text-[#EA4F3C] uppercase bg-[#EA4F3C]/10 backdrop-blur-xs">
              OPS
            </span>
          </div>

          {/* Tracked Subtitle */}
          <p className="mt-1 text-[10.5px] sm:text-[11px] font-medium tracking-[0.26em] uppercase text-white/70">
            CAMPUS EVENT OPERATIONS
          </p>

          {/* Preview Mode Pill Indicator */}
          {isPreview && (
            <button
              type="button"
              onClick={handleQuickPreviewFill}
              title="Click to auto-populate preview credentials"
              className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur-md text-[10.5px] font-medium tracking-[0.16em] uppercase text-white/80 hover:text-white transition-all cursor-pointer group shadow-lg"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>PREVIEW WORKSPACE · LOCAL ENVIRONMENT</span>
            </button>
          )}

          {/* Dynamic Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="w-full overflow-hidden text-left"
              >
                <div className="flex items-start gap-2.5 rounded-2xl border border-[#EA4F3C]/40 bg-black/70 backdrop-blur-md p-3.5 text-left shadow-xl">
                  <AlertCircle className="h-4 w-4 text-[#EA4F3C] shrink-0 mt-0.5" />
                  <p className="text-xs text-white/90 leading-relaxed font-normal">
                    {errorMessage}
                  </p>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="ml-auto text-white/50 hover:text-white cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Translucent Form Container */}
          <form onSubmit={handleSignIn} className="w-full mt-6 space-y-3.5">
            {/* Administrator Email Input with Leading Envelope Icon */}
            <div className="relative flex items-center">
              <input
                id="email-input"
                type="email"
                required
                autoComplete="email"
                disabled={isAnyLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Administrator email"
                className="h-12 w-full rounded-2xl border border-white/15 bg-black/35 backdrop-blur-md pl-14 pr-4 text-xs sm:text-sm text-white placeholder:text-white/45 transition-all duration-200 focus:bg-black/55 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 disabled:opacity-60 shadow-inner"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2.5 pointer-events-none z-10 text-white/80">
                <Mail className="h-[19px] w-[19px] shrink-0 text-white stroke-[1.75]" />
                <span className="h-4 w-[1px] bg-white/25" />
              </div>
            </div>

            {/* Password Input with Leading Lock Icon and Right Eye Toggle */}
            <div className="relative flex items-center">
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                disabled={isAnyLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-12 w-full rounded-2xl border border-white/15 bg-black/35 backdrop-blur-md pl-14 pr-11 text-xs sm:text-sm text-white placeholder:text-white/45 transition-all duration-200 focus:bg-black/55 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 disabled:opacity-60 shadow-inner"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2.5 pointer-events-none z-10 text-white/80">
                <Lock className="h-[19px] w-[19px] shrink-0 text-white stroke-[1.75]" />
                <span className="h-4 w-[1px] bg-white/25" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors p-1 rounded focus:outline-none cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 stroke-[1.75]" />
                ) : (
                  <Eye className="h-4 w-4 stroke-[1.75]" />
                )}
              </button>
            </div>

            {/* Charcoal Primary Submission Button Coordinated with Dashboard Palette */}
            <button
              type="submit"
              disabled={isAnyLoading}
              className="w-full h-12 rounded-2xl bg-[#25292F] hover:bg-[#1D2025] active:scale-[0.99] text-white font-medium text-xs sm:text-sm border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {emailLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <span>Sign in to dashboard</span>
                  <ArrowRight className="h-4 w-4 stroke-[2]" />
                </>
              )}
            </button>
          </form>

          {/* Divider: CONTINUE WITH GOOGLE */}
          <div className="w-full my-6 flex items-center justify-center">
            <span className="flex-1 h-[1px] bg-white/15" />
            <span className="px-3 text-[9.5px] sm:text-[10px] font-semibold tracking-[0.24em] uppercase text-white/60">
              CONTINUE WITH GOOGLE
            </span>
            <span className="flex-1 h-[1px] bg-white/15" />
          </div>

          {/* Centered Google Auth Control Row with Flanking Forgot Password */}
          <div className="relative w-full flex items-center justify-center min-h-[48px]">
            {/* Perfectly Centered Circular Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAnyLoading}
              title="Sign in with Google"
              className="h-11 w-11 rounded-full border border-white/30 bg-black/45 hover:bg-black/70 hover:border-white/50 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-60 shadow-lg group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 z-10"
            >
              {googleLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <GoogleIcon className="h-5 w-5 transform transition-transform group-hover:scale-110" />
              )}
            </button>

            {/* Forgot Password Link Positioned Accurately on the Right without Offset */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => {
                  setRecoveryOpen(true);
                  setRecoveryMessage(null);
                  setRecoveryEmail(email);
                }}
                className="text-xs sm:text-sm font-normal text-white/70 hover:text-white transition-colors cursor-pointer focus:outline-none focus:underline underline-offset-4"
              >
                Forgot password?
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/*
        ========================================================================
        4. EDITORIAL BOTTOM-EDGE ACCENTS
        Left: EVENTS · PEOPLE · IDEAS —
        Right: — AUTHORISED ADMINISTRATORS ONLY
        ========================================================================
      */}
      <footer className="relative z-20 w-full px-6 sm:px-12 pb-6 sm:pt-4 sm:pb-8 flex flex-col sm:flex-row items-center justify-between text-white/70 gap-3 text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] uppercase">
        {/* Left */}
        <div className="flex items-center gap-3">
          <span>EVENTS · PEOPLE · IDEAS</span>
          <span className="h-[1px] w-8 sm:w-12 bg-white/40 hidden sm:inline-block" />
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 text-white/60">
          <span className="h-[1px] w-8 sm:w-12 bg-white/40 hidden sm:inline-block" />
          <span>AUTHORISED ADMINISTRATORS ONLY</span>
        </div>
      </footer>

      {/*
        ========================================================================
        5. PASSWORD RECOVERY MODAL
        Provides a real, secure password recovery experience.
        ========================================================================
      */}
      <AnimatePresence>
        {recoveryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecoveryOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-black/85 backdrop-blur-xl p-6 sm:p-8 text-white shadow-2xl text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    Reset Administrator Password
                  </h3>
                  <p className="mt-1 text-xs text-white/70 leading-relaxed">
                    Enter your authorized administrator email address. We will send a secure reset link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(false)}
                  className="text-white/60 hover:text-white p-1 rounded cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {recoveryMessage && (
                <div
                  className={`mt-4 rounded-xl border p-3 text-xs flex items-start gap-2.5 ${
                    recoveryMessage.type === "success"
                      ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
                      : "border-[#EA4F3C]/40 bg-[#EA4F3C]/10 text-white"
                  }`}
                >
                  {recoveryMessage.type === "success" ? (
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-[#EA4F3C] shrink-0 mt-0.5" />
                  )}
                  <p className="leading-relaxed">{recoveryMessage.text}</p>
                </div>
              )}

              <form onSubmit={handlePasswordRecovery} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="recovery-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5"
                  >
                    Administrator Email
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="alex.morgan@sketch.org"
                    className="h-11 w-full rounded-xl border border-white/20 bg-white/5 px-3.5 text-xs text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRecoveryOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="px-5 py-2 rounded-xl bg-[#EA4F3C] hover:bg-[#D94331] text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-60"
                  >
                    {recoveryLoading ? "Sending link..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <BrandedInitScreen
          message="Loading workspace"
          subMessage="Preparing SketchHUB interface"
        />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
