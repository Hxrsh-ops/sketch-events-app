"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomCheckbox({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: CustomCheckboxProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        "group relative flex items-start gap-3 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <div
        role="checkbox"
        tabIndex={disabled ? -1 : 0}
        aria-checked={checked}
        aria-disabled={disabled}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onChange(!checked);
        }}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] focus-visible:ring-offset-1",
          checked
            ? "border-[#25292F] dark:border-[#E8EAED] bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
            : "border-[#D2D6DC] dark:border-[#40464E] bg-white dark:bg-[#1B1E21] hover:border-[#25292F] dark:hover:border-[#E8EAED]"
        )}
      >
        {checked && (
          <Check className="h-3.5 w-3.5 stroke-[3] text-white dark:text-[#111315]" />
        )}
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] group-hover:text-[#000000] dark:group-hover:text-[#FFFFFF] transition-colors leading-snug">
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
    </label>
  );
}
