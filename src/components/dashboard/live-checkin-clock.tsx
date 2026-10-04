"use client";

import { useState, useEffect } from "react";
import { Play, Pause, Square, QrCode } from "lucide-react";
import Link from "next/link";

export function LiveCheckinClock() {
  const [seconds, setSeconds] = useState(5048); // 01:24:08
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0F281E] via-[#163829] to-[#0A1F16] p-6 text-white shadow-lg">
      {/* Background Subtle Wave Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(40,167,69,0.15),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
          Check-in Desk Session
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active Desk
        </span>
      </div>

      {/* Digital Digits Display matching Donezo 01:24:08 */}
      <div className="relative z-10 my-4 text-center">
        <span className="font-mono text-4xl sm:text-5xl font-black tracking-widest text-white drop-shadow-md">
          {formatTime(seconds)}
        </span>
        <p className="mt-1 text-[11px] text-emerald-300/70">
          Studio Lab B — Station #1
        </p>
      </div>

      {/* Action Controls matching Donezo rounded action buttons */}
      <div className="relative z-10 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#191A1C] shadow-md transition-transform hover:scale-105 active:scale-95"
          aria-label={isRunning ? "Pause session" : "Resume session"}
        >
          {isRunning ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current ml-0.5" />
          )}
        </button>

        <Link
          href="/attendance"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#B83A43] text-white shadow-md transition-transform hover:scale-105 active:scale-95"
          title="Open QR Scanner"
        >
          <QrCode className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
