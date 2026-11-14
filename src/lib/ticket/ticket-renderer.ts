import QRCode from "qrcode";
import { TicketDesignData } from "@/lib/validations/ticket-schemas";

export interface TicketRenderData {
  design?: TicketDesignData;
  event: {
    title: string;
    category?: string;
    venue?: string;
    venueMode?: string;
    startDate?: string;
    organizerName?: string;
  };
  attendee: {
    name: string;
    ticketNumber: string;
    teamName?: string | null;
  };
  qrPayload?: string;
}

export const DEFAULT_UNIFIED_TICKET_DESIGN: TicketDesignData = {
  layout: "cinematic-horizontal",
  canvas: { width: 800, height: 380, unit: "px" },
  theme: {
    background: "#111315",
    surface: "#181B1E",
    accent: "#E2B857",
    textColor: "#F3F4F6",
    secondaryTextColor: "#9CA3AF",
    borderColor: "#2C3136",
    fontFamily: "cinematic",
  },
  stub: {
    perforationPosition: "right",
    stubWidth: 240,
    badgeText: "ENTRY PASS",
    showPerforationDots: true,
  },
  qr: {
    size: 180,
    label: "SCAN TO VERIFY",
    rotating: false,
    refreshIntervalSec: 0,
  },
  elements: [],
};

const escapeXml = (str: string) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Generate a complete, valid XML SVG ticket matching the exact design and element placement.
 * Proportioned to exact ticket dimensions with zero extra page margins or blank areas.
 */
