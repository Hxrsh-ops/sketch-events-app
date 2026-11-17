"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  timestamp: number;
}

interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global event bus for non-React or outside-context callers
type ToastListener = (toasts: ToastItem[]) => void;
let globalToasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

// Deduplication cache: tracks recent message hashes to avoid duplicate notifications
const recentMessages = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 2500; // 2.5 seconds window

function notifyListeners() {
  listeners.forEach((l) => l([...globalToasts]));
}

/**
 * Show a toast notification from anywhere (inside or outside React tree)
 */
export function showNotification(options: ToastOptions): string {
  const { type = "info", title, message, duration = 5000 } = options;

  if (!message || !message.trim()) return "";

  const trimmedMessage = message.trim();
  const dedupKey = `${type}:${trimmedMessage}`;
  const now = Date.now();
  const lastShown = recentMessages.get(dedupKey);

  // Prevent duplicate notifications within the deduplication window
  if (lastShown && now - lastShown < DEDUPLICATION_WINDOW_MS) {
    // Already displayed recently; refresh timestamp and return existing
    recentMessages.set(dedupKey, now);
    const existing = globalToasts.find((t) => t.message === trimmedMessage && t.type === type);
    return existing ? existing.id : "";
  }

  recentMessages.set(dedupKey, now);

  const id = `toast-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const newToast: ToastItem = {
    id,
    type,
    title,
    message: trimmedMessage,
    duration,
    timestamp: now,
  };

  // Keep max 5 active toasts
  globalToasts = [newToast, ...globalToasts.slice(0, 4)];
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      dismissNotification(id);
    }, duration);
  }

  return id;
}

export function dismissNotification(id: string) {
  globalToasts = globalToasts.filter((t) => t.id !== id);
  notifyListeners();
}

export function clearAllNotifications() {
  globalToasts = [];
  recentMessages.clear();
  notifyListeners();
}

export function getActiveNotifications(): ToastItem[] {
  return [...globalToasts];
}

/**
 * Convenient shortcut helpers
 */
export const toast = {
  success: (message: string, title?: string, duration?: number) =>
    showNotification({ type: "success", message, title, duration }),
  error: (message: string, title?: string, duration?: number) =>
    showNotification({ type: "error", message, title, duration }),
  warning: (message: string, title?: string, duration?: number) =>
    showNotification({ type: "warning", message, title, duration }),
  info: (message: string, title?: string, duration?: number) =>
    showNotification({ type: "info", message, title, duration }),
  dismiss: dismissNotification,
  clearAll: clearAllNotifications,
  getActive: getActiveNotifications,
};

/**
 * Custom Hook to access toast functionality
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (context) {
    return context;
  }
  // Fallback to global emitter if used outside ToastProvider
  return {
    toasts: globalToasts,
    showToast: showNotification,
    dismissToast: dismissNotification,
    clearAllToasts: clearAllNotifications,
  };
}

/**
 * Toast Container Component
 * Renders floating toast notifications in the top-right / top-center of the screen
 */
export function ToastContainer({ className }: { className?: string }) {
  const [activeToasts, setActiveToasts] = useState<ToastItem[]>(globalToasts);

  useEffect(() => {
    const handleUpdate = (updated: ToastItem[]) => {
      setActiveToasts(updated);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  if (activeToasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      role="region"
      aria-label="Notifications"
      className={cn(
        "fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0",
        className
      )}
    >
      {activeToasts.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          onDismiss={() => dismissNotification(item.id)}
        />
      ))}
    </div>
  );
}

/**
 * Individual Toast Card
 */
function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const isError = item.type === "error";
  const isSuccess = item.type === "success";
  const isWarning = item.type === "warning";
  const isInfo = item.type === "info";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto rounded-2xl border p-4 shadow-lg backdrop-blur-md transition-all duration-300 ease-out transform translate-y-0",
        "bg-white dark:bg-[#1B1E21] text-[#17191C] dark:text-[#F1F2F3]",
        isError && "border-rose-200 dark:border-rose-900/60 shadow-rose-500/5",
        isSuccess && "border-emerald-200 dark:border-emerald-900/60 shadow-emerald-500/5",
        isWarning && "border-amber-200 dark:border-amber-900/60 shadow-amber-500/5",
        isInfo && "border-[#E5E7EA] dark:border-[#30353A]"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="shrink-0 mt-0.5">
          {isError && <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
          {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          {isWarning && <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          {isInfo && <Info className="h-5 w-5 text-[#25292F] dark:text-[#E8EAED]" />}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 pr-1">
          {item.title && (
            <h5 className="text-xs font-bold leading-tight text-[#17191C] dark:text-[#F1F2F3] mb-0.5">
              {item.title}
            </h5>
          )}
          <p className="text-xs text-[#656B73] dark:text-[#AEB3BA] leading-relaxed break-words">
            {item.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close notification"
          className="shrink-0 rounded-lg p-1 text-[#8A9098] hover:text-[#17191C] dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Toast Provider for React Context tree
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>(globalToasts);

  useEffect(() => {
    const handleUpdate = (updated: ToastItem[]) => {
      setToasts(updated);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const value = {
    toasts,
    showToast: showNotification,
    dismissToast: dismissNotification,
    clearAllToasts: clearAllNotifications,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}
