"use client";

import { useState } from "react";
import { UserCheck, Search, Users, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_TEAMS } from "@/lib/mock-data";

export default function TeamsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTeams = MOCK_TEAMS.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.captainName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#191A1C]">
            Teams
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
            Manage participant teams, rosters, and team captain credentials for hackathons and sprints.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-[#EAE8E3] bg-white p-4 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#929398]" />
          <input
            type="text"
            placeholder="Search teams by name or captain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#EAE8E3] bg-[#F9F8F6] pl-9 pr-4 text-xs text-[#191A1C] placeholder:text-[#929398] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            className="rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#191A1C]">{team.name}</h3>
                <span className="text-xs text-[#65666A]">{team.eventTitle}</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  team.status === "complete"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {team.status.toUpperCase()}
              </span>
            </div>

            <div className="border-t border-[#F5F4F1] pt-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#929398]">Captain:</span>
                <span className="font-semibold text-[#191A1C]">{team.captainName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#929398]">Contact:</span>
                <span className="text-[#65666A]">{team.captainEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#929398]">Roster Size:</span>
                <span className="font-bold text-[#191A1C]">
                  {team.memberCount} / {team.maxMembers} Members
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs"
              onClick={() => alert(`View roster for ${team.name}`)}
            >
              View Full Roster
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
