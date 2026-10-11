"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TabItem {
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
        "flex items-center gap-1 rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#1B1E21] p-1 shadow-inner-sm select-none",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#1B1E21]",
              isActive
                ? "text-white dark:text-[#111315]"
                : "text-[#656B73] dark:text-[#A6ADB5] hover:text-[#17191C] dark:hover:text-[#F1F2F3] hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                className="absolute inset-0 z-[-1] rounded-full bg-[#25292F] dark:bg-[#E8EAED] shadow-sm"
              />
            )}
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  isActive
                    ? "bg-white/20 dark:bg-black/20 text-white dark:text-[#111315]"
                    : "bg-[#EAECEF] dark:bg-[#2A2F35] text-[#656B73] dark:text-[#A6ADB5]"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
