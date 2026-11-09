import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Calendar,
  Award,
  ArrowLeft,
  Search,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SketchRepository } from "@/lib/supabase/repository";
import { formatDate } from "@/lib/utils";

interface VerifyCertificatePageProps {
  params: Promise<{ number: string }>;
}

export default async function VerifyCertificatePage({ params }: VerifyCertificatePageProps) {
  const { number } = await params;
  const decodedNumber = decodeURIComponent(number || "").trim();

  let cert = null;
  let fetchError: string | null = null;

  try {
    cert = await SketchRepository.verifyCertificate(decodedNumber);
  } catch (err: any) {
    fetchError = err?.message || "Failed to query certificate registry.";
  }

  const isIssued = Boolean(cert && cert.isValid && cert.status === "issued");
  const isRevoked = Boolean(cert && cert.status === "revoked");
  const isNotFound = !cert && !fetchError;

  return (
    <div className="min-h-screen bg-[#F6F7F8] dark:bg-[#0E1012] flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Navigation & Brand */}
        <div className="flex items-center justify-between">
          <Link
            href="/certificates/verify"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#656B73] dark:text-[#8A9098] hover:text-[#17191C] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Verify Another Credential</span>
          </Link>

          <span className="text-[10px] font-mono font-bold tracking-widest text-[#8A9098] uppercase">
            SKETCH VERIFICATION SERVICE
          </span>
        </div>

        {/* Certificate Verification Card */}
        <div className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#181B1E] p-8 sm:p-10 shadow-sm space-y-8">
          {/* Header Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#F0F1F2] dark:border-[#262A2E]">
            <div className="flex items-center gap-3">
              {isIssued ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  <CheckCircle2 className="h-6 w-6 stroke-[2.5]" />
                </div>
              ) : isRevoked ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                  <AlertTriangle className="h-6 w-6 stroke-[2.5]" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F5F6] dark:bg-[#202428] text-[#8A9098] border border-[#E5E7EA] dark:border-[#30353A]">
                  <XCircle className="h-6 w-6 stroke-[2.5]" />
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#8A9098]">
                  VERIFICATION RESULT
                </span>
                <h1 className="text-xl font-extrabold text-[#17191C] dark:text-[#F1F2F3] mt-0.5">
                  {isIssued
                    ? "Verified Official Credential"
                    : isRevoked
                    ? "Certificate Formally Revoked"
                    : "Unrecognized Certificate ID"}
                </h1>
              </div>
            </div>

            <div>
              {isIssued ? (
                <span className="rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Valid
                </span>
              ) : isRevoked ? (
                <span className="rounded-full bg-[#17191C] dark:bg-white text-white dark:text-[#17191C] px-3 py-1 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Revoked
                </span>
              ) : (
                <span className="rounded-full bg-[#8A9098] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
                  Invalid
                </span>
              )}
            </div>
          </div>

          {/* Body Information */}
          {isIssued && cert ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#131518] p-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#8A9098] uppercase tracking-wider">
                    RECIPIENT NAME
                  </span>
                  <div className="text-2xl font-black text-[#17191C] dark:text-[#F1F2F3]">
                    {cert.recipientName}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#EAECEF] dark:border-[#262A2E]">
                  <div>
                    <span className="text-[10px] font-bold text-[#8A9098] uppercase tracking-wider">
                      EVENT / EXPERIENCE
                    </span>
                    <p className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3] mt-0.5">
                      {cert.eventTitle}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#8A9098] uppercase tracking-wider">
                      DATE OF ISSUANCE
                    </span>
                    <p className="text-sm font-semibold text-[#17191C] dark:text-[#F1F2F3] mt-0.5">
                      {cert.issuedAt ? formatDate(cert.issuedAt) : "Verified in Record"}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EAECEF] dark:border-[#262A2E] flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold text-[#8A9098] uppercase tracking-wider">
                    CERTIFICATE IDENTIFIER
                  </span>
                  <span className="font-mono font-bold text-[#17191C] dark:text-[#F1F2F3]">
                    {cert.certificateNumber}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <a
                  href={`/api/certificates/verify/${encodeURIComponent(decodedNumber)}/pdf`}
                  className="w-full sm:w-auto flex-1"
                  download
                >
                  <Button
                    variant="default"
                    className="w-full rounded-full gap-2 text-xs font-semibold h-11 bg-[#17191C] text-white hover:bg-[#25292F] shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Official Certificate PDF</span>
                  </Button>
                </a>
                <Link href="/certificates/verify" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto rounded-full text-xs font-semibold h-11 px-6 border-[#E5E7EA] dark:border-[#30353A]"
                  >
                    Lookup Another ID
                  </Button>
                </Link>
              </div>

              <div className="rounded-xl border border-[#E5E7EA] dark:border-[#30353A] p-4 text-[11px] text-[#656B73] dark:text-[#8A9098] leading-relaxed">
                <strong>Cryptographic Integrity Notice:</strong> This digital certificate record was issued directly by the SketchHUB Event Platform upon confirmed event attendance. In accordance with platform privacy regulations, no private attendee email addresses or telephone numbers are publicly exposed.
              </div>
            </div>
          ) : isRevoked && cert ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 p-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-amber-900/70 dark:text-amber-300/70 uppercase tracking-wider">
                    REVOCATION NOTICE
                  </span>
                  <div className="text-xl font-bold text-[#17191C] dark:text-[#F1F2F3]">
                    {cert.recipientName}
                  </div>
                  <p className="text-xs text-[#656B73] dark:text-[#8A9098] leading-relaxed">
                    This certificate for <strong>{cert.eventTitle}</strong> was previously recorded but has been formally revoked by administration. It is no longer valid for official credentials.
                  </p>
                </div>

                <div className="pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs font-mono">
                  <span className="text-[#8A9098]">Certificate ID:</span>
                  <span className="font-bold text-[#17191C] dark:text-[#F1F2F3]">{cert.certificateNumber}</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <Link href="/certificates/verify">
                  <Button
                    variant="outline"
                    className="rounded-full text-xs font-semibold px-6 border-[#E5E7EA] dark:border-[#30353A]"
                  >
                    Return to Verification Search
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center py-4">
              <div className="space-y-2 max-w-md mx-auto">
                <p className="text-xs text-[#656B73] dark:text-[#8A9098] leading-relaxed">
                  We could not find any active or historical certificate record matching:
                </p>
                <div className="rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#131518] p-3 text-xs font-mono font-bold text-[#17191C] dark:text-[#F1F2F3]">
                  {decodedNumber}
                </div>
                <p className="text-[11px] text-[#8A9098] pt-1">
                  Please verify the certificate number printed on your document and re-enter it carefully.
                </p>
              </div>

              <div className="pt-2">
                <Link href="/certificates/verify">
                  <Button
                    variant="charcoal"
                    className="rounded-full text-xs font-semibold px-6"
                  >
                    Search Another Certificate ID
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Notice */}
      <div className="text-center text-[11px] text-[#8A9098] pt-8">
        &copy; {new Date().getFullYear()} SketchHUB Event Operations Platform &bull; Automated Verification
      </div>
    </div>
  );
}