export async function generateUnifiedTicketSvg(data: TicketRenderData): Promise<string> {
  const design = data.design || DEFAULT_UNIFIED_TICKET_DESIGN;
  const { event, attendee } = data;
  const width = design.canvas?.width || 800;
  const height = design.canvas?.height || 380;
  const bg = design.theme?.background || "#111315";
  const surface = design.theme?.surface || "#181B1E";
  const accent = design.theme?.accent || "#E2B857";
  const textColor = design.theme?.textColor || "#F3F4F6";
  const secondaryColor = design.theme?.secondaryTextColor || "#9CA3AF";
  const borderColor = design.theme?.borderColor || "#2C3136";

  const stubWidth = design.stub?.stubWidth || 240;
  const mainPassWidth = width - stubWidth;

  const qrPayload = data.qrPayload || attendee.ticketNumber;
  let qrViewBox = "0 0 33 33";
  let qrPaths = "";

  try {
    const rawQr = await QRCode.toString(qrPayload, {
      type: "svg",
      margin: 1,
      color: { dark: "#17191C", light: "#FFFFFF" },
    });

    // Extract viewBox
    const vbMatch = rawQr.match(/viewBox="([^"]+)"/i);
    if (vbMatch) {
      qrViewBox = vbMatch[1];
    }

    // Extract only inner content (strip <svg> open and close tags, xml declaration, and doctype)
    qrPaths = rawQr
      .replace(/<\?xml[\s\S]*?\?>/gi, "")
      .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
      .replace(/<svg\b[^>]*>/i, "")
      .replace(/<\/svg>/i, "")
      .trim();
  } catch {
    qrPaths = `<rect width="33" height="33" fill="#FFFFFF"/><text x="16.5" y="18" font-size="5" fill="#000" text-anchor="middle">QR ERROR</text>`;
  }

  // Format date
  const displayDate = event.startDate
    ? new Date(event.startDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date & Time Available Upon Release";

  const admissionLabel = event.venueMode
    ? event.venueMode === "in-person"
      ? "IN-PERSON"
      : event.venueMode.toUpperCase()
    : "CONFIRMED";

  const titleFontFamily =
    design.theme?.fontFamily === "serif"
      ? "Georgia, serif"
      : design.theme?.fontFamily === "mono"
      ? "monospace"
      : "sans-serif";

  // Elements SVG if custom elements are configured
  const hasCustomElements = design.elements && design.elements.length > 0;
  const elementsSvg = hasCustomElements
    ? (design.elements || [])
        .filter((el) => el.type === "text" || el.type === "badge")
        .map((el) => {
          let value = el.text !== undefined && el.text !== null ? el.text : "";
          if (el.bindingKey === "event_title") value = event.title || el.sampleValue || el.text || "";
          else if (el.bindingKey === "attendee_name") value = attendee.name || el.sampleValue || el.text || "";
          else if (el.bindingKey === "ticket_number") value = attendee.ticketNumber || el.sampleValue || el.text || "";
          else if (el.bindingKey === "venue") value = event.venue || el.sampleValue || el.text || "Campus Venue";
          else if (el.bindingKey === "start_date") value = event.startDate ? displayDate : (el.sampleValue || el.text || displayDate);
          else if (el.bindingKey === "team_name") value = attendee.teamName !== undefined && attendee.teamName !== null ? attendee.teamName : (el.sampleValue || el.text || "");
          else if (el.bindingKey === "category") value = event.category || el.sampleValue || el.text || "GENERAL ADMISSION";
          else if (el.bindingKey === "status") value = event.venueMode ? admissionLabel : (el.sampleValue || el.text || admissionLabel);
          else if (el.bindingKey === "custom" || !el.bindingKey) value = el.text !== undefined && el.text !== null ? el.text : "";

          if (value === undefined || value === null) return "";

          const x = el.x;
          const y = el.y + (el.height ? Math.min(el.height * 0.78, (el.fontSize || 14) * 1.1) : (el.fontSize || 14));
          const textAnchor = el.alignment === "center" ? "middle" : el.alignment === "right" ? "end" : "start";
          const anchorX = el.alignment === "center" ? x + el.width / 2 : el.alignment === "right" ? x + el.width : x;

          const fontFamily =
            el.bindingKey === "ticket_number"
              ? "monospace"
              : design.theme?.fontFamily === "serif"
              ? "serif"
              : "sans-serif";

          const fontWeight =
            el.fontWeight === "bold" || el.fontWeight === "extrabold"
              ? "bold"
              : el.fontWeight === "semibold" || el.fontWeight === "medium"
              ? "600"
              : "normal";

          const letterSpacingAttr = el.letterSpacing ? ` letter-spacing="${el.letterSpacing}"` : "";
          const rotationAttr = el.rotation ? ` transform="rotate(${el.rotation} ${anchorX} ${y})"` : "";

          return `<text x="${anchorX}" y="${y}" font-family="${fontFamily}" font-size="${el.fontSize || 14}" font-weight="${fontWeight}" fill="${escapeXml(
            el.color || textColor
          )}" text-anchor="${textAnchor}"${letterSpacingAttr}${rotationAttr}>${escapeXml(value)}</text>`;
        })
        .join("\n    ")
    : "";

  // Background artwork element if present
  const hasBgImage = Boolean(design.backgroundImage?.url);
  let bgImageSvg = "";
  if (hasBgImage) {
    const opacity = design.backgroundImage!.overlayOpacity ?? 0.3;
    const fit = design.backgroundImage!.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice";
    bgImageSvg = `
    <image href="${escapeXml(design.backgroundImage!.url)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="${fit}" opacity="0.85" />
    <rect x="0" y="0" width="${width}" height="${height}" fill="${escapeXml(design.backgroundImage!.overlayColor || "#000000")}" fill-opacity="${opacity}" />`;
  }

  // Centered QR positioning in Stub
  const qrCardWidth = 140;
  const qrCardHeight = 140;
  const qrCardX = mainPassWidth + (stubWidth - qrCardWidth) / 2;
  const qrCardY = Math.round((height - qrCardHeight) / 2) - 2;
  const qrSize = 120;
  const qrX = qrCardX + (qrCardWidth - qrSize) / 2;
  const qrY = qrCardY + (qrCardHeight - qrSize) / 2;

  // Notch card outline path: Rounded 20px corners with semicircular cutout notches at perforation line
  const notchR = 10;
  const cardShapePath = `M 20,0
    H ${mainPassWidth - notchR}
    A ${notchR},${notchR} 0 0,0 ${mainPassWidth + notchR},0
    H ${width - 20}
    A 20,20 0 0,1 ${width},20
    V ${height - 20}
    A 20,20 0 0,1 ${width - 20},${height}
    H ${mainPassWidth + notchR}
    A ${notchR},${notchR} 0 0,0 ${mainPassWidth - notchR},${height}
    H 20
    A 20,20 0 0,1 0,${height - 20}
    V 20
    A 20,20 0 0,1 20,0 Z`;

  // Default rich starter pass layout (aligned to UnifiedTicketCard)
  const defaultContentSvg = `
    <!-- Brand Header -->
    <text x="40" y="48" font-family="sans-serif" font-size="11" font-weight="bold" letter-spacing="2" fill="${escapeXml(accent)}">${escapeXml((event.organizerName || "SKETCH").toUpperCase())} • OFFICIAL PASS</text>
    ${event.category ? `<line x1="200" y1="38" x2="200" y2="50" stroke="rgba(255,255,255,0.2)" stroke-width="1"/><text x="212" y="48" font-family="sans-serif" font-size="10" font-weight="600" letter-spacing="1.5" fill="${escapeXml(accent)}">${escapeXml(event.category.toUpperCase())}</text>` : ""}

    <!-- Serial Badge -->
    <rect x="${mainPassWidth - 175}" y="32" width="135" height="24" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <text x="${mainPassWidth - 107}" y="48" font-family="monospace" font-size="11" font-weight="600" fill="rgba(255,255,255,0.85)" text-anchor="middle">${escapeXml(attendee.ticketNumber)}</text>

    <!-- Event Title & Metadata -->
    <text x="40" y="118" font-family="${titleFontFamily}" font-size="24" font-weight="800" fill="#FFFFFF">${escapeXml(event.title)}</text>
    <text x="40" y="152" font-family="sans-serif" font-size="12" font-weight="500" fill="#CBD5E1">${escapeXml(displayDate)}</text>
    <text x="40" y="174" font-family="sans-serif" font-size="12" font-weight="500" fill="#94A3B8">${escapeXml(event.venue || "Campus Auditorium, Zone 1")}</text>

    <!-- Attendee Row -->
    <line x1="40" y1="${height - 85}" x2="${mainPassWidth - 40}" y2="${height - 85}" stroke="${escapeXml(borderColor)}" stroke-width="1"/>
    <text x="40" y="${height - 64}" font-family="sans-serif" font-size="9" font-weight="700" letter-spacing="1.5" fill="${escapeXml(secondaryColor)}">HOLDER</text>
    <text x="40" y="${height - 38}" font-family="sans-serif" font-size="17" font-weight="700" fill="#FFFFFF">${escapeXml(attendee.name)}</text>

    ${attendee.teamName ? `
    <text x="${Math.round(mainPassWidth * 0.52)}" y="${height - 64}" font-family="sans-serif" font-size="9" font-weight="700" letter-spacing="1.5" fill="${escapeXml(secondaryColor)}">TEAM</text>
    <text x="${Math.round(mainPassWidth * 0.52)}" y="${height - 38}" font-family="sans-serif" font-size="13" font-weight="600" fill="#E2E8F0">${escapeXml(attendee.teamName)}</text>
    ` : ""}

    <text x="${mainPassWidth - 40}" y="${height - 64}" font-family="sans-serif" font-size="9" font-weight="700" letter-spacing="1.5" fill="${escapeXml(secondaryColor)}" text-anchor="end">ACCESS</text>
    <text x="${mainPassWidth - 40}" y="${height - 38}" font-family="sans-serif" font-size="11" font-weight="700" letter-spacing="1.5" fill="${escapeXml(accent)}" text-anchor="end">${escapeXml(admissionLabel)}</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet">
  <defs>
    <clipPath id="ticketClip">
      <path d="${cardShapePath}"/>
    </clipPath>
    <radialGradient id="spotlight" cx="12%" cy="18%" r="48%">
      <stop offset="0%" stop-color="${escapeXml(accent)}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${escapeXml(accent)}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Ticket Body with Cutout Notches -->
  <g clip-path="url(#ticketClip)">
    <!-- Base Background & Texture -->
    <rect width="${width}" height="${height}" fill="${escapeXml(bg)}"/>
    ${!hasBgImage ? `<rect width="${width}" height="${height}" fill="url(#spotlight)"/>` : ""}
    ${bgImageSvg}

    <!-- Main Pass Content Layer -->
    ${hasCustomElements ? elementsSvg : defaultContentSvg}

    <!-- Stub Background Layer -->
    <rect x="${mainPassWidth}" y="0" width="${stubWidth}" height="${height}" fill="${escapeXml(surface)}" fill-opacity="${hasBgImage ? "0.80" : "0.45"}"/>

    <!-- Perforation Dividing Line -->
    <line x1="${mainPassWidth}" y1="${notchR + 4}" x2="${mainPassWidth}" y2="${height - notchR - 4}" stroke="${escapeXml(borderColor)}" stroke-dasharray="6,6" stroke-width="2"/>

    <!-- Stub Header -->
    <text x="${mainPassWidth + stubWidth / 2}" y="44" font-family="sans-serif" font-size="10" font-weight="800" letter-spacing="2" fill="${escapeXml(accent)}" text-anchor="middle">${escapeXml(design.stub?.badgeText || "ADMIT ONE")}</text>
    <text x="${mainPassWidth + stubWidth / 2}" y="60" font-family="monospace" font-size="8" font-weight="600" letter-spacing="1.5" fill="rgba(255,255,255,0.45)" text-anchor="middle">CHECK-IN PASS</text>

    <!-- Embedded High-Contrast QR Code Card -->
    <rect x="${qrCardX}" y="${qrCardY}" width="${qrCardWidth}" height="${qrCardHeight}" rx="12" fill="#FFFFFF" stroke="rgba(255,255,255,0.85)" stroke-width="1"/>
    <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${qrViewBox}">
      ${qrPaths}
    </svg>

    <!-- Stub Footer -->
    <text x="${mainPassWidth + stubWidth / 2}" y="${height - 40}" font-family="monospace" font-size="11" font-weight="bold" fill="${escapeXml(textColor)}" text-anchor="middle">${escapeXml(attendee.ticketNumber)}</text>
    <text x="${mainPassWidth + stubWidth / 2}" y="${height - 24}" font-family="sans-serif" font-size="8" font-weight="600" letter-spacing="1" fill="${escapeXml(secondaryColor)}" text-anchor="middle">PRESENT AT ADMISSION DESK</text>
  </g>

  <!-- Frame Border with Cutout Notches -->
  <path d="${cardShapePath}" fill="none" stroke="${escapeXml(borderColor)}" stroke-width="2"/>
</svg>`;
}
