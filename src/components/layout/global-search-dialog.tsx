"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Calendar,
  Users,
  Ticket,
  Loader2,
  X,
  ArrowRight,
  Command,
} from "lucide-react";
import { globalSearchAction, GlobalSearchOutput } from "@/app/actions/search-actions";
import { Badge } from "@/components/ui/badge";

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchDialog({ isOpen, onClose }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchOutput | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults(null);
      setError(null);
    }
  }, [isOpen]);

  // Handle global shortcut Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open dialog handled by parent or by toggling state
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search query
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await globalSearchAction({ query: trimmed });
          if (res.success && res.data) {
            setResults(res.data);
            setError(null);
            setSelectedIndex(0);
          } else {
            setError(res.message || "Failed to fetch search results.");
            setResults(null);
          }
        } catch {
          setError("Network error while searching.");
          setResults(null);
        }
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Flattened items for keyboard arrow navigation
  const flatItems: Array<{
    type: "event" | "participant" | "pass";
    id: string;
    href: string;
  }> = [];

  if (results) {
    results.events.forEach((e) =>
      flatItems.push({ type: "event", id: e.id, href: `/events/${e.id}` })
    );
    results.participants.forEach((p) =>
      flatItems.push({
        type: "participant",
        id: p.id,
        href: `/events/${p.eventId}`,
      })
    );
    results.passes.forEach((pass) =>
      flatItems.push({
        type: "pass",
        id: pass.id,
        href: `/attendance?event=${pass.eventId}&code=${encodeURIComponent(pass.registrationId)}`,
      })
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = flatItems[selectedIndex];
      if (current) {
        onClose();
        router.push(current.href);
      }
    }
  };

  const navigateTo = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!isOpen) return null;

  let flatIndexCounter = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-2xl overflow-hidden transition-all duration-150 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-[#E5E7EA] dark:border-[#30353A] px-4 py-3 bg-[#FAFBFB] dark:bg-[#181A1D]">
          <Search className="h-4 w-4 shrink-0 text-[#8A9098] dark:text-[#7D858F] mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, participants, ticket IDs..."
            className="flex-1 bg-transparent text-sm text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] dark:placeholder:text-[#7D858F] focus:outline-none"
            aria-label="Global search input"
          />
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#8A9098] dark:text-[#7D858F] mr-2" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults(null);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-[#8A9098] hover:text-[#17191C] dark:hover:text-[#F1F2F3] mr-2"
              aria-label="Clear query"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#22262A] px-1.5 py-0.5 text-[10px] font-medium text-[#8A9098] dark:text-[#7D858F] select-none">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Minimum characters guidance */}
          {query.trim().length < 2 && !error && (
            <div className="py-8 text-center text-xs text-[#8A9098] dark:text-[#7D858F]">
              <Command className="h-8 w-8 mx-auto mb-2 text-[#CBD0D6] dark:text-[#4A515A]" />
              <p className="font-medium text-[#17191C] dark:text-[#F1F2F3]">Global Search</p>
              <p className="mt-1">
                Type at least 2 characters to search events by title or slug, attendee names and emails, or ticket numbers.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* No Results */}
          {results && results.totalMatches === 0 && !isPending && (
            <div className="py-8 text-center text-xs text-[#8A9098] dark:text-[#7D858F]">
              <p className="font-medium text-[#17191C] dark:text-[#F1F2F3]">No matches found</p>
              <p className="mt-1">No events, participants, or passes matched &ldquo;{query}&rdquo;.</p>
            </div>
          )}

          {/* Events Category */}
          {results && results.events.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#7D858F]">
                Events ({results.events.length})
              </div>
              <div className="mt-1 space-y-1">
                {results.events.map((e) => {
                  const itemIndex = flatIndexCounter++;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <div
                      key={`ev-${e.id}`}
                      onClick={() => navigateTo(`/events/${e.id}`)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                        isSelected
                          ? "bg-[#17191C] text-white dark:bg-[#E8EAED] dark:text-[#17191C]"
                          : "hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Calendar className={`h-4 w-4 shrink-0 ${isSelected ? "text-white dark:text-[#17191C]" : "text-[#8A9098]"}`} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{e.title}</p>
                          <p className={`text-[11px] truncate ${isSelected ? "text-white/80 dark:text-[#17191C]/80" : "text-[#656B73] dark:text-[#A6ADB5]"}`}>
                            {e.venue} • {e.category}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize shrink-0 ml-2 ${
                          isSelected
                            ? "border-white/30 text-white dark:border-[#17191C]/30 dark:text-[#17191C]"
                            : ""
                        }`}
                      >
                        {e.lifecycle}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Participants Category */}
          {results && results.participants.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#7D858F]">
                Participants ({results.participants.length})
              </div>
              <div className="mt-1 space-y-1">
                {results.participants.map((p) => {
                  const itemIndex = flatIndexCounter++;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <div
                      key={`part-${p.id}`}
                      onClick={() => navigateTo(`/events/${p.eventId}`)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                        isSelected
                          ? "bg-[#17191C] text-white dark:bg-[#E8EAED] dark:text-[#17191C]"
                          : "hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Users className={`h-4 w-4 shrink-0 ${isSelected ? "text-white dark:text-[#17191C]" : "text-[#8A9098]"}`} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{p.name}</p>
                          <p className={`text-[11px] truncate ${isSelected ? "text-white/80 dark:text-[#17191C]/80" : "text-[#656B73] dark:text-[#A6ADB5]"}`}>
                            {p.email} • {p.eventTitle}
                          </p>
                        </div>
                      </div>
                      <span className={`font-mono text-[10px] shrink-0 ml-2 ${isSelected ? "text-white/80 dark:text-[#17191C]/80" : "text-[#8A9098]"}`}>
                        {p.registrationId}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Passes Category */}
          {results && results.passes.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#7D858F]">
                Passes & Ticket Credentials ({results.passes.length})
              </div>
              <div className="mt-1 space-y-1">
                {results.passes.map((pass) => {
                  const itemIndex = flatIndexCounter++;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <div
                      key={`pass-${pass.id}`}
                      onClick={() =>
                        navigateTo(
                          `/attendance?event=${pass.eventId}&code=${encodeURIComponent(pass.registrationId)}`
                        )
                      }
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                        isSelected
                          ? "bg-[#17191C] text-white dark:bg-[#E8EAED] dark:text-[#17191C]"
                          : "hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Ticket className={`h-4 w-4 shrink-0 ${isSelected ? "text-white dark:text-[#17191C]" : "text-[#8A9098]"}`} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {pass.attendeeName} ({pass.registrationId})
                          </p>
                          <p className={`text-[11px] truncate ${isSelected ? "text-white/80 dark:text-[#17191C]/80" : "text-[#656B73] dark:text-[#A6ADB5]"}`}>
                            Token: {pass.qrCredentialId} • {pass.eventTitle}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 flex items-center gap-1 text-[11px] font-medium ml-2">
                        <span>Check In</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="border-t border-[#E5E7EA] dark:border-[#30353A] px-4 py-2 bg-[#F9FAFB] dark:bg-[#181A1D] flex items-center justify-between text-[11px] text-[#8A9098] dark:text-[#7D858F]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-semibold">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="font-semibold">↵</kbd> Open
            </span>
            <span>
              <kbd className="font-semibold">esc</kbd> Dismiss
            </span>
          </div>
          <span>SketchHUB Universal Search</span>
        </div>
      </div>
    </div>
  );
}
