"use client";

import { useState, useEffect, useRef, useId } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  X,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface CustomDateTimePickerProps {
  value?: string; // Format: "YYYY-MM-DDTHH:mm" or ISO string
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const QUICK_TIMES = ["09:00 AM", "10:00 AM", "01:00 PM", "02:00 PM", "06:00 PM"];

interface TimeOption {
  value: number;
  label: string;
}

const HOUR_OPTIONS: TimeOption[] = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1;
  return {
    value: h,
    label: `${String(h).padStart(2, "0")} Hour`,
  };
});

const MINUTE_OPTIONS: TimeOption[] = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => ({
  value: m,
  label: `:${String(m).padStart(2, "0")} Mins`,
}));

// Custom Monochrome Dropdown for Time Elements with Full Dark Mode
function CustomTimeSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: number;
  options: TimeOption[];
  onChange: (val: number) => void;
  ariaLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<"bottom" | "top">("top");
  const [maxMenuHeight, setMaxMenuHeight] = useState<number>(180);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const updatePlacement = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const targetHeight = 180;

    if (spaceBelow < 200 && spaceAbove >= 140) {
      setPlacement("top");
      setMaxMenuHeight(Math.max(120, Math.min(targetHeight, spaceAbove)));
    } else if (spaceBelow >= 200) {
      setPlacement("bottom");
      setMaxMenuHeight(Math.max(120, Math.min(targetHeight, spaceBelow)));
    } else {
      const isTop = spaceAbove >= spaceBelow;
      setPlacement(isTop ? "top" : "bottom");
      setMaxMenuHeight(Math.max(100, Math.min(targetHeight, isTop ? spaceAbove : spaceBelow)));
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      updatePlacement();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updatePlacement);
      window.addEventListener("scroll", updatePlacement, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [isOpen]);

  // Auto-scroll selected option into view on open
  useEffect(() => {
    if (isOpen && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isOpen]);

  const selectedOption =
    options.find((o) => o.value === value) || {
      value,
      label: ariaLabel.toLowerCase().includes("hour")
        ? `${String(value).padStart(2, "0")} Hour`
        : `:${String(value).padStart(2, "0")} Mins`,
    };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % options.length;
        onChange(options[nextIndex].value);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const prevIndex =
          currentIndex < 0 ? options.length - 1 : (currentIndex - 1 + options.length) % options.length;
        onChange(options[prevIndex].value);
      }
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`flex h-8.5 w-full items-center justify-between rounded-xl border bg-white dark:bg-[#1B1E21] px-3 text-xs text-[#17191C] dark:text-[#F1F2F3] font-medium transition-all select-none outline-none ${
          isOpen
            ? "border-[#25292F] dark:border-[#E8EAED] ring-1 ring-[#25292F] dark:ring-[#E8EAED] shadow-xs"
            : "border-[#E5E7EA] dark:border-[#30353A] hover:border-[#25292F] dark:hover:border-[#E8EAED] focus-visible:border-[#25292F] dark:focus-visible:border-[#E8EAED] focus-visible:ring-1 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED]"
        }`}
      >
        <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">{selectedOption.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#8A9098] dark:text-[#7D858F] transition-transform duration-150 shrink-0 ${
            isOpen ? "rotate-180 text-[#17191C] dark:text-[#F1F2F3]" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={listboxId}
            ref={listboxRef}
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: placement === "top" ? -4 : 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === "top" ? -4 : 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{ maxHeight: `${maxMenuHeight}px` }}
            className={`absolute left-0 z-[70] w-full overflow-y-auto rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#22262A] p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.14)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.6)] space-y-0.5 select-none ${
              placement === "top" ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
            }`}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  ref={isSelected ? selectedItemRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors outline-none select-none ${
                    isSelected
                      ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] font-semibold shadow-xs"
                      : "text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#2A2F35] focus-visible:bg-[#F4F5F6] dark:focus-visible:bg-[#2A2F35]"
                  }`}
                >
                  <span className={isSelected ? "text-white dark:text-[#111315] font-semibold" : "text-[#17191C] dark:text-[#F1F2F3]"}>
                    {opt.label}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-white dark:text-[#111315] shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CustomDateTimePicker({
  value,
  onChange,
  label,
  placeholder = "Select date & time...",
  minDate,
  maxDate,
  disabled = false,
  error,
  className = "",
  required = false,
}: CustomDateTimePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPlacement, setPopoverPlacement] = useState<"bottom" | "top">("bottom");
  const [horizontalAlign, setHorizontalAlign] = useState<"left" | "right">("left");
  const componentId = useId();

  // Smart placement for main calendar popover
  const updatePopoverPlacement = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;
    const estimatedHeight = 440;

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      setPopoverPlacement("top");
    } else {
      setPopoverPlacement("bottom");
    }

    if (rect.left + 340 > window.innerWidth - 16 && rect.right >= 340) {
      setHorizontalAlign("right");
    } else {
      setHorizontalAlign("left");
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePopoverPlacement();
      window.addEventListener("resize", updatePopoverPlacement);
      window.addEventListener("scroll", updatePopoverPlacement, true);
    }
    return () => {
      window.removeEventListener("resize", updatePopoverPlacement);
      window.removeEventListener("scroll", updatePopoverPlacement, true);
    };
  }, [isOpen]);

  // Parse existing value or fallback to current date
  const parseValue = (valStr?: string) => {
    if (!valStr) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
        hours24: now.getHours(),
        minutes: Math.floor(now.getMinutes() / 5) * 5,
        hasValue: false,
      };
    }

    const d = new Date(valStr);
    if (isNaN(d.getTime())) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
        hours24: 9,
        minutes: 0,
        hasValue: false,
      };
    }

    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      hours24: d.getHours(),
      minutes: d.getMinutes(),
      hasValue: true,
    };
  };

  const initialParsed = parseValue(value);
  const [viewYear, setViewYear] = useState(initialParsed.year);
  const [viewMonth, setViewMonth] = useState(initialParsed.month);
  const [selectedDay, setSelectedDay] = useState<number | null>(
    initialParsed.hasValue ? initialParsed.day : null
  );
  const [selectedHours, setSelectedHours] = useState(initialParsed.hours24 % 12 || 12);
  const [selectedMinutes, setSelectedMinutes] = useState(initialParsed.minutes);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(
    initialParsed.hours24 >= 12 ? "PM" : "AM"
  );

  // Sync state whenever external `value` prop changes
  useEffect(() => {
    const parsed = parseValue(value);
    if (parsed.hasValue) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
      setSelectedDay(parsed.day);
      setSelectedHours(parsed.hours24 % 12 || 12);
      setSelectedMinutes(parsed.minutes);
      setSelectedPeriod(parsed.hours24 >= 12 ? "PM" : "AM");
    } else if (!value) {
      setSelectedDay(null);
    }
  }, [value]);

  // Click outside to close main popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Format the helper string: "YYYY-MM-DDTHH:mm"
  const emitDateTime = (
    y: number,
    m: number,
    d: number,
    h12: number,
    min: number,
    period: "AM" | "PM"
  ) => {
    let h24 = h12 % 12;
    if (period === "PM") h24 += 12;

    const yStr = String(y).padStart(4, "0");
    const mStr = String(m + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    const hourStr = String(h24).padStart(2, "0");
    const minStr = String(min).padStart(2, "0");

    const formatted = `${yStr}-${mStr}-${dStr}T${hourStr}:${minStr}`;
    onChange(formatted);
  };

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Day selection
  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    emitDateTime(viewYear, viewMonth, day, selectedHours, selectedMinutes, selectedPeriod);
  };

  // Time part change
  const handleTimeChange = (newHours: number, newMinutes: number, newPeriod: "AM" | "PM") => {
    setSelectedHours(newHours);
    setSelectedMinutes(newMinutes);
    setSelectedPeriod(newPeriod);

    const activeDay = selectedDay || new Date().getDate();
    if (!selectedDay) setSelectedDay(activeDay);
    emitDateTime(viewYear, viewMonth, activeDay, newHours, newMinutes, newPeriod);
  };

  // Quick preset time selection
  const handleQuickTime = (timeStr: string) => {
    const [t, p] = timeStr.split(" ");
    const [h, m] = t.split(":").map(Number);
    handleTimeChange(h, m, p as "AM" | "PM");
  };

  // "Today" shortcut
  const handleSelectToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(today.getDate());
    emitDateTime(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      selectedHours,
      selectedMinutes,
      selectedPeriod
    );
  };

  // Clear action
  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDay(null);
    onChange("");
  };

  // Generate calendar grid dates
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  // Format trigger label
  const formatDisplayValue = () => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;

    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const displayString = formatDisplayValue();

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`}>
      {label && (
        <label
          htmlFor={componentId}
          className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1 select-none"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Styled Trigger Input */}
      <div className="relative">
        <button
          id={componentId}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex h-10 w-full items-center justify-between rounded-full border bg-white dark:bg-[#1B1E21] px-4 text-xs font-medium text-left transition-all ${
            disabled ? "opacity-50 cursor-not-allowed bg-[#F4F5F6] dark:bg-[#151719]" : "cursor-pointer hover:border-[#25292F] dark:hover:border-[#E8EAED]"
          } ${
            error
              ? "border-red-500 focus:ring-1 focus:ring-red-500"
              : isOpen
              ? "border-[#25292F] dark:border-[#E8EAED] ring-1 ring-[#25292F] dark:ring-[#E8EAED]"
              : "border-[#E5E7EA] dark:border-[#30353A]"
          }`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
            <CalendarIcon className="h-3.5 w-3.5 text-[#8A9098] dark:text-[#7D858F] shrink-0" />
            <span className={displayString ? "text-[#17191C] dark:text-[#F1F2F3] font-semibold truncate" : "text-[#8A9098] dark:text-[#7D858F]"}>
              {displayString || placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {displayString && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear()}
                className="p-1 text-[#8A9098] dark:text-[#7D858F] hover:text-[#17191C] dark:hover:text-[#F1F2F3] rounded-full transition-colors"
                aria-label="Clear date"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </div>
        </button>
      </div>

      {error && <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>}

      {/* Popover Calendar & Time Picker Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: popoverPlacement === "top" ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: popoverPlacement === "top" ? -4 : 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute z-50 w-full sm:w-[340px] rounded-[22px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)] space-y-4 ${
              popoverPlacement === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
            } ${horizontalAlign === "right" ? "sm:right-0 sm:left-auto" : "left-0"}`}
          >
            {/* Header: Month & Year Navigator */}
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F1F2] dark:border-[#262A2E]">
              <span className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3] tracking-tight">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E5E7EA] dark:border-[#30353A] text-[#656B73] dark:text-[#A6ADB5] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] hover:text-[#17191C] dark:hover:text-[#F1F2F3] transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E5E7EA] dark:border-[#30353A] text-[#656B73] dark:text-[#A6ADB5] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] hover:text-[#17191C] dark:hover:text-[#F1F2F3] transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 text-center">
              {DAYS_OF_WEEK.map((d) => (
                <span key={d} className="text-[10px] font-bold text-[#8A9098] dark:text-[#7D858F]">
                  {d}
                </span>
              ))}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Padding empty slots before month start */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8 w-8" />
              ))}

              {/* Day numbers */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected =
                  selectedDay === day &&
                  initialParsed.hasValue &&
                  viewMonth === initialParsed.month &&
                  viewYear === initialParsed.year;

                const today = new Date();
                const isToday =
                  today.getDate() === day &&
                  today.getMonth() === viewMonth &&
                  today.getFullYear() === viewYear;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-sm"
                        : isToday
                        ? "border border-[#25292F] dark:border-[#E8EAED] text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F]"
                        : "text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time Selection Section with Custom Monochrome Dropdowns */}
            <div className="border-t border-[#F0F1F2] dark:border-[#262A2E] pt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#7D858F] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Time
                </span>

                {/* AM / PM Toggle */}
                <div className="flex rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#151719] p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleTimeChange(selectedHours, selectedMinutes, "AM")}
                    className={`rounded-full px-2.5 py-0.5 transition-colors ${
                      selectedPeriod === "AM"
                        ? "bg-white dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3] shadow-xs"
                        : "text-[#8A9098] dark:text-[#7D858F]"
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeChange(selectedHours, selectedMinutes, "PM")}
                    className={`rounded-full px-2.5 py-0.5 transition-colors ${
                      selectedPeriod === "PM"
                        ? "bg-white dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3] shadow-xs"
                        : "text-[#8A9098] dark:text-[#7D858F]"
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* Custom Hour & Minute Dropdowns (Zero Native Browser Menus) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <CustomTimeSelect
                  value={selectedHours}
                  options={HOUR_OPTIONS}
                  onChange={(newHour) =>
                    handleTimeChange(newHour, selectedMinutes, selectedPeriod)
                  }
                  ariaLabel="Select Hour"
                />

                <CustomTimeSelect
                  value={selectedMinutes}
                  options={MINUTE_OPTIONS}
                  onChange={(newMinute) =>
                    handleTimeChange(selectedHours, newMinute, selectedPeriod)
                  }
                  ariaLabel="Select Minute"
                />
              </div>

              {/* Quick Time Presets */}
              <div className="flex flex-wrap gap-1 pt-1">
                {QUICK_TIMES.map((qt) => (
                  <button
                    key={qt}
                    type="button"
                    onClick={() => handleQuickTime(qt)}
                    className="rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#22262A] px-2 py-0.5 text-[10px] font-medium text-[#656B73] dark:text-[#A6ADB5] hover:bg-[#EAECEF] dark:hover:bg-[#2A2F35] hover:text-[#17191C] dark:hover:text-[#F1F2F3] transition-colors"
                  >
                    {qt}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="border-t border-[#F0F1F2] dark:border-[#262A2E] pt-2.5 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-[11px] font-bold text-[#656B73] dark:text-[#A6ADB5] hover:text-[#17191C] dark:hover:text-[#F1F2F3] underline"
              >
                Today
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1 rounded-full bg-[#25292F] dark:bg-[#E8EAED] px-3.5 py-1 text-xs font-semibold text-white dark:text-[#111315] shadow-xs hover:bg-[#17191C] dark:hover:bg-white transition-colors"
                >
                  <Check className="h-3 w-3" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
