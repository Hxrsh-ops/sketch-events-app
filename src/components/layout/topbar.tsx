"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, Mail, Menu, Command, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";
import { GlobalSearchDialog } from "@/components/layout/global-search-dialog";
import { AdminUser } from "@/types";

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
    <header className="sticky top-0 z-30 flex h-16 md:h-20 w-full items-center justify-between bg-[#F4F5F6] dark:bg-[#151719] px-6 md:px-8 border-b border-[#E5E7EA] dark:border-[#30353A] transition-colors duration-200">
      {/* Mobile Drawer Trigger */}
      <div className="flex items-center gap-3 lg:hidden">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onOpenMobileMenu}
          className="rounded-full border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21]"
          aria-label="Open mobile menu"
        >
          <Menu className="h-4 w-4 text-[#17191C] dark:text-[#F1F2F3]" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-[#F0F1F2] dark:bg-[#22262B] p-0.5 border border-[#E5E7EA] dark:border-[#30353A] flex items-center justify-center">
            <img src="/sketch-logo.png" alt="Sketch" className="h-4 w-4 object-contain dark:invert" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#17191C] dark:text-[#F1F2F3]">SketchHUB</span>
        </div>
      </div>

      {/* Global Search / Command Bar */}
      <div className="hidden sm:flex flex-1 max-w-md items-center">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="relative w-full text-left focus:outline-none"
          aria-label="Open universal search dialog"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098] dark:text-[#7D858F]" />
          <div className="flex items-center h-9 w-full rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] pl-9 pr-12 text-xs text-[#8A9098] dark:text-[#7D858F] transition-all duration-150 ease-out hover:border-[#CBD0D6] dark:hover:border-[#4A515A] shadow-sm select-none">
            Search events, participants, passes...
          </div>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#22262A] px-1.5 py-0.5 text-[10px] font-medium text-[#8A9098] dark:text-[#7D858F] select-none">
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right Global Utilities, Theme & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="sm:hidden flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#656B73] dark:text-[#A6ADB5] shadow-sm transition-colors hover:bg-[#F0F1F2] dark:hover:bg-[#25292F] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
          title="Search"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Communications Outbox */}
        <Link href="/communications">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#656B73] dark:text-[#A6ADB5] shadow-sm transition-colors duration-150 ease-out hover:bg-[#F0F1F2] dark:hover:bg-[#25292F] hover:text-[#17191C] dark:hover:text-[#F1F2F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED]"
            title="Communications Outbox"
          >
            <Mail className="h-4 w-4" />
          </button>
        </Link>

        {/* Notifications Trigger */}
        <div className="relative">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#656B73] dark:text-[#A6ADB5] shadow-sm transition-colors duration-150 ease-out hover:bg-[#F0F1F2] dark:hover:bg-[#25292F] hover:text-[#17191C] dark:hover:text-[#F1F2F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED]"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-4 w-4" />
          </button>

          {/* Quick Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-elevated z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EA] dark:border-[#30353A]">
                <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">Operational Alerts</span>
                <span className="text-[10px] text-[#25292F] dark:text-[#F1F2F3] bg-[#F0F1F2] dark:bg-[#25292F] px-2 py-0.5 rounded-full font-semibold">2 Active</span>
              </div>
              <div className="py-2 space-y-2">
                <Link
                  href="/events"
                  onClick={() => setShowNotifications(false)}
                  className="block p-2.5 rounded-xl bg-[#F4F5F6] dark:bg-[#22262A] hover:bg-[#EAECEF] dark:hover:bg-[#2A2F35] transition-colors"
                >
                  <div className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">Capacity Alert (93%)</div>
                  <div className="text-[11px] text-[#656B73] dark:text-[#A6ADB5] mt-0.5">Sketch Design Sprint 2026 has 18 seats remaining.</div>
                </Link>
                <Link
                  href="/certificates"
                  onClick={() => setShowNotifications(false)}
                  className="block p-2.5 rounded-xl bg-[#F4F5F6] dark:bg-[#22262A] hover:bg-[#EAECEF] dark:hover:bg-[#2A2F35] transition-colors"
                >
                  <div className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">Certificates Ready</div>
                  <div className="text-[11px] text-[#656B73] dark:text-[#A6ADB5] mt-0.5">Visual Storytelling Masterclass attendance finalized.</div>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile - Session Aware Avatar & Sign Out */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#E5E7EA] dark:border-[#30353A]">
          <Avatar className="h-9 w-9 border border-[#E5E7EA] dark:border-[#30353A] bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]">
            <AvatarFallback className="bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] text-xs font-semibold">
              {getInitials(currentUser.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] leading-none">
                {currentUser.name}
              </span>
              <span className="text-[9px] font-semibold text-[#656B73] dark:text-[#A6ADB5] bg-[#EAECEF] dark:bg-[#2A2F35] px-1.5 py-0.5 rounded-full uppercase">
                {currentUser.role.replace("_", " ")}
              </span>
            </div>
            <span className="text-[10px] text-[#8A9098] dark:text-[#7D858F] leading-tight mt-0.5">
              {currentUser.email}
            </span>
          </div>

          {/* Quick Sign Out Action */}
          <button
            type="button"
            onClick={() => signOut()}
            title="Sign out of SketchHUB"
            className="ml-1 p-1.5 rounded-full text-[#8A9098] hover:text-[#B91C1C] dark:text-[#7D858F] dark:hover:text-[#F87171] hover:bg-[#F0F1F2] dark:hover:bg-[#25292F] transition-colors"
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
