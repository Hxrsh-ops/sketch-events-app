"use client";

import { User } from "lucide-react";
import { MOCK_RECENT_ACTIVITY } from "@/lib/mock-data";

export default function AuditLogPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#17191C]">
          Audit & Records
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#656B73]">
          Immutable record of privileged operations, capacity overrides, manual attendance checks, and role changes.
        </p>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#E5E7EA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <table className="w-full text-left text-xs text-[#17191C]">
          <thead className="border-b border-[#E5E7EA] bg-[#F4F5F6]/50 text-[11px] font-bold uppercase tracking-wider text-[#8A9098]">
            <tr>
              <th className="py-4 px-5">Timestamp</th>
              <th className="py-4 px-5">Administrator</th>
              <th className="py-4 px-5">Action</th>
              <th className="py-4 px-5">Target Entity</th>
              <th className="py-4 px-5">Audit Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F5F6]">
            {MOCK_RECENT_ACTIVITY.map((log) => (
              <tr key={log.id} className="hover:bg-[#F4F5F6]/40 transition-colors">
                <td className="py-4 px-5 text-[#8A9098] font-mono text-[11px]">
                  {log.timestamp}
                </td>
                <td className="py-4 px-5">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-[#8A9098]" />
                    <span className="font-semibold text-[#17191C]">{log.actorName}</span>
                  </div>
                </td>
                <td className="py-4 px-5 font-semibold text-[#17191C]">
                  {log.action}
                </td>
                <td className="py-4 px-5 font-medium text-[#17191C]">
                  {log.target}
                </td>
                <td className="py-4 px-5 text-[#656B73] max-w-xs truncate">
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
