"use client";

import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  eventCount?: number | null;
  isPreview?: boolean;
}

export function MobileDrawer({ isOpen, onClose, eventCount, isPreview }: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative flex w-[280px] max-w-[85vw] flex-1 flex-col bg-[#F4F5F6] shadow-2xl transition-transform animate-in slide-in-from-left duration-300">
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-[#EAECEF] text-[#6B7280] hover:text-[#111827]"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Sidebar className="w-full border-r-0" onNavigate={onClose} eventCount={eventCount} isPreview={isPreview} />
      </div>
    </div>
  );
}
