"use client";

import { useState } from "react";
import {
  Search,
  Shield,
  User,
  Filter,
  ArrowUpRight,
  Download,
  Clock,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { SlideOver } from "@/components/ui/slide-over";
import { EmptyState } from "@/components/feedback/feedback-states";
import { MOCK_RECENT_ACTIVITY } from "@/lib/mock-data";
import { AuditLogEntry } from "@/types";
import { getStoredAuditLogs } from "@/lib/registration-store";
import { useEffect } from "react";

interface AuditClientProps {
  initialLogs: AuditLogEntry[];
  isPreview: boolean;
}

export default function AuditClient({ initialLogs, isPreview }: AuditClientProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(
    initialLogs.length > 0 ? initialLogs : (isPreview ? MOCK_RECENT_ACTIVITY : [])
  );
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    if (isPreview) {
      const handleSync = () => {
        setLogs(getStoredAuditLogs());
      };
      window.addEventListener("sketch_store_updated", handleSync);
      return () => window.removeEventListener("sketch_store_updated", handleSync);
    }
  }, [isPreview]);

  const checkinCount = logs.filter(
    (l) => l.action.toLowerCase().includes("attendance") || l.action.toLowerCase().includes("check")
  ).length;

  const filterTabs = [
    { id: "all", label: "All Audit Trails", count: logs.length },
    { id: "checkin", label: "Check-in Desk", count: checkinCount },
    { id: "privileged", label: "Privileged Actions", count: Math.max(0, logs.length - checkinCount) },
  ];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === "checkin") return log.action.toLowerCase().includes("attendance") || log.action.toLowerCase().includes("check");
    if (activeTab === "privileged") return !log.action.toLowerCase().includes("attendance");
    return true;
  });

  // Client CSV export
  const handleExportAuditCsv = () => {
    const headers = ["Timestamp", "Administrator", "Email", "Action", "Target Entity", "Details"];
    const escapeCsv = (val: unknown) => {
      let str = String(val ?? "");
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const rows = filteredLogs.map((l) => [
      escapeCsv(l.timestamp),
      escapeCsv(l.actorName),
      escapeCsv(l.actorEmail),
      escapeCsv(l.action),
      escapeCsv(l.target),
      escapeCsv(l.details),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sketch_audit_log_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-[#858B93] uppercase">
            SKETCHHUB WORKSPACE / AUDIT &amp; RECORDS
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C]">
              Audit Trails &amp; Records
            </h1>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-semibold ${
                isPreview
                  ? "border-[#E5E7E9] text-[#858B93]"
                  : "border-emerald-300 text-emerald-700 bg-emerald-50/50"
              }`}
            >
              {isPreview ? "Preview Mode" : "Production Live"}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#777E86]">
            Comprehensive record of administrative operations, capacity overrides, manual attendance validations, and certificate batches.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportAuditCsv}
          className="rounded-full border-[#E5E7E9] text-xs font-semibold gap-1.5 h-9"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Audit CSV</span>
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#E5E7E9] bg-white p-3.5 shadow-sm">
        <AnimatedTabs
          tabs={filterTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          layoutId="auditFilterPill"
        />

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#858B93]" />
          <input
            type="text"
            placeholder="Search audit trail by actor or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-[#E5E7E9] bg-[#F6F7F8] pl-9 pr-4 text-xs text-[#17191C] placeholder:text-[#858B93] transition-all focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17191C]"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7E9] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#17191C]">
            <thead className="border-b border-[#E5E7E9] bg-[#F9FAFB] text-[11px] font-semibold text-[#858B93]">
              <tr>
                <th className="py-3.5 pl-6 pr-4">Timestamp</th>
                <th className="px-4 py-3.5">Administrator</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Target Entity</th>
                <th className="px-4 py-3.5 pr-6">Audit Payload / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F6]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8">
                    <EmptyState
                      icon={Shield}
                      title="No audit entries found"
                      description={
                        searchQuery || activeTab !== "all"
                          ? "No audit records match your search or filter criteria."
                          : "No administrative activity recorded yet."
                      }
                      actionLabel={searchQuery || activeTab !== "all" ? "Reset Filter" : undefined}
                      onAction={() => {
                        setSearchQuery("");
                        setActiveTab("all");
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    tabIndex={0}
                    role="row"
                    onClick={() => setSelectedLog(log)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedLog(log);
                      }
                    }}
                    className="hover:bg-[#F6F7F8] dark:hover:bg-[#E3E5E8] text-[#34383D] transition-colors duration-150 ease-out cursor-pointer focus-visible:outline-none focus-visible:bg-[#F6F7F8] dark:focus-visible:bg-[#E3E5E8] text-[#34383D] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED]"
                  >
                    <td className="py-3.5 pl-6 pr-4 text-[#858B93]  font-mono text-[11px] tabular-nums whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border border-[#E5E7E9]  bg-[#E3E5E8] text-[#34383D] text-white">
                          <AvatarFallback className="bg-[#E3E5E8] text-[#34383D] dark:bg-[#30353A] text-white text-[9px] font-bold">
                            {log.actorName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-[13.5px] text-[#34383D] ">{log.actorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-[#EAECEF]  px-2.5 py-0.5 text-[11px] font-semibold text-[#25292F] ">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-medium text-[#34383D] ">
                      {log.target}
                    </td>
                    <td className="px-4 py-3.5 pr-6 text-[12.5px] text-[#858B93]  max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SlideOver Drawer for Log Details */}
      <SlideOver
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Details"
        subtitle={selectedLog?.action}
        widthClass="max-w-md"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-[#E5E7E9]  bg-[#F9FAFB]  p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-[#858B93]">Action:</span>
                <span className="font-bold text-[#34383D] ">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#858B93]">Actor:</span>
                <span className="font-semibold text-[#34383D] ">
                  {selectedLog.actorName} ({selectedLog.actorEmail})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#858B93]">Target:</span>
                <span className="text-[#34383D] ">{selectedLog.target}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#858B93]">Timestamp:</span>
                <span className="font-mono text-[#858B93] ">{selectedLog.timestamp}</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E7E9]  bg-white p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#858B93]">
                Audit Description & Notes
              </span>
              <p className="text-xs text-[#858B93]  leading-relaxed pt-1">
                {selectedLog.details}
              </p>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
