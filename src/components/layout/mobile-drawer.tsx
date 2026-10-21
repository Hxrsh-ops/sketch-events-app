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
      <div className="relative flex w-72 max-w-xs flex-1 flex-col bg-white dark:bg-[#151719] shadow-2xl transition-transform animate-in slide-in-from-left duration-300">
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="rounded-full hover:bg-[#F0F1F2] dark:hover:bg-[#25292F]"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 text-[#656B73] dark:text-[#A6ADB5]" />
          </Button>
        </div>
        <Sidebar className="w-full border-r-0" onNavigate={onClose} eventCount={eventCount} isPreview={isPreview} />
      </div>
    </div>
  );
}

