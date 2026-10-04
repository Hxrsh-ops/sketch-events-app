"use client";

import { ShieldCheck, Clock, User, FileText } from "lucide-react";
import { MOCK_RECENT_ACTIVITY } from "@/lib/mock-data";

export default function AuditLogPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#191A1C]">
          Audit & Records
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
          Immutable record of privileged operations, capacity overrides, manual attendance checks, and role changes.
        </p>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-[#EAE8E3] bg-white shadow-sm">
        <table className="w-full text-left text-xs text-[#191A1C]">
          <thead className="border-b border-[#EAE8E3] bg-[#FAF9F7] text-[11px] font-bold uppercase tracking-wider text-[#929398]">
            <tr>
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-4">Administrator</th>
              <th className="py-3.5 px-4">Action</th>
              <th className="py-3.5 px-4">Target Entity</th>
              <th className="py-3.5 px-4">Audit Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F4F1]">
            {MOCK_RECENT_ACTIVITY.map((log) => (
              <tr key={log.id} className="hover:bg-[#FAF9F7] transition-colors">
                <td className="py-3.5 px-4 text-[#929398] font-mono text-[11px]">
                  {log.timestamp}
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-[#929398]" />
                    <span className="font-semibold text-[#191A1C]">{log.actorName}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-semibold text-[#8F2635]">
                  {log.action}
                </td>
                <td className="py-3.5 px-4 font-medium text-[#191A1C]">
                  {log.target}
                </td>
                <td className="py-3.5 px-4 text-[#65666A] max-w-xs truncate">
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
