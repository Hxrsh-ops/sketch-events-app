"use client";

import { useState, useEffect } from "react";
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
  Sliders,
  BarChart3,
  Download,
  ShieldCheck,
  Settings,
  Plus,
  ArrowUpRight,
  Database,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { getRequiredPermissionForPath } from "@/lib/auth/permissions";
import { getAppEnv } from "@/lib/env";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

// Core Primary Modules as requested in Section 3
const CORE_MODULES: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutGrid },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Form Generator", href: "/studio", icon: Sliders },
  { label: "Participants", href: "/participants", icon: Users },
  { label: "Teams", href: "/teams", icon: UserCheck },
  { label: "Rounds & Stages", href: "/rounds", icon: GitBranch },
  { label: "Attendance", href: "/attendance", icon: QrCode },
  { label: "Certificates", href: "/certificates", icon: FileBadge },
  { label: "Communications", href: "/communications", icon: Mail },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Exports", href: "/exports", icon: Download },
  { label: "Audit & Records", href: "/audit", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  eventCount?: number | null;
  isPreview?: boolean;
}

export function Sidebar({
  className,
  onNavigate,
  eventCount: initialEventCount,
  isPreview: propIsPreview,
}: SidebarProps) {
  const pathname = usePathname();
  const { can } = useAuth();
  const isPreview = propIsPreview !== undefined ? propIsPreview : (getAppEnv().mode === "preview");

  const [dynamicCount, setDynamicCount] = useState<number | null>(
    initialEventCount !== undefined ? initialEventCount : null
  );

  useEffect(() => {
    if (initialEventCount !== undefined) {
      setDynamicCount(initialEventCount);
    }
  }, [initialEventCount]);

  useEffect(() => {
    let isMounted = true;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/events/count");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.count === "number") {
            setDynamicCount(data.count);
          }
        }
      } catch {
        // Silently preserve current state without throwing in UI
      }
    };

    if (initialEventCount === undefined) {
      fetchCount();
    }

    const handleUpdate = () => {
      fetchCount();
    };

    window.addEventListener("sketch:events-changed", handleUpdate);
    window.addEventListener("sketch_store_updated", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("sketch:events-changed", handleUpdate);
      window.removeEventListener("sketch_store_updated", handleUpdate);
    };
  }, [initialEventCount]);

  const getBadgeForItem = (href: string): string | undefined => {
    if (href === "/events") {
      if (dynamicCount !== null && dynamicCount !== undefined) {
        return String(dynamicCount);
      }
      if (isPreview) {
        return "2";
      }
      return undefined;
    }
    return undefined;
  };

  const isItemVisible = (href: string) => {
    const requiredPermission = getRequiredPermissionForPath(href);
    if (!requiredPermission) return true;
    return can(requiredPermission);
  };

  const isItemActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 bg-[#F4F5F6] border-r border-[#E5E7EB] py-5 px-3.5 select-none w-[272px] shrink-0 justify-between overflow-y-auto transition-colors duration-150",
        className
      )}
    >
      <div className="flex flex-col space-y-4">
        {/* Top Header Section */}
        <div className="px-1 pt-0.5">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-3 group transition-opacity hover:opacity-90"
          >
            <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 border border-[#E5E7EB] p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <Image
                src="/sketch-logo.png"
                alt="SketchHUB Logo"
                width={24}
                height={24}
                className="object-contain h-full w-full"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[15px] text-[#111827] tracking-tight leading-none">
                SketchHUB
              </span>
              <span className="text-[10px] font-semibold text-[#6B7280] tracking-[0.08em] uppercase mt-1">
                Event Operations
              </span>
            </div>
          </Link>
        </div>

        {/* Active Event Selector with Browse Option */}
        <div className="px-0.5">
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E7EB] bg-white text-xs shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#D1D5DB] transition-colors">
            <div className="flex items-center gap-2 overflow-hidden pr-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate text-[12px] font-medium text-[#111827]" title="Design Sprint 2026">
                Design Sprint 2026
              </span>
            </div>
            <Link
              href="/events"
              onClick={onNavigate}
              className="text-[11px] font-medium text-[#6B7280] hover:text-[#111827] shrink-0 transition-colors"
            >
              Browse
            </Link>
          </div>
        </div>

        {/* Quick Action: Create Event */}
        <div className="px-0.5">
          <Link href="/events/new" onClick={onNavigate} className="block">
            <Button
              variant="default"
              className="w-full h-11 rounded-lg font-semibold gap-2 text-[13px] justify-center bg-[#18181B] text-white hover:bg-[#27272A] active:bg-[#09090B] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.12)] active:scale-[0.99] transition-all duration-150 px-4"
            >
              <Plus className="h-4 w-4 stroke-[2.25] text-white/90 shrink-0" />
              <span>Create Event</span>
            </Button>
          </Link>
        </div>

        {/* Navigation Core Modules */}
        <div className="flex flex-col space-y-1.5 pt-2">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
            Platform Modules
          </div>
          <nav className="flex flex-col space-y-1">
            {CORE_MODULES.filter((item) => isItemVisible(item.href)).map((item) => {
              const active = isItemActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B]/20",
                    active
                      ? "bg-white border border-[#E5E7EB] text-[#111827] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      : "text-[#6B7280] hover:text-[#111827] hover:bg-[#EAECEF]/80 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors stroke-[1.8]",
                        active ? "text-[#111827]" : "text-[#9CA3AF] group-hover:text-[#111827]"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {(() => {
                    const badge = item.badge ?? getBadgeForItem(item.href);
                    if (badge === undefined || badge === null) return null;
                    return (
                      <span
                        data-testid={`sidebar-badge-${item.label.toLowerCase()}`}
                        title={isPreview ? "Preview event count" : "Authoritative event count"}
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-md font-medium tabular-nums border",
                          active
                            ? "bg-[#F3F4F6] border-[#E5E7EB] text-[#111827]"
                            : "bg-[#EAECEF] border-[#E5E7EB] text-[#6B7280]"
                        )}
                      >
                        {badge}
                      </span>
                    );
                  })()}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Backend Connection Status */}
      <div className="pt-4 border-t border-[#E5E7EB]">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Backend Status
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#111827]">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isPreview ? "bg-[#9CA3AF]" : "bg-emerald-500 animate-pulse"
                )}
              />
              {isPreview ? "Offline Preview" : "Connected"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-0.5">
            <span className="flex items-center gap-1.5 truncate pr-2">
              <Database className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
              <span className="truncate">{isPreview ? "Mock In-Memory" : "Supabase PostgreSQL"}</span>
            </span>
            <Link
              href="/attendance"
              onClick={onNavigate}
              className="text-[#111827] hover:text-black hover:underline flex items-center gap-0.5 font-medium shrink-0"
              title="Launch QR Attendance Desk"
            >
              <span>Desk</span>
              <ArrowUpRight className="h-3 w-3 text-[#9CA3AF]" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
