"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCheck } from "lucide-react";

interface Organizer {
  name: string;
  initials: string;
  role: string;
  assignment: string;
}

const DUTY_ROSTER: Organizer[] = [
  {
    name: "Harshanth",
    initials: "HA",
    role: "Lead Coordinator",
    assignment: "Design Sprint '26",
  },
  {
    name: "Dia Sen",
    initials: "DS",
    role: "Jury & Review Lead",
    assignment: "Prompt to Prototype",
  },
  {
    name: "Rohan Varma",
    initials: "RV",
    role: "Desk Operations",
    assignment: "Gate 1 Concourse",
  },
  {
    name: "Aarav Sharma",
    initials: "AS",
    role: "Pass Dispatch Admin",
    assignment: "Outbox Engine",
  },
];

export function OrganizerActivity() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Operations Duty Leads
            </h3>
          </div>
          <span className="text-[10px] font-medium text-[#656B73] dark:text-[#A6ADB5]">
            {DUTY_ROSTER.length} Assigned
          </span>
        </div>

        {/* Member List with Initials-based Avatars */}
        <div className="mt-4 flex flex-col divide-y divide-[#F4F5F6] dark:divide-[#262A2E]">
          {DUTY_ROSTER.map((member, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8 border border-[#E5E7EA] dark:border-[#30353A] bg-[#F0F1F2] dark:bg-[#25292F]">
                  <AvatarFallback className="bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] text-[10px] font-bold">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                    {member.name}
                  </span>
                  <span className="text-[11px] text-[#656B73] dark:text-[#A6ADB5]">
                    {member.role}
                  </span>
                </div>
              </div>

              <span className="rounded-full bg-[#F0F1F2] dark:bg-[#25292F] px-2 py-0.5 text-[10px] font-medium text-[#656B73] dark:text-[#A6ADB5] line-clamp-1 max-w-[120px]">
                {member.assignment}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-[#F4F5F6] dark:border-[#262A2E] pt-2.5 flex items-center justify-between text-[11px] text-[#8A9098] dark:text-[#7D858F]">
        <span>Role coverage active</span>
        <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">4 Team Members</span>
      </div>
    </div>
  );
}
