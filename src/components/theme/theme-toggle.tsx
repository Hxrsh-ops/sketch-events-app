"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, Theme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const getThemeIcon = () => {
    if (theme === "system") {
      return <Laptop className="h-4 w-4" />;
    }
    return resolvedTheme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );
  };

  const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Laptop },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Theme: ${theme}. Click to change theme.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#656B73] dark:text-[#A6ADB5] shadow-sm transition-colors hover:bg-[#F0F1F2] dark:hover:bg-[#25292F] hover:text-[#17191C] dark:hover:text-[#F1F2F3] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED]"
      >
        {getThemeIcon()}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            role="listbox"
            aria-label="Select appearance theme"
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-36 rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.14)] space-y-0.5 select-none"
          >
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setTheme(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] font-semibold"
                      : "text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-white dark:text-[#111315]" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();

  const OPTIONS: { value: Theme; label: string; desc: string; icon: typeof Sun }[] = [
    {
      value: "light",
      label: "Light Theme",
      desc: "Clean high-contrast ivory canvas with charcoal typography",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Dark Theme",
      desc: "Restrained graphite & charcoal surfaces designed for low-light operations",
      icon: Moon,
    },
    {
      value: "system",
      label: "System Preference",
      desc: "Dynamically synchronizes with your device operating system theme",
      icon: Laptop,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.value;
        const isDarkCard = opt.value === "dark";

        if (isDarkCard) {
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`sketch-card-hero flex flex-col text-left p-4 rounded-2xl transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isSelected
                  ? "ring-2 ring-white/90 border-white/60 shadow-[0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]"
                  : "border-[#363C46] hover:border-[#48515E]"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                    isSelected
                      ? "bg-white text-[#111315]"
                      : "bg-white/10 text-white/90 border border-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#111315]">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-white">
                {opt.label}
              </span>
              <span className="text-[11px] text-white/70 mt-1 line-clamp-2 leading-relaxed">
                {opt.desc}
              </span>
            </button>
          );
        }

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex flex-col text-left p-4 rounded-2xl border transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] ${
              isSelected
                ? "border-[#25292F] dark:border-[#E8EAED] bg-[#F4F5F6] dark:bg-[#25292F] ring-1 ring-[#25292F] dark:ring-[#E8EAED] shadow-sm"
                : "border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] hover:border-[#D2D6DC] dark:hover:border-[#40464E]"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  isSelected
                    ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                    : "bg-[#F0F1F2] dark:bg-[#25292F] text-[#656B73] dark:text-[#A6ADB5]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              {isSelected && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">
              {opt.label}
            </span>
            <span className="text-[11px] text-[#656B73] dark:text-[#A6ADB5] mt-1 line-clamp-2 leading-relaxed">
              {opt.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}
