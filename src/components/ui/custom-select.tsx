"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
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
  searchable?: boolean;
  searchPlaceholder?: string;
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
  searchable,
  searchPlaceholder = "Search department or program...",
}: CustomSelectProps) {
  const isRetro = variant === "retro";
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const selectedOption = options.find((opt) => opt.value === value);

  // Enable search automatically if options > 6 or if options have groupings
  const hasGrouping = useMemo(() => options.some((opt) => Boolean(opt.group)), [options]);
  const isSearchable = searchable ?? (options.length > 6 || hasGrouping);

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.group && opt.group.toLowerCase().includes(q)) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Group filtered options while preserving group order
  const groupedOptions = useMemo(() => {
    if (!hasGrouping) {
      return [{ name: "", options: filteredOptions }];
    }

    const map = new Map<string, SelectOption[]>();
    for (const opt of filteredOptions) {
      const g = opt.group || "Other";
      if (!map.has(g)) {
        map.set(g, []);
      }
      map.get(g)!.push(opt);
    }

    const groups: { name: string; options: SelectOption[] }[] = [];
    for (const [name, opts] of map.entries()) {
      groups.push({ name, options: opts });
    }
    return groups;
  }, [filteredOptions, hasGrouping]);

  // Reset highlighted index when search query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

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

  // Open initialization: highlight selected option and focus search input
  useEffect(() => {
    if (isOpen) {
      const initialIdx = filteredOptions.findIndex((opt) => opt.value === value);
      const targetIdx = initialIdx >= 0 ? initialIdx : 0;
      setHighlightedIndex(targetIdx);

      const timer = setTimeout(() => {
        if (isSearchable && searchInputRef.current) {
          searchInputRef.current.focus();
        }
        // Initial scroll to selected or top item
        const container = listRef.current;
        const target = optionRefs.current[targetIdx];
        if (container && target) {
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const headerOffset = 38;
          if (targetRect.top - headerOffset < containerRect.top || targetRect.bottom > containerRect.bottom) {
            container.scrollTop = target.offsetTop - container.offsetTop - headerOffset;
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    } else {
      setSearchQuery("");
      optionRefs.current = [];
    }
  }, [isOpen, value, isSearchable]);

  // Prevent background page scrolling and Lenis interference during mouse-wheel and touchpad scroll
  useEffect(() => {
    if (!isOpen) return;
    const listEl = listRef.current;
    if (!listEl) return;

    const handleWheel = (e: WheelEvent) => {
      // Stop event propagation so smooth scroll libraries (Lenis) or page listeners don't receive it
      e.stopPropagation();

      const { scrollTop, scrollHeight, clientHeight } = listEl;
      const deltaY = e.deltaY;
      const isAtTop = scrollTop <= 0 && deltaY < 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1 && deltaY > 0;

      // Prevent chaining to document / window scroll when hitting bounds
      if (isAtTop || isAtBottom) {
        e.preventDefault();
      }
    };

    listEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      listEl.removeEventListener("wheel", handleWheel);
    };
  }, [isOpen]);

  // Auto scroll highlighted item into view inside the dropdown options container
  useEffect(() => {
    if (!isOpen) return;
    const target = optionRefs.current[highlightedIndex];
    const container = listRef.current;
    if (!container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // Account for sticky category header height so option is not obscured
    const headerBuffer = 38;

    if (targetRect.top - headerBuffer < containerRect.top) {
      container.scrollTop -= (containerRect.top - (targetRect.top - headerBuffer));
    } else if (targetRect.bottom > containerRect.bottom) {
      container.scrollTop += (targetRect.bottom - containerRect.bottom);
    }
  }, [highlightedIndex, isOpen]);

  // Select an option and close dropdown
  const selectOption = useCallback(
    (val: string) => {
      onChange(val);
      setIsOpen(false);
      setSearchQuery("");
      triggerButtonRef.current?.focus();
    },
    [onChange]
  );

  // Keyboard navigation logic
  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev + 1 < filteredOptions.length ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev - 1 >= 0 ? prev - 1 : Math.max(0, filteredOptions.length - 1)
        );
      }
    } else if (e.key === "Home") {
      if (isOpen && (e.currentTarget !== searchInputRef.current || searchQuery === "" || e.ctrlKey)) {
        e.preventDefault();
        setHighlightedIndex(0);
      }
    } else if (e.key === "End") {
      if (isOpen && (e.currentTarget !== searchInputRef.current || searchQuery === "" || e.ctrlKey)) {
        e.preventDefault();
        setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions[highlightedIndex]) {
        selectOption(filteredOptions[highlightedIndex].value);
      } else if (filteredOptions.length === 0 && options.some((o) => o.value.toLowerCase() === "other")) {
        selectOption("Other");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      triggerButtonRef.current?.focus();
    }
  };

  // Track global index across groups for 1:1 option navigation
  let optionCounter = 0;

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
        ref={triggerButtonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyNavigation}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="custom-select-listbox"
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
            "truncate font-medium text-left",
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
              ? "h-4 w-4 text-[#121212] stroke-[2.5] transition-transform duration-200 shrink-0 ml-2"
              : "h-4 w-4 text-[#8A9098] dark:text-[#7D858F] transition-transform duration-200 shrink-0 ml-2",
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
            id="custom-select-listbox"
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            data-lenis-prevent-touch="true"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className={cn(
              "absolute left-0 top-[calc(100%+6px)] z-50 w-full overflow-hidden flex flex-col max-h-[380px] sm:max-h-[420px]",
              isRetro
                ? "retro-dropdown rounded-2xl border-2 border-[#121212] bg-[#FFFDF7] shadow-brutal-card"
                : "rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#22262A] shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            )}
          >
            {/* Search Input Bar */}
            {isSearchable && (
              <div
                className={cn(
                  "p-2.5 border-b shrink-0",
                  isRetro
                    ? "border-[#121212]/15 bg-[#FFFDF7]"
                    : "border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#22262A]"
                )}
              >
                <div className="relative flex items-center">
                  <Search
                    className={cn(
                      "absolute left-3 h-3.5 w-3.5 pointer-events-none",
                      isRetro ? "text-[#121212]/50" : "text-[#8A9098]"
                    )}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyNavigation}
                    placeholder={searchPlaceholder}
                    className={cn(
                      "w-full pl-9 pr-8 py-2 text-xs rounded-xl outline-none transition-all",
                      isRetro
                        ? "border-2 border-[#121212] bg-white font-quicksand font-bold text-[#121212] placeholder:text-[#121212]/40 focus:ring-2 focus:ring-retro-pink shadow-brutal-flat"
                        : "border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#1B1E21] text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] focus:border-[#25292F] dark:focus:border-[#E8EAED]"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className={cn(
                        "absolute right-2.5 p-1 rounded-full text-xs transition-colors",
                        isRetro
                          ? "text-[#121212]/60 hover:text-[#121212] hover:bg-[#F3ECD2]"
                          : "text-[#8A9098] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
                      )}
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Options List */}
            <div
              ref={listRef}
              data-lenis-prevent="true"
              data-lenis-prevent-wheel="true"
              data-lenis-prevent-touch="true"
              tabIndex={-1}
              className={cn(
                "flex-1 overflow-y-auto overscroll-contain touch-pan-y p-1.5 space-y-1 focus:outline-none",
                isRetro
                  ? "[scrollbar-color:rgba(18,18,18,0.3)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#121212]/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#121212]/50"
                  : "[scrollbar-color:rgba(150,150,150,0.3)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#D2D6DC] dark:[&::-webkit-scrollbar-thumb]:bg-[#40464E] [&::-webkit-scrollbar-thumb]:rounded-full"
              )}
              style={{
                maxHeight: "320px",
              }}
            >
              {filteredOptions.length === 0 ? (
                <div className="py-6 px-4 text-center space-y-2">
                  <p
                    className={cn(
                      "text-xs",
                      isRetro ? "font-quicksand font-bold text-[#121212]/70" : "text-[#8A9098]"
                    )}
                  >
                    No departments found matching &ldquo;{searchQuery}&rdquo;
                  </p>
                  {options.some((o) => o.value.toLowerCase() === "other") && (
                    <button
                      type="button"
                      onClick={() => selectOption("Other")}
                      className={cn(
                        "text-xs font-bold underline transition-colors",
                        isRetro
                          ? "text-retro-pink hover:text-retro-orange font-quicksand font-black"
                          : "text-blue-600 dark:text-blue-400"
                      )}
                    >
                      Select &ldquo;Other&rdquo; to specify custom department &rarr;
                    </button>
                  )}
                </div>
              ) : (
                groupedOptions.map((group, gIdx) => (
                  <div key={group.name || `group-${gIdx}`} className="space-y-0.5" role="group">
                    {/* Faculty / School Group Header */}
                    {group.name && (
                      <div
                        className={cn(
                          "px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold select-none sticky top-0 z-10",
                          isRetro
                            ? "font-quicksand font-black text-[#121212] bg-[#F7EFCF] border-2 border-[#121212] my-1.5 first:mt-0 rounded-xl shadow-brutal-flat"
                            : "text-[#656B73] dark:text-[#A6ADB5] bg-[#F0F1F2] dark:bg-[#1A1D20] border border-[#E5E7EA] dark:border-[#30353A] my-1.5 first:mt-0 rounded-lg"
                        )}
                      >
                        {group.name}
                      </div>
                    )}

                    {/* Group Options */}
                    {group.options.map((option) => {
                      const optionIndex = optionCounter++;
                      const isSelected = option.value === value;
                      const isHighlighted = optionIndex === highlightedIndex;

                      return (
                        <button
                          key={option.value}
                          ref={(el) => {
                            optionRefs.current[optionIndex] = el;
                          }}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => selectOption(option.value)}
                          onMouseEnter={() => setHighlightedIndex(optionIndex)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs transition-colors outline-none cursor-pointer",
                            isRetro
                              ? isSelected
                                ? "retro-option bg-retro-yellow text-[#121212] font-black border-2 border-[#121212] shadow-brutal-flat"
                                : isHighlighted
                                ? "retro-option bg-[#F7EFCF] text-[#121212] font-black border-2 border-[#121212] shadow-brutal-flat"
                                : "retro-option text-[#121212] font-quicksand font-bold hover:bg-[#F3ECD2] hover:border-2 hover:border-[#121212]/30 border-2 border-transparent"
                              : isSelected
                              ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] font-semibold"
                              : isHighlighted
                              ? "bg-[#F4F5F6] dark:bg-[#2A2F35] text-[#17191C] dark:text-[#F1F2F3] font-semibold ring-1 ring-inset ring-[#25292F]/20 dark:ring-white/20"
                              : "text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#2A2F35]"
                          )}
                        >
                          <div className="flex flex-col pr-2">
                            <span className={cn(isRetro && "font-quicksand font-bold text-xs")}>
                              {option.label}
                            </span>
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
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}
