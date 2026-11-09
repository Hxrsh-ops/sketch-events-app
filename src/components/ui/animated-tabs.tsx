"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  layoutId?: string;
}

export function AnimatedTabs({
  tabs,
  activeTab,
  onChange,
  className,
  layoutId = "activeTabIndicator",
}: AnimatedTabsProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-[#F4F5F6] p-1 select-none",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        let displayLabel = tab.label;
        let displayCount = tab.count;

        if (displayCount === undefined) {
          const match = tab.label.match(/^(.*?)\s*\(([0-9]+)\)$/);
          if (match) {
            displayLabel = match[1];
            displayCount = parseInt(match[2], 10);
          }
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B]/20",
              isActive
                ? "text-[#111827] font-semibold"
                : "text-[#6B7280] hover:text-[#111827] hover:bg-black/[0.03]"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 450, damping: 35 }
                }
                className="absolute inset-0 z-[-1] rounded-md bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
              />
            )}
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            <span>{displayLabel}</span>
            {displayCount !== undefined && (
              <span
                className={cn(
                  "ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums leading-tight",
                  isActive
                    ? "bg-[#F4F5F6] border border-[#E5E7EB] text-[#111827]"
                    : "bg-[#E5E7EB] text-[#6B7280]"
                )}
              >
                {displayCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
