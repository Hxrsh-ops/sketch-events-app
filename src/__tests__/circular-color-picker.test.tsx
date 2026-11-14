import React from "react";
import ReactDOMServer from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import {
  CircularColorPicker,
  ColorPickerField,
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  isValidHex,
  normalizeHex,
  COLOR_PALETTES,
} from "@/components/ui/circular-color-picker";

describe("Circular Color Picker: Math & Conversions", () => {
  it("converts HEX to RGB accurately", () => {
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb("#E2B857")).toEqual({ r: 226, g: 184, b: 87 });
    expect(hexToRgb("#F00")).toEqual({ r: 255, g: 0, b: 0 }); // 3-digit expansion
  });

  it("converts RGB to HEX accurately", () => {
    expect(rgbToHex(255, 255, 255)).toBe("#FFFFFF");
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
    expect(rgbToHex(226, 184, 87)).toBe("#E2B857");
  });

  it("converts between RGB and HSV reversibly", () => {
    // Pure Red: (255, 0, 0) -> H: 0, S: 1, V: 1
    const hsvRed = rgbToHsv(255, 0, 0);
    expect(hsvRed.h).toBe(0);
    expect(hsvRed.s).toBe(1);
    expect(hsvRed.v).toBe(1);

    const rgbRed = hsvToRgb(hsvRed.h, hsvRed.s, hsvRed.v);
    expect(rgbRed).toEqual({ r: 255, g: 0, b: 0 });

    // SketchHUB Gold: #E2B857 -> (226, 184, 87)
    const hsvGold = rgbToHsv(226, 184, 87);
    const rgbGold = hsvToRgb(hsvGold.h, hsvGold.s, hsvGold.v);
    expect(Math.abs(rgbGold.r - 226)).toBeLessThanOrEqual(1);
    expect(Math.abs(rgbGold.g - 184)).toBeLessThanOrEqual(1);
    expect(Math.abs(rgbGold.b - 87)).toBeLessThanOrEqual(1);
  });

  it("validates and normalizes hex strings", () => {
    expect(isValidHex("#E2B857")).toBe(true);
    expect(isValidHex("#fff")).toBe(true);
    expect(isValidHex("invalid")).toBe(false);
    expect(isValidHex("#12345")).toBe(false);

    expect(normalizeHex("e2b857")).toBe("#E2B857");
    expect(normalizeHex("#fff")).toBe("#FFFFFF");
    expect(normalizeHex("xyz", "#000000")).toBe("#000000");
    expect(normalizeHex("not-a-hex", "#111315")).toBe("#111315");
  });

  it("includes all 5 required preset palettes with valid hex values", () => {
    const requiredPalettes = ["vibrant", "pastel", "neon", "earthy", "professional"] as const;

    for (const key of requiredPalettes) {
      const palette = COLOR_PALETTES[key];
      expect(palette).toBeDefined();
      expect(palette.name).toBeTruthy();
      expect(palette.colors.length).toBeGreaterThanOrEqual(8);
      for (const color of palette.colors) {
        expect(isValidHex(color)).toBe(true);
      }
    }
  });
});

describe("Circular Color Picker: Component Rendering & Markup", () => {
  it("renders CircularColorPicker markup with spectrum conic gradient and live swatch", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <CircularColorPicker value="#E2B857" onChange={() => {}} />
    );

    expect(html).toContain("circular-color-picker-root");
    expect(html).toContain("conic-gradient");
    expect(html).toContain("background-color:#E2B857");
    expect(html).toContain('value="#E2B857"');
    expect(html).toContain("Copy");
  });

  it("renders RGB channel numeric values in CircularColorPicker", () => {
    // #E2B857 -> r: 226, g: 184, b: 87
    const html = ReactDOMServer.renderToStaticMarkup(
      <CircularColorPicker value="#E2B857" onChange={() => {}} />
    );

    expect(html).toContain('value="226"');
    expect(html).toContain('value="184"');
    expect(html).toContain('value="87"');
  });

  it("renders preset palette category swatches", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <CircularColorPicker value="#E2B857" onChange={() => {}} showPalettes={true} />
    );

    // Initial palette is vibrant, should contain Vibrant colors
    expect(html).toContain("#EF4444");
    expect(html).toContain("#F97316");
    expect(html).toContain("#10B981");
  });

  it("ColorPickerField renders trigger with label, swatch, and formatted hex", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ColorPickerField
        label="Accent Color"
        value="#E2B857"
        onChange={() => {}}
      />
    );

    expect(html).toContain("Accent Color");
    expect(html).toContain("#E2B857");
    expect(html).toContain("background-color:#E2B857");
    expect(html).toContain('aria-haspopup="dialog"');
  });
});
