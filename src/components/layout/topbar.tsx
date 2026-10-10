"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Bell, Mail, Menu, Command } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MOCK_ADMIN_USER } from "@/lib/mock-data";

interface TopbarProps {
  onOpenMobileMenu?: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

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
        <span className="font-bold text-sm tracking-tight text-[#17191C] dark:text-[#F1F2F3]">SKETCH</span>
      </div>

      {/* Global Search / Command Bar */}
      <div className="hidden sm:flex flex-1 max-w-md items-center">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098] dark:text-[#7D858F]" />
          <input
            type="text"
            placeholder="Search events, participants, passes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] pl-9 pr-12 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] dark:placeholder:text-[#7D858F] transition-all focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED] focus:border-[#25292F] dark:focus:border-[#E8EAED] shadow-sm"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#22262A] px-1.5 py-0.5 text-[10px] font-medium text-[#8A9098] dark:text-[#7D858F]">
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right Global Utilities, Theme & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Communications Outbox */}
        <Link href="/communications">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#656B73] dark:text-[#A6ADB5] shadow-sm transition-colors hover:bg-[#F0F1F2] dark:hover:bg-[#22262A] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
            title="Communications Outbox"
          >
            <Mail className="h-4 w-4" />
          </button>
        </Link>

        {/* Notifications Trigger */}
        <div className="relative">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#656B73] dark:text-[#A6ADB5] shadow-sm transition-colors hover:bg-[#F0F1F2] dark:hover:bg-[#22262A] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
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

        {/* Admin Profile - Initials Avatar */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#E5E7EA] dark:border-[#30353A]">
          <Avatar className="h-9 w-9 border border-[#E5E7EA] dark:border-[#30353A] bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]">
            <AvatarFallback className="bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] text-xs font-semibold">
              {getInitials(MOCK_ADMIN_USER.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] leading-none">
                {MOCK_ADMIN_USER.name}
              </span>
              <span className="text-[9px] font-semibold text-[#656B73] dark:text-[#A6ADB5] bg-[#EAECEF] dark:bg-[#2A2F35] px-1.5 py-0.5 rounded-full uppercase">
                Admin
              </span>
            </div>
            <span className="text-[10px] text-[#8A9098] dark:text-[#7D858F] leading-tight mt-0.5">
              {MOCK_ADMIN_USER.email}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
