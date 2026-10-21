"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { AdminUser } from "@/types";

export function AdminLayoutClient({
  children,
  user,
  eventCount,
  isPreview,
}: {
  children: React.ReactNode;
  user: AdminUser | null;
  eventCount?: number | null;
  isPreview?: boolean;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F4F5F6] dark:bg-[#111315] text-[#17191C] dark:text-[#F1F2F3] transition-colors duration-200">
      {/* Persistent Left Sidebar for Desktop */}
      <Sidebar className="hidden lg:flex" eventCount={eventCount} isPreview={isPreview} />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        eventCount={eventCount}
        isPreview={isPreview}
      />


      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
