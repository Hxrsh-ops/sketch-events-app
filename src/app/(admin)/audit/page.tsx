import { SketchRepository } from "@/lib/supabase/repository";
import { AuditLogEntry } from "@/types";
import AuditClient from "./audit-client";

export default async function AuditPage() {
  let logs: AuditLogEntry[] = [];
  const isPreview = SketchRepository.isPreview();

  try {
    logs = await SketchRepository.listAuditLogs({ limit: 100 });
  } catch (err: unknown) {
    console.error("[AuditPage] Failed to load audit logs:", err);
  }

  return <AuditClient initialLogs={logs} isPreview={isPreview} />;
}
