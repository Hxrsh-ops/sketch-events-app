"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CustomSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: CustomSwitchProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "group flex items-start justify-between gap-4 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3] leading-snug">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-[#656B73] dark:text-[#A6ADB5] leading-normal mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
          "focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 focus-visible:ring-offset-2",
          checked
            ? "bg-emerald-600 dark:bg-emerald-500"
            : "bg-[#D1D5DB] dark:bg-[#2A3038]"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-sm ring-0 transition duration-200 ease-in-out",
            checked
              ? "translate-x-5 bg-white"
              : "translate-x-0 bg-white dark:bg-[#9CA3AF]"
          )}
        />
      </button>
    </div>
  );
}
