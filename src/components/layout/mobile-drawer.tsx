"use client";

import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative flex w-72 max-w-xs flex-1 flex-col bg-white shadow-2xl transition-transform animate-in slide-in-from-left duration-300">
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="rounded-full hover:bg-[#F5F4F1]"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 text-[#65666A]" />
          </Button>
        </div>
        <Sidebar className="w-full border-r-0" onNavigate={onClose} />
      </div>
    </div>
  );
}
