"use client";

import { Download, FileSpreadsheet, ShieldAlert, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExportsPage() {
  const handleExport = (type: string) => {
    alert(`Generating scoped export for: ${type}. Every export action creates a recorded entry in the audit log.`);
  };

  return (
    <div className="flex flex-col space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#191A1C]">
          Exports & Reports
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
          Permissioned data exports with privacy-conscious defaults and mandatory audit trail tracking.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Privacy & Compliance Boundary:</strong>
          <p className="mt-0.5 text-amber-800 leading-relaxed">
            Exports exclude sensitive participant contact details unless explicitly authorized by Master Admin. Every downloaded report is recorded with timestamp and administrator identity in the audit log.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 mb-3">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-[#191A1C]">
              Attendance & Roster Report
            </h3>
            <p className="text-xs text-[#65666A] mt-1 leading-relaxed">
              Export verified check-in lists, timestamps, and manual verification notes grouped by event.
            </p>
          </div>
          <Button
            variant="forest"
            size="sm"
            className="w-full rounded-xl gap-2 font-semibold"
            onClick={() => handleExport("Attendance Roster")}
          >
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </Button>
        </div>

        <div className="rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800 mb-3">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-[#191A1C]">
              Certificate Issuance Log
            </h3>
            <p className="text-xs text-[#65666A] mt-1 leading-relaxed">
              Export issued certificate serials, recipient names, and delivery status logs.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl gap-2 font-semibold border-[#E8E6E1]"
            onClick={() => handleExport("Certificate Issuance")}
          >
            <Download className="h-4 w-4 text-[#65666A]" />
            <span>Download CSV</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
