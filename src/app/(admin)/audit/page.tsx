import { SketchRepository } from "@/lib/supabase/repository";
import { verifyAdminSession } from "@/lib/auth/session";
import { AccessDenied } from "@/components/auth/access-denied";
import { AuditLogEntry } from "@/types";
import AuditClient from "./audit-client";

export default async function AuditPage() {
  const session = await verifyAdminSession();

  // Strict RBAC: Audit logs are master_admin only
  if (session.user?.role !== "master_admin") {
    return (
      <AccessDenied
        currentRole={session.user?.role}
        requiredRoles={["master_admin"]}
        moduleName="Audit Trail & System Records"
      />
    );
  }

  let logs: AuditLogEntry[] = [];
  const isPreview = SketchRepository.isPreview();

  try {
    logs = await SketchRepository.listAuditLogs({ limit: 100 });
  } catch (err: unknown) {
    console.error("[AuditPage] Failed to load audit logs:", err);
  }

  return <AuditClient initialLogs={logs} isPreview={isPreview} />;
}
