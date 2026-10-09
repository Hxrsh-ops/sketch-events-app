"use client";

import { GitBranch, Clock, MapPin, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_ROUNDS } from "@/lib/mock-data";

export default function RoundsPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17191C]">
            Rounds & Progression
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73]">
            Configure competition stages, evaluation criteria, and audited progression into subsequent rounds.
          </p>
        </div>

        <Button
          variant="charcoal"
          className="rounded-full gap-2 font-medium shadow-sm"
          onClick={() => alert("Round configuration dialog")}
        >
          <GitBranch className="h-4 w-4" />
          <span>Add Round</span>
        </Button>
      </div>

      {/* Rounds List */}
      <div className="space-y-4">
        {MOCK_ROUNDS.map((round) => (
          <div
            key={round.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] gap-4 hover:shadow-card transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0F1F2] text-[#17191C] font-extrabold text-base">
                #{round.order}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#17191C]">
                  {round.name}
                </h3>
                <span className="text-xs font-semibold text-[#656B73]">
                  {round.eventTitle}
                </span>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#656B73] pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#8A9098]" />
                    <span>Starts 11:00 AM</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#8A9098]" />
                    <span>{round.venue}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#8A9098]" />
                    <span>
                      <strong>{round.eligibleCount}</strong> Eligible ·{" "}
                      <strong>{round.advancedCount}</strong> Advance
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#EAECEF] text-[#17191C]">
                {round.status.toUpperCase()}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-[#E5E7EA]"
                onClick={() => alert(`Reviewing Round ${round.order} entries`)}
              >
                <span>Manage Entries</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
