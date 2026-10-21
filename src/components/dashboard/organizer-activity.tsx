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
    <div className="flex h-full flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#25292F] dark:text-white/90" />
            <h3 className="text-sm font-bold text-[#17191C] dark:text-white">
              Operations Duty Leads
            </h3>
          </div>
          <span className="text-[10px] font-medium text-[#5E646E] dark:text-white/80">
            {dutyRoster.length} Assigned
          </span>
        </div>

        {/* Member List with Initials-based Avatars */}
        {dutyRoster.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#E5E7EA] dark:border-[#363C46] p-6 text-center text-xs text-[#8A9098] dark:text-white/50">
            No operations duty leads assigned yet.
          </div>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-[#F4F5F6] dark:divide-white/10">
            {dutyRoster.map((member, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 border border-[#E5E7EA] dark:border-[#363C46] bg-[#F0F1F2] dark:bg-white/10">
                    <AvatarFallback className="bg-[#25292F] dark:bg-white text-white dark:text-[#111315] text-[10px] font-bold">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#17191C] dark:text-white">
                      {member.name}
                    </span>
                    <span className="text-[11px] text-[#5E646E] dark:text-white/70">
                      {member.role}
                    </span>
                  </div>
                </div>

                <span className="rounded-full bg-[#F0F1F2] dark:bg-white/10 border border-[#E5E7EA] dark:border-white/15 px-2 py-0.5 text-[10px] font-medium text-[#5E646E] dark:text-white/80 line-clamp-1 max-w-[120px]">
                  {member.assignment}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-[#F4F5F6] dark:border-white/10 pt-2.5 flex items-center justify-between text-[11px] text-[#828892] dark:text-white/60">
        <span>Role coverage</span>
        <span className="font-medium text-[#17191C] dark:text-white">
          {dutyRoster.length} Team {dutyRoster.length === 1 ? "Member" : "Members"}
        </span>
      </div>
    </div>
  );
}
