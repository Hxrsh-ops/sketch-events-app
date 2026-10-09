"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutGrid,
  CalendarDays,
  Users,
  UserCheck,
  GitBranch,
  QrCode,
  FileBadge,
  Mail,
  BarChart3,
  Download,
  ShieldCheck,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const MENU_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Participants", href: "/participants", icon: Users },
  { label: "Teams", href: "/teams", icon: UserCheck },
  { label: "Rounds", href: "/rounds", icon: GitBranch },
  { label: "Attendance", href: "/attendance", icon: QrCode },
  { label: "Certificates", href: "/certificates", icon: FileBadge },
  { label: "Communications", href: "/communications", icon: Mail },
];

const INSIGHTS_ITEMS: NavItem[] = [
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Exports", href: "/exports", icon: Download },
  { label: "Audit Log", href: "/audit", icon: ShieldCheck },
];

const GENERAL_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "https://github.com", icon: HelpCircle },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[#F4F5F6] border-r border-[#E5E7EA] py-7 px-5 select-none w-64 shrink-0 justify-between",
        className
      )}
    >
      {/* Top Brand Identity */}
      <div className="flex flex-col space-y-7">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-2 group transition-opacity hover:opacity-90"
        >
          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-black flex items-center justify-center shrink-0 shadow-sm">
            <Image
              src="/sketch-logo.png"
              alt="SKETCH Logo"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-[#17191C] tracking-tight leading-none">
              SKETCH
            </span>
            <span className="text-[10px] font-medium text-[#8A9098] tracking-wide mt-0.5">
              Event Operations
            </span>
          </div>
        </Link>

        {/* Navigation Sections */}
        <div className="flex flex-col space-y-6 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
          {/* Main Menu */}
          <div>
            <div className="px-3 pb-2.5 text-[11px] font-semibold text-[#8A9098]">
              Menu
            </div>
            <nav className="flex flex-col space-y-1">
              {MENU_ITEMS.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all group",
                      active
                        ? "text-[#17191C] font-bold bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                        : "text-[#656B73] hover:text-[#17191C] hover:bg-white/50"
                    )}
                  >
                    {/* Left Accent Bar on Active Item matching Donezo reference */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#17191C]" />
                    )}
                    <div className="flex items-center gap-3 pl-1">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          active
                            ? "text-[#17191C]"
                            : "text-[#8A9098] group-hover:text-[#17191C]"
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#E5E7EA] text-[#656B73]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Insights */}
          <div>
            <div className="px-3 pb-2.5 text-[11px] font-semibold text-[#8A9098]">
              Insights & Records
            </div>
            <nav className="flex flex-col space-y-1">
              {INSIGHTS_ITEMS.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group",
                      active
                        ? "text-[#17191C] font-bold bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                        : "text-[#656B73] hover:text-[#17191C] hover:bg-white/50"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#17191C]" />
                    )}
                    <div className="flex items-center gap-3 pl-1">
                      <Icon
                        className={cn(
                          "w-4 h-4",
                          active
                            ? "text-[#17191C]"
                            : "text-[#8A9098] group-hover:text-[#17191C]"
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* General */}
          <div>
            <div className="px-3 pb-2.5 text-[11px] font-semibold text-[#8A9098]">
              General
            </div>
            <nav className="flex flex-col space-y-1">
              {GENERAL_ITEMS.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group",
                      active
                        ? "text-[#17191C] font-bold bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                        : "text-[#656B73] hover:text-[#17191C] hover:bg-white/50"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#17191C]" />
                    )}
                    <div className="flex items-center gap-3 pl-1">
                      <Icon
                        className={cn(
                          "w-4 h-4",
                          active
                            ? "text-[#17191C]"
                            : "text-[#8A9098] group-hover:text-[#17191C]"
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              <button
                type="button"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#656B73] hover:text-[#17191C] hover:bg-white/50 transition-all w-full text-left pl-4"
                onClick={() => alert("Session logout will be handled through Supabase Auth.")}
              >
                <LogOut className="w-4 h-4 text-[#8A9098]" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </aside>
  );
}
