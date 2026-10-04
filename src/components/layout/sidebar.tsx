"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  LifeBuoy,
  LogOut,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const MENU_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutGrid },
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
  { label: "Help & Docs", href: "https://github.com", icon: LifeBuoy },
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
        "flex flex-col h-full bg-white border-r border-[#EAE8E3] py-6 px-4 select-none w-64 shrink-0 justify-between",
        className
      )}
    >
      {/* Top Brand Identity */}
      <div className="flex flex-col space-y-6">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-2 group transition-opacity hover:opacity-90"
        >
          <div className="h-10 w-10 rounded-2xl bg-[#8F2635] flex items-center justify-center text-white shadow-md shadow-[#8F2635]/20 group-hover:scale-105 transition-transform">
            <span className="font-extrabold text-lg tracking-wider">S</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-[#191A1C] tracking-tight leading-tight">
              SKETCH
            </span>
            <span className="text-[11px] font-medium text-[#65666A] tracking-wide">
              Event Operations
            </span>
          </div>
        </Link>

        {/* Navigation Sections */}
        <div className="flex flex-col space-y-5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
          {/* Main Menu */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#929398]">
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
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group",
                      active
                        ? "bg-[#1B4332] text-white shadow-sm font-semibold"
                        : "text-[#65666A] hover:bg-[#F5F4F1] hover:text-[#191A1C]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          active
                            ? "text-white"
                            : "text-[#929398] group-hover:text-[#191A1C]"
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                          active
                            ? "bg-white/20 text-white"
                            : "bg-[#EFEEEA] text-[#65666A]"
                        )}
                      >
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
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#929398]">
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group",
                      active
                        ? "bg-[#1B4332] text-white shadow-sm font-semibold"
                        : "text-[#65666A] hover:bg-[#F5F4F1] hover:text-[#191A1C]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        active
                          ? "text-white"
                          : "text-[#929398] group-hover:text-[#191A1C]"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* General */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#929398]">
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group",
                      active
                        ? "bg-[#1B4332] text-white shadow-sm font-semibold"
                        : "text-[#65666A] hover:bg-[#F5F4F1] hover:text-[#191A1C]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        active
                          ? "text-white"
                          : "text-[#929398] group-hover:text-[#191A1C]"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#B83A43] hover:bg-[#FCEBED] transition-all w-full text-left"
                onClick={() => alert("Session logout will be configured with Supabase Auth.")}
              >
                <LogOut className="w-4 h-4 text-[#B83A43]" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Donezo-style Bottom Operational Scanner Promo Card */}
      <div className="pt-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#122A1F] to-[#1B4332] p-4 text-white shadow-lg">
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/5 blur-lg" />
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center">
              <QrCode className="h-3.5 w-3.5 text-emerald-300" />
            </div>
            <span className="text-xs font-semibold text-emerald-100">Live Scanner</span>
          </div>
          <p className="text-[11px] text-emerald-200/80 leading-relaxed mb-3">
            Fast camera QR verification on any phone browser.
          </p>
          <Link
            href="/attendance"
            onClick={onNavigate}
            className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/20 py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <span>Launch Scanner</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
