"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Copy, Check, ChevronDown, Palette } from "lucide-react";

// ==========================================
// COLOR MATH & CONVERSION UTILITIES
// ==========================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number; // 0 - 360
  s: number; // 0 - 1
  v: number; // 0 - 1
}

export function isValidHex(hex: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

export function normalizeHex(hex: string, fallback = "#000000"): string {
  if (!hex) return fallback;
  let clean = hex.trim();
  if (!clean.startsWith("#")) clean = `#${clean}`;
  if (!isValidHex(clean)) return fallback;
  if (clean.length === 4) {
    clean = `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean.toUpperCase();
}

export function hexToRgb(hex: string): RGB {
  const norm = normalizeHex(hex);
  const r = parseInt(norm.substring(1, 3), 16);
  const g = parseInt(norm.substring(3, 5), 16);
  const b = parseInt(norm.substring(5, 7), 16);
  return { r: isNaN(r) ? 0 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  const rNorm = Math.max(0, Math.min(255, r)) / 255;
  const gNorm = Math.max(0, Math.min(255, g)) / 255;
  const bNorm = Math.max(0, Math.min(255, b)) / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h: Math.round(h), s, v };
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  const normH = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = v - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (0 <= normH && normH < 60) {
    rPrime = c;
    gPrime = x;
    bPrime = 0;
  } else if (60 <= normH && normH < 120) {
    rPrime = x;
    gPrime = c;
    bPrime = 0;
  } else if (120 <= normH && normH < 180) {
    rPrime = 0;
    gPrime = c;
    bPrime = x;
  } else if (180 <= normH && normH < 240) {
    rPrime = 0;
    gPrime = x;
    bPrime = c;
  } else if (240 <= normH && normH < 300) {
    rPrime = x;
    gPrime = 0;
    bPrime = c;
  } else if (300 <= normH && normH < 360) {
    rPrime = c;
    gPrime = 0;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

// ==========================================
// PRESET PALETTES
// ==========================================

export type PaletteCategory = "vibrant" | "pastel" | "neon" | "earthy" | "professional";

export const COLOR_PALETTES: Record<
  PaletteCategory,
  { name: string; colors: string[] }
> = {
  vibrant: {
    name: "Vibrant",
    colors: [
      "#EF4444", // Crimson Red
      "#F97316", // Bright Orange
      "#F59E0B", // Amber Gold
      "#10B981", // Emerald
      "#06B6D4", // Vivid Cyan
      "#3B82F6", // Royal Blue
      "#8B5CF6", // Purple
      "#EC4899", // Hot Pink
    ],
  },
  pastel: {
    name: "Pastel",
    colors: [
      "#FECDD3", // Soft Rose
      "#FFEDD5", // Warm Peach
      "#FEF08A", // Buttercream
      "#A7F3D0", // Mint Foam
      "#BAE6FD", // Sky Mist
      "#C7D2FE", // Periwinkle
      "#DDD6FE", // Soft Lilac
      "#FBCFE8", // Powder Pink
    ],
  },
  neon: {
    name: "Neon",
    colors: [
      "#FF0055", // Neon Crimson
      "#FF5500", // Blaze Orange
      "#FFE600", // Cyber Yellow
      "#00FF66", // Matrix Green
      "#00F0FF", // Electric Aqua
      "#0066FF", // Hyper Blue
      "#B000FF", // Neon Purple
      "#FF00B8", // Ultra Magenta
    ],
  },
  earthy: {
    name: "Earthy",
    colors: [
      "#451A03", // Espresso
      "#78350F", // Terracotta
      "#92400E", // Warm Caramel
      "#713F12", // Raw Ochre
      "#3F6212", // Olive Moss
      "#14532D", // Forest Pine
      "#115E59", // Deep Teal
      "#44403C", // Charcoal Brown
    ],
  },
  professional: {
    name: "Professional",
    colors: [
      "#0F172A", // Slate Navy
      "#1E293B", // Midnight Metal
      "#334155", // Steel Gray
      "#64748B", // Cool Slate
      "#94A3B8", // Silver Ash
      "#E2E8F0", // Platinum
      "#E2B857", // SketchHUB Gold
      "#FFFFFF", // Pure White
    ],
  },
};

// ==========================================
// CIRCULAR COLOR PICKER CORE COMPONENT
// ==========================================

export interface CircularColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
  showPalettes?: boolean;
}

export function CircularColorPicker({
  value,
  onChange,
  className = "",
  showPalettes = true,
}: CircularColorPickerProps) {
  const normalizedValue = useMemo(() => normalizeHex(value), [value]);

  // Internal HSV representation
  const [hsv, setHsv] = useState<HSV>(() => {
    const rgb = hexToRgb(normalizedValue);
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  });

  // Local text input state for smooth editing
  const [hexInput, setHexInput] = useState<string>(normalizedValue);
  const [activePalette, setActivePalette] = useState<PaletteCategory>("vibrant");
  const [copied, setCopied] = useState<boolean>(false);

  // Geometry constants
  const WHEEL_SIZE = 190;
  const CENTER = WHEEL_SIZE / 2; // 95
  const OUTER_RADIUS = 95;
  const INNER_RADIUS = 73;
  const MID_RADIUS = (OUTER_RADIUS + INNER_RADIUS) / 2; // 84
  const SV_BOX_SIZE = 76;
  const SV_HALF = SV_BOX_SIZE / 2; // 38

  const wheelRef = useRef<HTMLDivElement>(null);
  const svBoxRef = useRef<HTMLDivElement>(null);
  const isDraggingHue = useRef(false);
  const isDraggingSV = useRef(false);

  // Sync HSV when external value changes
  useEffect(() => {
    const currentHex = rgbToHex(
      hsvToRgb(hsv.h, hsv.s, hsv.v).r,
      hsvToRgb(hsv.h, hsv.s, hsv.v).g,
      hsvToRgb(hsv.h, hsv.s, hsv.v).b
    );
    if (normalizedValue !== currentHex) {
      const rgb = hexToRgb(normalizedValue);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
      setHexInput(normalizedValue);
    }
  }, [normalizedValue]);

  // Emit color change to parent
  const emitColorChange = useCallback(
    (newHsv: HSV) => {
      setHsv(newHsv);
      const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      setHexInput(hex);
      onChange(hex);
    },
    [onChange]
  );

  // 1. Hue Wheel Interaction (Circular drag)
  const handleHueMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!wheelRef.current) return;
      const rect = wheelRef.current.getBoundingClientRect();
      const wheelCenterX = rect.left + CENTER;
      const wheelCenterY = rect.top + CENTER;

      const dx = clientX - wheelCenterX;
      const dy = clientY - wheelCenterY;

      // Calculate angle from 12 o'clock (0deg at top)
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;
      deg = Math.round(deg) % 360;

      emitColorChange({ ...hsv, h: deg });
    },
    [emitColorChange, hsv]
  );

  const handleHueMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingHue.current = true;
    handleHueMove(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingHue.current) return;
      handleHueMove(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      isDraggingHue.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleHueTouchStart = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    isDraggingHue.current = true;
    handleHueMove(e.touches[0].clientX, e.touches[0].clientY);

    const onTouchMove = (touchEvent: TouchEvent) => {
      if (!isDraggingHue.current || !touchEvent.touches[0]) return;
      handleHueMove(touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
    };

    const onTouchEnd = () => {
      isDraggingHue.current = false;
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  };

  // 2. Saturation & Brightness Box Interaction (2D SV drag)
  const handleSVMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!svBoxRef.current) return;
      const rect = svBoxRef.current.getBoundingClientRect();

      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;

      const s = Math.max(0, Math.min(1, rawX / rect.width));
      const v = Math.max(0, Math.min(1, 1 - rawY / rect.height));

      emitColorChange({ ...hsv, s, v });
    },
    [emitColorChange, hsv]
  );

  const handleSVMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingSV.current = true;
    handleSVMove(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingSV.current) return;
      handleSVMove(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      isDraggingSV.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleSVTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!e.touches[0]) return;
    isDraggingSV.current = true;
    handleSVMove(e.touches[0].clientX, e.touches[0].clientY);

    const onTouchMove = (touchEvent: TouchEvent) => {
      if (!isDraggingSV.current || !touchEvent.touches[0]) return;
      handleSVMove(touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
    };

    const onTouchEnd = () => {
      isDraggingSV.current = false;
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  };

  // 3. HEX Input Handler
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setHexInput(raw);
    const formatted = raw.startsWith("#") ? raw : `#${raw}`;
    if (isValidHex(formatted)) {
      const normalized = normalizeHex(formatted);
      const rgb = hexToRgb(normalized);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
      onChange(normalized);
    }
  };

  const handleHexInputBlur = () => {
    const formatted = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
    if (isValidHex(formatted)) {
      const normalized = normalizeHex(formatted);
      setHexInput(normalized);
      onChange(normalized);
    } else {
      setHexInput(normalizedValue);
    }
  };

  // 4. RGB Handlers
  const currentRgb = useMemo(() => hsvToRgb(hsv.h, hsv.s, hsv.v), [hsv]);

  const handleRgbChange = (channel: "r" | "g" | "b", val: number) => {
    const clamped = Math.max(0, Math.min(255, isNaN(val) ? 0 : val));
    const nextRgb = { ...currentRgb, [channel]: clamped };
    const nextHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setHsv(rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b));
    setHexInput(nextHex);
    onChange(nextHex);
  };

  // 5. Copy HEX functionality
  const handleCopyHex = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(normalizedValue);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Thumb position calculations
  const hueAngleRad = ((hsv.h - 90) * Math.PI) / 180;
  const hueThumbX = CENTER + MID_RADIUS * Math.cos(hueAngleRad);
  const hueThumbY = CENTER + MID_RADIUS * Math.sin(hueAngleRad);

  const svThumbX = hsv.s * SV_BOX_SIZE;
  const svThumbY = (1 - hsv.v) * SV_BOX_SIZE;

  const pureHueColor = `hsl(${hsv.h}, 100%, 50%)`;

  return (
    <div
      className={`circular-color-picker-root p-3.5 rounded-2xl bg-white dark:bg-[#15171A] border border-[#E5E7EA] dark:border-[#2C3136] shadow-xl text-neutral-800 dark:text-neutral-200 select-none ${className}`}
      style={{ width: "260px" }}
    >
      {/* 1. Header: Live Preview Swatch, HEX Input & Copy Button */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-xl border border-black/15 dark:border-white/20 shadow-inner shrink-0 relative overflow-hidden"
          style={{ backgroundColor: normalizedValue }}
          title={`Selected: ${normalizedValue}`}
        >
          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 pointer-events-none rounded-xl" />
        </div>

        <div className="flex-1 relative">
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInputChange}
            onBlur={handleHexInputBlur}
            maxLength={7}
            className="w-full h-9 px-2.5 rounded-xl border border-[#E5E7EA] dark:border-[#33383F] bg-[#F9FAFB] dark:bg-[#1D2126] font-mono text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="#000000"
            aria-label="Hex color value"
          />
        </div>

        <button
          type="button"
          onClick={handleCopyHex}
          className="h-9 px-2.5 rounded-xl border border-[#E5E7EA] dark:border-[#33383F] bg-[#F9FAFB] dark:bg-[#1D2126] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors flex items-center justify-center gap-1 text-[11px] font-medium shrink-0"
          title="Copy HEX color code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-bold text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Circular Color Wheel with Center 2D SV Square */}
      <div className="flex items-center justify-center my-2">
        <div
          ref={wheelRef}
          onMouseDown={handleHueMouseDown}
          onTouchStart={handleHueTouchStart}
          style={{
            width: `${WHEEL_SIZE}px`,
            height: `${WHEEL_SIZE}px`,
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
          }}
          className="relative cursor-pointer touch-none shadow-md"
        >
          {/* Inner Wheel Cutout (renders circular ring with 22px thickness) */}
          <div
            style={{
              position: "absolute",
              top: `${OUTER_RADIUS - INNER_RADIUS}px`,
              left: `${OUTER_RADIUS - INNER_RADIUS}px`,
              width: `${INNER_RADIUS * 2}px`,
              height: `${INNER_RADIUS * 2}px`,
              borderRadius: "50%",
            }}
            className="bg-white dark:bg-[#15171A] flex items-center justify-center pointer-events-none"
          />

          {/* Hue Selection Indicator Pin */}
          <div
            style={{
              position: "absolute",
              left: `${hueThumbX}px`,
              top: `${hueThumbY}px`,
              transform: "translate(-50%, -50%)",
              backgroundColor: pureHueColor,
            }}
            className="w-4 h-4 rounded-full border-2 border-white dark:border-black shadow-lg pointer-events-none ring-1 ring-black/40"
          />

          {/* Centered 2D Saturation & Brightness Box */}
          <div
            ref={svBoxRef}
            onMouseDown={handleSVMouseDown}
            onTouchStart={handleSVTouchStart}
            style={{
              position: "absolute",
              top: `${CENTER - SV_HALF}px`,
              left: `${CENTER - SV_HALF}px`,
              width: `${SV_BOX_SIZE}px`,
              height: `${SV_BOX_SIZE}px`,
              backgroundColor: pureHueColor,
            }}
            className="rounded-lg shadow-inner cursor-crosshair overflow-hidden touch-none"
          >
            {/* White to Transparent (Saturation) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to right, #FFFFFF, transparent)",
              }}
            />
            {/* Transparent to Black (Brightness / Value) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to top, #000000, transparent)",
              }}
            />

            {/* SV Indicator Pin */}
            <div
              style={{
                position: "absolute",
                left: `${svThumbX}px`,
                top: `${svThumbY}px`,
                transform: "translate(-50%, -50%)",
                backgroundColor: normalizedValue,
              }}
              className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none ring-1 ring-black/50"
            />
          </div>
        </div>
      </div>

      {/* 3. RGB Value Sliders / Numbers */}
      <div className="grid grid-cols-3 gap-1.5 my-2.5 pt-2 border-t border-[#E5E7EA] dark:border-[#2C3136]">
        <div>
          <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-0.5 text-center">
            R
          </label>
          <input
            type="number"
            min={0}
            max={255}
            value={currentRgb.r}
            onChange={(e) => handleRgbChange("r", parseInt(e.target.value, 10))}
            className="w-full text-center h-7 rounded-lg border border-[#E5E7EA] dark:border-[#33383F] bg-[#F9FAFB] dark:bg-[#1D2126] font-mono text-[11px] font-bold"
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-0.5 text-center">
            G
          </label>
          <input
            type="number"
            min={0}
            max={255}
            value={currentRgb.g}
            onChange={(e) => handleRgbChange("g", parseInt(e.target.value, 10))}
            className="w-full text-center h-7 rounded-lg border border-[#E5E7EA] dark:border-[#33383F] bg-[#F9FAFB] dark:bg-[#1D2126] font-mono text-[11px] font-bold"
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-0.5 text-center">
            B
          </label>
          <input
            type="number"
            min={0}
            max={255}
            value={currentRgb.b}
            onChange={(e) => handleRgbChange("b", parseInt(e.target.value, 10))}
            className="w-full text-center h-7 rounded-lg border border-[#E5E7EA] dark:border-[#33383F] bg-[#F9FAFB] dark:bg-[#1D2126] font-mono text-[11px] font-bold"
          />
        </div>
      </div>

      {/* 4. Categorized Preset Palettes */}
      {showPalettes && (
        <div className="pt-2 border-t border-[#E5E7EA] dark:border-[#2C3136] space-y-2">
          {/* Category Tabs */}
          <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800/80 p-0.5 text-[9px] font-bold">
            {(["vibrant", "pastel", "neon", "earthy", "professional"] as PaletteCategory[]).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActivePalette(cat)}
                  className={`flex-1 py-1 rounded capitalize transition-all ${
                    activePalette === cat
                      ? "bg-white dark:bg-[#15171A] text-amber-500 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {cat.slice(0, 4)}
                </button>
              )
            )}
          </div>

          {/* Palette Swatches */}
          <div className="grid grid-cols-4 gap-1.5">
            {COLOR_PALETTES[activePalette].colors.map((hex) => {
              const isSelected = normalizedValue === hex.toUpperCase();
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => {
                    const norm = normalizeHex(hex);
                    const rgb = hexToRgb(norm);
                    setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
                    setHexInput(norm);
                    onChange(norm);
                  }}
                  style={{ backgroundColor: hex }}
                  title={`${COLOR_PALETTES[activePalette].name}: ${hex}`}
                  className={`h-6 rounded-md border transition-transform hover:scale-105 relative ${
                    isSelected
                      ? "ring-2 ring-amber-500 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900 scale-105 border-white dark:border-black"
                      : "border-black/10 dark:border-white/10"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COLOR PICKER FIELD (WITH TRIGGER & POPOVER)
// ==========================================

export interface ColorPickerFieldProps {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  className?: string;
  showPalettes?: boolean;
  align?: "left" | "right";
}

export function ColorPickerField({
  label,
  value,
  onChange,
  className = "",
  showPalettes = true,
  align = "left",
}: ColorPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const normalizedValue = useMemo(() => normalizeHex(value), [value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate unclipped viewport coordinates
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const POPOVER_WIDTH = 260;
    const POPOVER_HEIGHT = 410;

    let left = align === "right" ? rect.right - POPOVER_WIDTH : rect.left;
    if (left + POPOVER_WIDTH > window.innerWidth - 12) {
      left = window.innerWidth - POPOVER_WIDTH - 12;
    }
    if (left < 12) {
      left = 12;
    }

    let top = rect.bottom + 6;
    if (top + POPOVER_HEIGHT > window.innerHeight - 12 && rect.top - POPOVER_HEIGHT - 6 > 0) {
      top = rect.top - POPOVER_HEIGHT - 6;
    }

    setCoords({ top, left });
  }, [align]);

  // Recalculate on open, scroll, or resize
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Click outside listener to dismiss popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const popoverContent = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Color Picker"
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 99999,
      }}
      className="animate-in fade-in zoom-in-95 duration-100 shadow-2xl"
    >
      <CircularColorPicker
        value={normalizedValue}
        onChange={onChange}
        showPalettes={showPalettes}
      />
    </div>
  );

  return (
    <div ref={containerRef} className={`relative color-picker-field ${className}`}>
      {label && (
        <label className="text-[11px] font-semibold text-[#858B93] uppercase block mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button with Current Color Swatch & Hex */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-mono ${
          isOpen
            ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 text-amber-500"
            : "border-[#E5E7EA] dark:border-[#2C3136] bg-[#F9FAFB] dark:bg-[#15171A] hover:border-neutral-400 dark:hover:border-neutral-600 text-neutral-800 dark:text-neutral-200"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <div
            className="w-4 h-4 rounded-md border border-black/15 dark:border-white/20 shadow-xs shrink-0"
            style={{ backgroundColor: normalizedValue }}
          />
          <span className="font-bold tracking-wider">{normalizedValue}</span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Popover (Portaled to body to prevent any overflow clipping) */}
      {isOpen && (
        mounted && typeof document !== "undefined" ? (
          createPortal(popoverContent, document.body)
        ) : (
          <div
            role="dialog"
            aria-label="Color Picker"
            className={`absolute top-full mt-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <CircularColorPicker
              value={normalizedValue}
              onChange={onChange}
              showPalettes={showPalettes}
            />
          </div>
        )
      )}
    </div>
  );
}
