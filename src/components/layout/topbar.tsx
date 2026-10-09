"use client";

import { useState } from "react";
import { Search, Bell, Mail, Menu, Command } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MOCK_ADMIN_USER } from "@/lib/mock-data";

interface TopbarProps {
  onOpenMobileMenu?: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between bg-[#F4F5F6] px-6 md:px-8 border-b border-[#E5E7EA]/60">
      {/* Mobile Drawer Trigger */}
      <div className="flex items-center gap-3 lg:hidden">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onOpenMobileMenu}
          className="rounded-full border-[#E5E7EA] bg-white"
          aria-label="Open mobile menu"
        >
          <Menu className="h-4 w-4 text-[#17191C]" />
        </Button>
        <span className="font-bold text-base text-[#17191C]">SKETCH</span>
      </div>

      {/* Global Search Bar (Donezo styled: clean white rounded-full pill) */}
      <div className="hidden sm:flex flex-1 max-w-sm items-center">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098]" />
          <input
            type="text"
            placeholder="Search Task"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-full border border-[#E5E7EA] bg-white pl-10 pr-4 text-xs text-[#17191C] placeholder:text-[#8A9098] transition-all focus:outline-none focus:ring-2 focus:ring-[#25292F]/10 focus:border-[#25292F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          />
        </div>
      </div>

      {/* Right Utility Actions & Admin Profile */}
      <div className="flex items-center gap-3">
        {/* Email/Communications Action */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EA] bg-white text-[#656B73] shadow-sm transition-all hover:bg-[#F0F1F2] hover:text-[#17191C]"
          title="Communications"
          onClick={() => alert("Communications Outbox: 3 messages queued/sent.")}
        >
          <Mail className="h-4 w-4" />
        </button>

        {/* Notifications Trigger */}
        <div className="relative">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EA] bg-white text-[#656B73] shadow-sm transition-all hover:bg-[#F0F1F2] hover:text-[#17191C]"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-4 w-4" />
          </button>

          {/* Quick Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#E5E7EA] bg-white p-4 shadow-elevated z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EA]">
                <span className="text-xs font-bold text-[#17191C]">Operational Alerts</span>
                <span className="text-[10px] text-[#17191C] bg-[#F0F1F2] px-2 py-0.5 rounded-full font-semibold">2 New</span>
              </div>
              <div className="py-2 space-y-2">
                <div className="p-2.5 rounded-xl bg-[#F0F1F2] hover:bg-[#EAECEF] transition-colors cursor-pointer">
                  <div className="text-xs font-semibold text-[#17191C]">Registration Reached 93%</div>
                  <div className="text-[11px] text-[#65666A]">Sketch Design Sprint 2026 is almost at full capacity.</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0F1F2] hover:bg-[#EAECEF] transition-colors cursor-pointer">
                  <div className="text-xs font-semibold text-[#17191C]">Certificates Ready</div>
                  <div className="text-[11px] text-[#65666A]">72 certificates ready for Visual Storytelling Masterclass.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Widget (Donezo Style: Avatar + Name + Email) */}
        <div className="flex items-center gap-3 pl-2">
          <Avatar className="h-10 w-10 border border-[#E5E7EA] shadow-sm">
            <AvatarImage src={MOCK_ADMIN_USER.avatarUrl} alt={MOCK_ADMIN_USER.name} />
            <AvatarFallback>HA</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-[#17191C] leading-none">
              {MOCK_ADMIN_USER.name}
            </span>
            <span className="text-[11px] text-[#8A9098] leading-tight mt-1">
              {MOCK_ADMIN_USER.email}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
