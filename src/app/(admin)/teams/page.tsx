"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17191C]">
            Teams
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73]">
            Manage participant teams, rosters, and team captain credentials for hackathons and sprints.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between rounded-[24px] border border-[#E5E7EA] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098]" />
          <input
            type="text"
            placeholder="Search teams by name or captain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-[#E5E7EA] bg-[#F4F5F6] pl-9 pr-4 text-xs text-[#17191C] placeholder:text-[#8A9098] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25292F]/20"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            className="rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#17191C]">{team.name}</h3>
                <span className="text-xs text-[#656B73]">{team.eventTitle}</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAECEF] text-[#17191C]">
                {team.status.toUpperCase()}
              </span>
            </div>

            <div className="border-t border-[#F4F5F6] pt-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8A9098]">Captain:</span>
                <span className="font-semibold text-[#17191C]">{team.captainName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A9098]">Contact:</span>
                <span className="text-[#656B73]">{team.captainEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A9098]">Roster Size:</span>
                <span className="font-bold text-[#17191C]">
                  {team.memberCount} / {team.maxMembers} Members
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-full text-xs"
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
