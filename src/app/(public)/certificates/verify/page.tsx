"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Search, ArrowRight, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CertificateVerifySearchPage() {
  const router = useRouter();
  const [certInput, setCertInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = certInput.trim();
    if (!clean) {
      setError("Please enter a valid certificate number.");
      return;
    }
    setError(null);
    router.push(`/certificates/verify/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F8] dark:bg-[#0E1012] flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="max-w-xl w-full mx-auto space-y-8 my-auto">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-[#181B1E] border border-[#E5E7EA] dark:border-[#30353A] shadow-xs text-[#17191C] dark:text-[#F1F2F3]">
            <Award className="h-7 w-7" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#8A9098] uppercase">
            PUBLIC CREDENTIAL REGISTRY
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17191C] dark:text-[#F1F2F3] tracking-tight">
            Verify Digital Certificate
          </h1>
          <p className="text-xs sm:text-sm text-[#656B73] dark:text-[#8A9098] max-w-md mx-auto leading-relaxed">
            Validate the authenticity, recipient status, and issuance record of any official SketchHUB event credential.
          </p>
        </div>

        <div className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#181B1E] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="cert-number"
                className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3] uppercase tracking-wider"
              >
                Certificate Identifier
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9098]" />
                <Input
                  id="cert-number"
                  type="text"
                  placeholder="e.g. SKETCH-CERT-2026-4821"
                  value={certInput}
                  onChange={(e) => {
                    setCertInput(e.target.value);
                    if (error) setError(null);
                  }}
                  className="pl-10 h-12 text-sm font-mono rounded-xl border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#131518]"
                />
              </div>
              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full rounded-full gap-2 text-xs font-semibold h-11 bg-[#17191C] text-white hover:bg-[#25292F] shadow-sm"
            >
              <span>Verify Credential</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#F0F1F2] dark:border-[#262A2E] text-center">
            <p className="text-[11px] text-[#8A9098]">
              Looking for event passes? Attendee QR tickets rotate live on their individual ticket link.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-[#656B73] dark:text-[#8A9098] hover:text-[#17191C] dark:hover:text-white transition-colors"
          >
            &larr; Return to SketchHUB Home
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-[#8A9098]">
        &copy; {new Date().getFullYear()} SketchHUB Event Platform &bull; Verifiable Attendance Registry
      </div>
    </div>
  );
}
