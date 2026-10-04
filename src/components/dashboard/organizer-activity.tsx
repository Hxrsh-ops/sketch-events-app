import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeamMemberActivity {
  name: string;
  avatarUrl: string;
  role: string;
  status: "Completed" | "In Progress" | "Pending";
}

const ORGANIZER_ACTIVITIES: TeamMemberActivity[] = [
  {
    name: "Alexandra Deff",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    role: "Configured Round 2 Evaluation Form",
    status: "Completed",
  },
  {
    name: "Edwin Adenike",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    role: "Verified Mobile QR Scanner Cameras",
    status: "In Progress",
  },
  {
    name: "Isaac Oluwatemilorun",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    role: "Drafted Pass Dispatch & Venue Floorplan",
    status: "Pending",
  },
  {
    name: "David Oshodi",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
    role: "Audit Log & Attendance Roster Review",
    status: "In Progress",
  },
];

const STATUS_STYLES: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200/50",
  Pending: "bg-rose-50 text-rose-700 border-rose-200/50",
};

export function OrganizerActivity() {
  return (
    <div className="flex flex-col justify-between rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-base font-bold text-[#191A1C]">
          Team Collaboration
        </h3>
        <button
          type="button"
          onClick={() => alert("Admin team management will connect to Supabase Auth roles.")}
          className="inline-flex items-center gap-1 rounded-full border border-[#E8E6E1] bg-white px-2.5 py-1 text-xs font-semibold text-[#191A1C] transition-colors hover:bg-[#F9F8F6]"
        >
          <Plus className="h-3 w-3" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Member List */}
      <div className="mt-2 divide-y divide-[#F5F4F1]">
        {ORGANIZER_ACTIVITIES.map((member, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between py-3 hover:bg-[#FAF9F7] px-2 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-[#E8E6E1]">
                <AvatarImage src={member.avatarUrl} alt={member.name} />
                <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#191A1C]">
                  {member.name}
                </span>
                <span className="text-[11px] text-[#929398] line-clamp-1">
                  {member.role}
                </span>
              </div>
            </div>

            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                STATUS_STYLES[member.status]
              }`}
            >
              {member.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
