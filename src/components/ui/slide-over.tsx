"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  widthClass?: string;
}

export function SlideOver({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  widthClass = "max-w-md",
}: SlideOverProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`w-screen ${widthClass} border-l border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-2xl flex flex-col`}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] px-6 py-4">
                <div>
                  <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">{title}</h2>
                  {subtitle && (
                    <p className="mt-0.5 text-xs text-[#656B73] dark:text-[#A6ADB5]">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EA] dark:border-[#30353A] text-[#656B73] dark:text-[#A6ADB5] transition-colors hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 text-[#17191C] dark:text-[#F1F2F3]">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
