"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function LiveCheckinClock() {
  const [seconds, setSeconds] = useState(10086); // 02:48:06
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
    <div className="relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-[24px] bg-[#121417] p-6 text-white shadow-elevated">
      {/* Real Dark Photographic Monochrome Texture matching Donezo Time Tracker */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity filter grayscale"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop&q=80')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />

      {/* Header Label */}
      <div className="relative z-10">
        <span className="text-xs font-normal text-white/80">
          Time Tracker
        </span>
      </div>

      {/* Digital Digits Display matching Donezo 02:48:06 */}
      <div className="relative z-10 my-2 text-center">
        <span className="font-sans text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
          {formatTime(seconds)}
        </span>
      </div>

      {/* Action Controls matching Donezo Pause and Stop pill buttons */}
      <div className="relative z-10 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className="rounded-full border border-white/50 bg-white/5 px-6 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
        >
          {isRunning ? "Pause" : "Resume"}
        </button>

        <button
          type="button"
          onClick={() => setSeconds(0)}
          className="rounded-full border border-white/50 bg-white/5 px-6 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
