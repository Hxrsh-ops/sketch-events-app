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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Audit Trails & Records
            </h1>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-semibold ${
                isPreview
                  ? "border-[#E5E7EA] dark:border-[#30353A] text-[#656B73] dark:text-[#A6ADB5]"
                  : "border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
              }`}
            >
              {isPreview ? "Preview Mode" : "Production Live"}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#8A9098]">
            Comprehensive record of administrative operations, capacity overrides, manual attendance validations, and certificate batches.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportAuditCsv}
          className="rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold gap-1.5 h-9 dark:bg-[#1B1E21] dark:text-[#F1F2F3] dark:hover:bg-[#22262A]"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Audit CSV</span>
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 shadow-sm">
        <AnimatedTabs
          tabs={filterTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          layoutId="auditFilterPill"
        />

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098]" />
          <input
            type="text"
            placeholder="Search audit trail by actor or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#151719] pl-9 pr-4 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] transition-all focus:bg-white dark:focus:bg-[#111315] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#8A9098] focus:border-[#25292F] dark:focus:border-[#8A9098]"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#17191C] dark:text-[#F1F2F3]">
            <thead className="border-b border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] text-[11px] font-semibold text-[#656B73] dark:text-[#8A9098]">
              <tr>
                <th className="py-3.5 pl-6 pr-4">Timestamp</th>
                <th className="px-4 py-3.5">Administrator</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Target Entity</th>
                <th className="px-4 py-3.5 pr-6">Audit Payload / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F6] dark:divide-[#262A2E]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#8A9098]">
                    No audit records match your query.
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
                    className="hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] transition-colors duration-150 ease-out cursor-pointer focus-visible:outline-none focus-visible:bg-[#F4F5F6] dark:focus-visible:bg-[#25292F] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED]"
                  >
                    <td className="py-3.5 pl-6 pr-4 text-[#7D858F] dark:text-[#8D949E] font-mono text-[11px] tabular-nums whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border border-[#E5E7EA] dark:border-[#30353A] bg-[#25292F] text-white">
                          <AvatarFallback className="bg-[#25292F] dark:bg-[#30353A] text-white text-[9px] font-bold">
                            {log.actorName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-[13.5px] text-[#17191C] dark:text-[#F1F2F3]">{log.actorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-[#F0F1F2] dark:bg-[#22262A] px-2.5 py-0.5 text-[11px] font-semibold text-[#25292F] dark:text-[#E8EAED]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-medium text-[#17191C] dark:text-[#F1F2F3]">
                      {log.target}
                    </td>
                    <td className="px-4 py-3.5 pr-6 text-[12.5px] text-[#656B73] dark:text-[#989EA7] max-w-sm truncate" title={log.details}>
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
            <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8A9098]">Action:</span>
                <span className="font-bold text-[#17191C] dark:text-[#F1F2F3]">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A9098]">Actor:</span>
                <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                  {selectedLog.actorName} ({selectedLog.actorEmail})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A9098]">Target:</span>
                <span className="text-[#17191C] dark:text-[#F1F2F3]">{selectedLog.target}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A9098]">Timestamp:</span>
                <span className="font-mono text-[#656B73] dark:text-[#8A9098]">{selectedLog.timestamp}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">
                Audit Description & Notes
              </span>
              <p className="text-xs text-[#656B73] dark:text-[#8A9098] leading-relaxed pt-1">
                {selectedLog.details}
              </p>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
