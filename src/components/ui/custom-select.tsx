"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "retro";
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  error,
  className,
  disabled = false,
  variant = "default",
}: CustomSelectProps) {
  const isRetro = variant === "retro";
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value);
  const shouldReduceMotion = useReducedMotion();

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex = (currentIndex + 1) % options.length;
        onChange(options[nextIndex].value);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const prevIndex = (currentIndex - 1 + options.length) % options.length;
        onChange(options[prevIndex].value);
      }
    }
  };

  return (
    <div className={cn("relative flex flex-col gap-1.5 w-full", className)} ref={containerRef}>
      {label && (
        <label
          className={
            isRetro
              ? "text-xs font-quicksand font-black uppercase tracking-wider text-[#121212] select-none"
              : "text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] select-none"
          }
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          isRetro
            ? "retro-select-trigger flex h-12 w-full items-center justify-between rounded-xl border-2 border-[#121212] bg-[#FFFDF7] px-4 py-2.5 text-sm font-quicksand font-bold text-[#121212] shadow-brutal-flat transition-all outline-none hover:bg-[#F8F4EA] focus:ring-2 focus:ring-retro-pink focus:border-[#121212]"
            : "flex h-10 w-full items-center justify-between rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] px-4 py-2 text-xs text-[#17191C] dark:text-[#F1F2F3] shadow-xs transition-all outline-none hover:border-[#D2D6DC] dark:hover:border-[#40464E] focus:border-[#25292F] dark:focus:border-[#E8EAED] focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]",
          disabled && "cursor-not-allowed opacity-50 bg-[#F4F5F6] dark:bg-[#151719]",
          error && "border-red-600 focus:border-red-600 focus:ring-red-600"
        )}
      >
        <span
          className={cn(
            "truncate font-medium",
            isRetro && "font-quicksand font-bold text-sm",
            !selectedOption &&
              (isRetro ? "text-[#121212]/50 font-semibold" : "text-[#8A9098] dark:text-[#7D858F]")
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            isRetro
              ? "h-4 w-4 text-[#121212] stroke-[2.5] transition-transform duration-200 shrink-0"
              : "h-4 w-4 text-[#8A9098] dark:text-[#7D858F] transition-transform duration-200 shrink-0",
            isOpen && (isRetro ? "rotate-180 text-[#121212]" : "rotate-180 text-[#17191C] dark:text-[#F1F2F3]")
          )}
        />
      </button>

      {/* Popup Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 4, scale: shouldReduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 4, scale: shouldReduceMotion ? 1 : 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.15, ease: "easeOut" }}
            role="listbox"
            className={cn(
              "absolute left-0 top-[calc(100%+6px)] z-50 w-full overflow-hidden p-1.5",
              isRetro
                ? "retro-dropdown rounded-2xl border-2 border-[#121212] bg-[#FFFDF7] shadow-brutal-card"
                : "rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#22262A] shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            )}
          >
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs transition-colors outline-none",
                      isRetro
                        ? isSelected
                          ? "retro-option bg-retro-yellow text-[#121212] font-black border border-[#121212] shadow-brutal-flat"
                          : "retro-option text-[#121212] font-quicksand font-bold hover:bg-[#F3ECD2]"
                        : isSelected
                        ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] font-semibold"
                        : "text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#2A2F35]"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className={isRetro ? "font-quicksand font-bold text-xs" : ""}>{option.label}</span>
                      {option.description && (
                        <span
                          className={cn(
                            "text-[10px]",
                            isRetro
                              ? "text-[#121212]/70 font-semibold"
                              : isSelected
                              ? "text-white/75 dark:text-[#111315]/75"
                              : "text-[#8A9098] dark:text-[#7D858F]"
                          )}
                        >
                          {option.description}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 ml-2",
                          isRetro ? "text-[#121212] stroke-[3]" : "text-white dark:text-[#111315]"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}
