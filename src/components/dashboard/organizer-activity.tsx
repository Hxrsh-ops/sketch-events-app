import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCheck } from "lucide-react";
import { AdminUser, EventItem } from "@/types";

interface Organizer {
  name: string;
  initials: string;
  role: string;
  assignment: string;
}

const PREVIEW_DUTY_ROSTER: Organizer[] = [
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

interface OrganizerActivityProps {
  admins?: AdminUser[];
  events?: EventItem[];
  isPreview?: boolean;
}

export function OrganizerActivity({
  admins,
  events = [],
  isPreview = false,
}: OrganizerActivityProps = {}) {
  const roleLabels: Record<string, string> = {
    master_admin: "Lead Coordinator",
    coordinator: "Event Operations",
    desk_staff: "Desk Operations",
    jury_judge: "Jury & Review Lead",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  let dutyRoster: Organizer[] = [];

  if (admins && admins.length > 0) {
    dutyRoster = admins.slice(0, 4).map((adm, idx) => ({
      name: adm.name || adm.email,
      initials: getInitials(adm.name || adm.email),
      role: roleLabels[adm.role] || adm.role.replace("_", " "),
      assignment: events[idx]?.title || "Operations Platform",
    }));
  } else if (isPreview) {
    dutyRoster = PREVIEW_DUTY_ROSTER;
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#E5E7E9] bg-white p-5 shadow-xs">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#777E86]" />
            <h3 className="text-sm font-semibold text-[#34383D]">
              Recent Activity &amp; Duty Leads
            </h3>
          </div>
          <span className="text-[10px] font-medium text-[#858B93]">
            {dutyRoster.length} Assigned
          </span>
        </div>

        {/* Member List with Initials-based Avatars */}
        {dutyRoster.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[#E5E7E9] p-6 text-center text-xs text-[#858B93]">
            No operations duty leads assigned yet.
          </div>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-[#E5E7E9]">
            {dutyRoster.map((member, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-7 w-7 border border-[#E5E7E9] bg-[#E3E5E8]">
                    <AvatarFallback className="bg-[#E3E5E8] text-[#34383D] text-[10px] font-semibold">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#34383D]">
                      {member.name}
                    </span>
                    <span className="text-[11px] text-[#858B93]">
                      {member.role}
                    </span>
                  </div>
                </div>

                <span className="rounded-md bg-[#F6F7F8] border border-[#E5E7E9] px-2 py-0.5 text-[10px] font-medium text-[#858B93] line-clamp-1 max-w-[120px]">
                  {member.assignment}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-[#E5E7E9] pt-2.5 flex items-center justify-between text-[11px] text-[#858B93]">
        <span>Administrative Coverage</span>
        <span className="font-medium text-[#34383D]">
          {dutyRoster.length} Team {dutyRoster.length === 1 ? "Member" : "Members"}
        </span>
      </div>
    </div>
  );
}
