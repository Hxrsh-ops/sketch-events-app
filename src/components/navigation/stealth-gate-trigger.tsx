"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Stealth Gate Trigger:
 * Invisible listener providing secret organizer access to /ops/gateway.
 * 1. Global hotkey: Ctrl + Shift + K (or Cmd + Shift + K)
 * 2. 5-click pattern on any element wrapped or registered with this hook.
 * Zero DOM footprint. Invisible to scrapers, bots, and standard users.
 */
export function StealthGateTrigger() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkey: Ctrl + Shift + K or Cmd + Shift + K
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "K" || e.key === "k")) {
        e.preventDefault();
        router.push("/ops/gateway");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}

/**
 * Hook to attach secret 5-click counter to any stealth element (e.g., logo)
 */
export function useStealthClickTrigger(clicksNeeded = 5, timeWindowMs = 2000) {
  const router = useRouter();
  const clickTimestamps = useRef<number[]>([]);

  const onSecretClick = (e?: React.MouseEvent) => {
    const now = Date.now();
    clickTimestamps.current = clickTimestamps.current.filter(
      (ts) => now - ts < timeWindowMs
    );
    clickTimestamps.current.push(now);

    if (clickTimestamps.current.length >= clicksNeeded) {
      if (e) {
        e.preventDefault();
      }
      clickTimestamps.current = [];
      router.push("/ops/gateway");
    }
  };

  return { onSecretClick };
}
