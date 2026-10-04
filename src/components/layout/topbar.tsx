"use client";

import { useState } from "react";
import {
  Search,
  Bell,
  Mail,
  Menu,
  Sparkles,
  Command,
  ChevronDown,
} from "lucide-react";
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
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-[#EAE8E3] bg-[#F5F4F1]/80 backdrop-blur-md px-6 md:px-8">
      {/* Mobile Drawer Trigger & Title */}
      <div className="flex items-center gap-3 lg:hidden">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onOpenMobileMenu}
          className="rounded-xl border-[#E8E6E1]"
          aria-label="Open mobile menu"
        >
          <Menu className="h-4 w-4 text-[#191A1C]" />
        </Button>
        <span className="font-bold text-base text-[#191A1C]">SKETCH</span>
      </div>

      {/* Global Search Bar (Donezo styled: large, light pill, shortcut indicator) */}
      <div className="hidden sm:flex flex-1 max-w-md items-center">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#929398]" />
          <input
            type="text"
            placeholder="Search events, participants, tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-2xl border border-[#EAE8E3] bg-white pl-10 pr-16 text-xs text-[#191A1C] placeholder:text-[#929398] transition-all focus:outline-none focus:ring-2 focus:ring-[#8F2635]/20 focus:border-[#8F2635] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-lg border border-[#E8E6E1] bg-[#F9F8F6] px-1.5 py-0.5 text-[10px] font-medium text-[#929398]">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right Utility Actions & Admin Profile */}
      <div className="flex items-center gap-3">
        {/* Email/Communications Quick Action */}
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[#EAE8E3] bg-white text-[#65666A] shadow-sm transition-all hover:bg-[#F9F8F6] hover:text-[#191A1C]"
          title="Communications Outbox"
          onClick={() => alert("Communications Outbox: 3 messages queued/sent today.")}
        >
          <Mail className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#8F2635]" />
        </button>

        {/* Notifications Trigger */}
        <div className="relative">
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[#EAE8E3] bg-white text-[#65666A] shadow-sm transition-all hover:bg-[#F9F8F6] hover:text-[#191A1C]"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500" />
          </button>

          {/* Quick Notification Dropdown Preview */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#EAE8E3] bg-white p-4 shadow-elevated z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE8E3]">
                <span className="text-xs font-bold text-[#191A1C]">Operational Alerts</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">2 New</span>
              </div>
              <div className="py-2 space-y-2">
                <div className="p-2 rounded-xl bg-[#F9F8F6] hover:bg-[#F2EFEA] transition-colors cursor-pointer">
                  <div className="text-xs font-semibold text-[#191A1C]">Registration Reached 93%</div>
                  <div className="text-[11px] text-[#65666A]">Sketch Design Sprint 2026 is almost at full capacity.</div>
                </div>
                <div className="p-2 rounded-xl bg-[#F9F8F6] hover:bg-[#F2EFEA] transition-colors cursor-pointer">
                  <div className="text-xs font-semibold text-[#191A1C]">Certificates Ready</div>
                  <div className="text-[11px] text-[#65666A]">72 certificates ready for Visual Storytelling Masterclass.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Widget (Donezo Style: Avatar + Name + Subtitle) */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-[#EAE8E3]">
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
            <AvatarImage src={MOCK_ADMIN_USER.avatarUrl} alt={MOCK_ADMIN_USER.name} />
            <AvatarFallback>HA</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#191A1C] leading-none">
                {MOCK_ADMIN_USER.name}
              </span>
              <span className="text-[9px] bg-[#F7E9EB] text-[#8F2635] px-1.5 py-0.2 rounded font-semibold uppercase">
                Admin
              </span>
            </div>
            <span className="text-[11px] text-[#929398] leading-tight mt-0.5">
              {MOCK_ADMIN_USER.email}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
