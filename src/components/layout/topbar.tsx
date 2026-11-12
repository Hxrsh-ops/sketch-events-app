"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, Mail, Menu, Command, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { GlobalSearchDialog } from "@/components/layout/global-search-dialog";
import { AdminUser } from "@/types";
import { isPreviewMode } from "@/lib/env";
import { cn } from "@/lib/utils";

const DEFAULT_ADMIN_FALLBACK: AdminUser = {
  id: "admin",
  name: "Administrator",
  email: "admin@sketchhub.internal",
  role: "event_manager",
};

interface TopbarProps {
  onOpenMobileMenu?: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const { user, signOut } = useAuth();
  const currentUser = user || DEFAULT_ADMIN_FALLBACK;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    setIsPreview(isPreviewMode());
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-white px-5 sm:px-6 md:px-8 border-b border-[#E5E7EB] transition-colors duration-150">
      {/* Mobile Drawer Trigger & Brand */}
      <div className="flex items-center gap-3 lg:hidden">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onOpenMobileMenu}
          className="rounded-lg border-[#E5E7EB] bg-white h-9 w-9 text-[#111827] hover:bg-[#F9FAFB]"
          aria-label="Open mobile menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-[#F9FAFB] p-1 border border-[#E5E7EB] flex items-center justify-center">
            <img src="/sketch-logo.png" alt="Sketch" className="h-4.5 w-4.5 object-contain" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-[#111827]">SketchHUB</span>
        </div>
      </div>

      {/* Global Search / Command Bar */}
      <div className="hidden sm:flex flex-1 max-w-[500px] lg:max-w-[540px] items-center mr-4">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="relative w-full text-left focus:outline-none group"
          aria-label="Open universal search dialog"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] group-hover:text-[#111827] dark:group-hover:text-[#F1F3F5] transition-colors" />
          <div className="flex items-center h-[42px] w-full rounded-lg border border-[#E5E7EB] dark:border-[#2A3039] bg-[#F9FAFB] dark:bg-[#1B1F25] pl-10 pr-16 text-[13px] text-[#6B7280] dark:text-[#9CA3AF] group-hover:bg-white dark:group-hover:bg-[#20252C] group-hover:border-[#D1D5DB] dark:group-hover:border-[#373E49] group-hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all select-none">
            Search events, participants, records...
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded border border-[#E5E7EB] dark:border-[#2E343E] bg-white dark:bg-[#252A32] px-2 py-0.5 text-[11px] font-mono font-medium text-[#9CA3AF] shadow-xs select-none pointer-events-none">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right Utilities: Backend Connection Status, Quick Settings, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="sm:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] shadow-xs hover:bg-[#F9FAFB] hover:text-[#111827]"
          title="Search"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Quick Settings */}
        <Link href="/settings">
          <button
            type="button"
            className="flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#F9FAFB] hover:text-[#111827] hover:border-[#D1D5DB] transition-all"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </Link>

        {/* Communications Outbox */}
        <Link href="/communications">
          <button
            type="button"
            className="flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#F9FAFB] hover:text-[#111827] hover:border-[#D1D5DB] transition-all"
            title="Communications Outbox"
            aria-label="Communications Outbox"
          >
            <Mail className="h-4 w-4" />
          </button>
        </Link>

        {/* Notifications Trigger */}
        <div className="relative">
          <button
            type="button"
            className="flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#F9FAFB] hover:text-[#111827] hover:border-[#D1D5DB] transition-all"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          {/* Clean Monochromatic Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-84 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xl z-50">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <span className="text-xs font-bold text-[#111827]">Operational Alerts</span>
                <span className="text-[10px] text-[#111827] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-full font-semibold">
                  2 Active
                </span>
              </div>
              <div className="py-2.5 space-y-2">
                <Link
                  href="/events"
                  onClick={() => setShowNotifications(false)}
                  className="block p-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-[#F3F4F6] hover:border-[#D1D5DB] transition-all"
                >
                  <div className="text-xs font-semibold text-[#111827]">Capacity Notice (93%)</div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">Sketch Design Sprint 2026 has 18 seats remaining.</div>
                </Link>
                <Link
                  href="/certificates"
                  onClick={() => setShowNotifications(false)}
                  className="block p-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-[#F3F4F6] hover:border-[#D1D5DB] transition-all"
                >
                  <div className="text-xs font-semibold text-[#111827]">Certificates Prepared</div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">Visual Storytelling Masterclass attendance finalized.</div>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Account Connection Status */}
        <div className="flex items-center gap-3 pl-3 sm:pl-3.5 border-l border-[#E5E7EB]">
          <Avatar className="h-9 w-9 rounded-lg border border-[#E5E7EB] bg-[#18181B] text-white shadow-xs">
            <AvatarFallback className="bg-[#18181B] text-white text-xs font-semibold">
              {getInitials(currentUser.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col text-left">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#111827] leading-none">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-semibold text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5 rounded uppercase tracking-wider">
                {currentUser.role.replace("_", " ")}
              </span>
            </div>
            <span className="text-[11px] text-[#9CA3AF] leading-tight mt-1">
              {currentUser.email}
            </span>
          </div>

          {/* Quick Sign Out Action */}
          <button
            type="button"
            onClick={() => signOut()}
            title="Sign out of SketchHUB"
            className="ml-1 p-2 rounded-lg text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Global Universal Search Dialog */}
      <GlobalSearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
