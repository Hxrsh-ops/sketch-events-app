import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Collaborator {
  name: string;
  avatarUrl: string;
  email: string;
}

const COLLABORATORS: Collaborator[] = [
  {
    name: "Harshanth",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    email: "harshanth@sketch.org",
  },
  {
    name: "Dia Sen",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    email: "dia.sen@college.edu",
  },
  {
    name: "Rohan Varma",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    email: "rohan.varma@college.edu",
  },
  {
    name: "Aarav Sharma",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    email: "aarav.sharma@college.edu",
  },
];

export function OrganizerActivity() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[#17191C]">
          Top Collaborators
        </h3>
      </div>

      {/* Member List */}
      <div className="mt-4 flex flex-col divide-y divide-[#F4F5F6]">
        {COLLABORATORS.map((member, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 py-2.5"
          >
            <Avatar className="h-8 w-8 border border-[#E5E7EA]">
              <AvatarImage src={member.avatarUrl} alt={member.name} />
              <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#17191C]">
                {member.name}
              </span>
              <span className="text-[11px] text-[#8A9098]">
                {member.email}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
