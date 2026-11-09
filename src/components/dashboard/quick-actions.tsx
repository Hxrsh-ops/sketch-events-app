"use client";

import Link from "next/link";
import { PlusCircle, Users, QrCode, ScrollText, ArrowUpRight } from "lucide-react";

interface QuickActionItem {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    label: "Create Event",
    description: "Launch new event & registration form",
    href: "/events/new",
    icon: PlusCircle,
  },
  {
    label: "Participants",
    description: "Attendee roster, teams & status",
    href: "/participants",
    icon: Users,
  },
  {
    label: "Check-in",
    description: "Camera QR verification & manual desk",
    href: "/attendance",
    icon: QrCode,
  },
  {
    label: "Audit & Records",
    description: "Immutable compliance & security logs",
    href: "/audit",
    icon: ScrollText,
  },
];

export function QuickActions() {
  return (
    <div className="rounded-xl border border-[#E5E7E9] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-[#858B93]">
          Quick Actions
        </h3>
        <span className="text-[10px] text-[#A4A9AF]">Operations Shortcuts</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex flex-col justify-between rounded-lg border border-[#E5E7E9] bg-[#F6F7F8] p-3 text-left transition-colors hover:bg-[#EAECEF] hover:border-[#D9DCE0] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#858B93]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#777E86] group-hover:text-[#34383D] transition-colors" />
                  <span className="text-xs font-semibold text-[#34383D]">
                    {action.label}
                  </span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#A4A9AF] group-hover:text-[#34383D] transition-colors" />
              </div>
              <p className="mt-1 text-[11px] text-[#858B93] line-clamp-1">
                {action.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
