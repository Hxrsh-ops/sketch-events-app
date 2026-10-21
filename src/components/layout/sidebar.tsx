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
  Ticket,
  BarChart3,
  Download,
  ShieldCheck,
  Settings,
  HelpCircle,
  Plus,
  ArrowUpRight,
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

const OPERATIONS_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Participants", href: "/participants", icon: Users },
  { label: "Teams", href: "/teams", icon: UserCheck },
  { label: "Rounds & Stages", href: "/rounds", icon: GitBranch },
  { label: "Live Attendance", href: "/attendance", icon: QrCode },
];

const COMMUNICATIONS_ITEMS: NavItem[] = [
  { label: "Ticket Studio", href: "/studio", icon: Ticket },
  { label: "Certificates", href: "/certificates", icon: FileBadge },
  { label: "Communications", href: "/communications", icon: Mail },
];

const INTELLIGENCE_ITEMS: NavItem[] = [
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Data Exports", href: "/exports", icon: Download },
  { label: "Audit & Records", href: "/audit", icon: ShieldCheck },
];

const SYSTEM_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Documentation", href: "https://github.com", icon: HelpCircle },
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
        "flex flex-col h-screen sticky top-0 bg-[#F4F5F6] dark:bg-[#151719] border-r border-[#E5E7EA] dark:border-[#30353A] py-6 px-4 select-none w-64 shrink-0 justify-between overflow-y-auto transition-colors duration-200",
        className
      )}
    >
      {/* Top Brand Header */}
      <div className="flex flex-col space-y-6">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-2 group transition-opacity hover:opacity-90"
        >
          <div className="relative h-10 w-10 rounded-2xl overflow-hidden bg-[#F0F1F2] dark:bg-[#22262B] flex items-center justify-center shrink-0 shadow-xs border border-[#E5E7EA] dark:border-[#30353A] p-1.5">
            <Image
              src="/sketch-logo.png"
              alt="SketchHUB Logo"
              width={36}
              height={36}
              className="object-contain h-full w-full dark:invert"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base text-[#17191C] dark:text-[#F1F2F3] tracking-tight leading-tight">
              SketchHUB
            </span>
            <span className="text-[10px] font-semibold text-[#8A9098] dark:text-[#7D858F] tracking-wide uppercase">
              Event Operations Platform
            </span>
          </div>
        </Link>

        {/* Quick Action in Sidebar */}
        <div className="px-1">
          <Link href="/events/new" onClick={onNavigate}>
            <Button
              variant="charcoal"
              size="sm"
              className="w-full h-9 rounded-xl font-medium gap-1.5 shadow-sm text-xs justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Event</span>
            </Button>
          </Link>
        </div>

        {/* Navigation Groups */}
        <div className="flex flex-col space-y-5 pr-1">
          {/* Operations */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#7D858F]">
              Operations
            </div>
            <nav className="flex flex-col space-y-0.5">
              {OPERATIONS_ITEMS.filter((item) => isItemVisible(item.href)).map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] group",
                      active
                        ? "text-[#17191C] dark:text-[#F1F2F3] font-bold bg-white dark:bg-[#1B1E21] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                        : "text-[#656B73] dark:text-[#A6ADB5] hover:text-[#17191C] dark:hover:text-[#F1F2F3] hover:bg-white/60 dark:hover:bg-[#1B1E21]/60"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-[#17191C] dark:bg-[#E8EAED]" />
                    )}
                    <div className="flex items-center gap-2.5 pl-0.5">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          active
                            ? "text-[#17191C] dark:text-[#F1F2F3]"
                            : "text-[#8A9098] dark:text-[#7D858F] group-hover:text-[#17191C] dark:group-hover:text-[#F1F2F3]"
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
                            "text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums",
                            active
                              ? "bg-[#F0F1F2] dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3]"
                              : "bg-[#EAECEF] dark:bg-[#2A2F35] text-[#8A9098] dark:text-[#7D858F]"
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

          {/* Communications */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#7D858F]">
              Delivery & Credentials
            </div>
            <nav className="flex flex-col space-y-0.5">
              {COMMUNICATIONS_ITEMS.filter((item) => isItemVisible(item.href)).map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] group",
                      active
                        ? "text-[#17191C] dark:text-[#F1F2F3] font-bold bg-white dark:bg-[#1B1E21] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                        : "text-[#656B73] dark:text-[#A6ADB5] hover:text-[#17191C] dark:hover:text-[#F1F2F3] hover:bg-white/60 dark:hover:bg-[#1B1E21]/60"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-[#17191C] dark:bg-[#E8EAED]" />
                    )}
                    <Icon
                      className={cn(
                        "w-4 h-4 pl-0.5",
                        active
                          ? "text-[#17191C] dark:text-[#F1F2F3]"
                          : "text-[#8A9098] dark:text-[#7D858F] group-hover:text-[#17191C] dark:group-hover:text-[#F1F2F3]"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Intelligence */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#7D858F]">
              Intelligence & Logs
            </div>
            <nav className="flex flex-col space-y-0.5">
              {INTELLIGENCE_ITEMS.filter((item) => isItemVisible(item.href)).map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] group",
                      active
                        ? "text-[#17191C] dark:text-[#F1F2F3] font-bold bg-white dark:bg-[#1B1E21] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                        : "text-[#656B73] dark:text-[#A6ADB5] hover:text-[#17191C] dark:hover:text-[#F1F2F3] hover:bg-white/60 dark:hover:bg-[#1B1E21]/60"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-[#17191C] dark:bg-[#E8EAED]" />
                    )}
                    <Icon
                      className={cn(
                        "w-4 h-4 pl-0.5",
                        active
                          ? "text-[#17191C] dark:text-[#F1F2F3]"
                          : "text-[#8A9098] dark:text-[#7D858F] group-hover:text-[#17191C] dark:group-hover:text-[#F1F2F3]"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* System */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#7D858F]">
              System
            </div>
            <nav className="flex flex-col space-y-0.5">
              {SYSTEM_ITEMS.filter((item) => isItemVisible(item.href)).map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] group",
                      active
                        ? "text-[#17191C] dark:text-[#F1F2F3] font-bold bg-white dark:bg-[#1B1E21] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                        : "text-[#656B73] dark:text-[#A6ADB5] hover:text-[#17191C] dark:hover:text-[#F1F2F3] hover:bg-white/60 dark:hover:bg-[#1B1E21]/60"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-[#17191C] dark:bg-[#E8EAED]" />
                    )}
                    <Icon
                      className={cn(
                        "w-4 h-4 pl-0.5",
                        active
                          ? "text-[#17191C] dark:text-[#F1F2F3]"
                          : "text-[#8A9098] dark:text-[#7D858F] group-hover:text-[#17191C] dark:group-hover:text-[#F1F2F3]"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Operational Status Pill */}
      <div className="pt-4 border-t border-[#E5E7EA] dark:border-[#30353A]">
        <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#7D858F]">
              Live Desk
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#17191C] dark:text-[#F1F2F3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#17191C] dark:bg-[#E8EAED] animate-pulse" />
              Active
            </span>
          </div>
          <p className="text-[11px] text-[#656B73] dark:text-[#A6ADB5] leading-snug">
            Design Sprint Studio B check-in station ready.
          </p>
          <Link
            href="/attendance"
            onClick={onNavigate}
            className="flex items-center justify-between text-[11px] font-bold text-[#17191C] dark:text-[#F1F2F3] hover:underline pt-1"
          >
            <span>Launch Scanner</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
