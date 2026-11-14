import QRCode from "qrcode";
import { CertificateDesignData } from "@/types/certificate-template";

export interface CertificateRenderProps {
  design: CertificateDesignData;
  certificate: {
    recipientName: string;
    eventTitle: string;
    certificateNumber: string;
    issuedAt: string;
    eventDate?: string;
  };
  verificationBaseUrl?: string;
}

const escapeXml = (str: string) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Generate a complete, valid XML SVG Certificate matching the exact design and element placement.
 */
export async function generateCertificateSvg(props: CertificateRenderProps): Promise<string> {
  const { design, certificate } = props;
  const width = design.canvas?.width || 842;
  const height = design.canvas?.height || 595;
  const bg = design.theme?.background || "#0D1117";
  const accent = design.theme?.accentColor || "#E2B857";
  const textColor = design.theme?.textColor || "#FFFFFF";
  const borderColor = design.theme?.borderColor || "#30363D";

  const verifyUrl = `${props.verificationBaseUrl || ""}/certificates/verify/${encodeURIComponent(
    certificate.certificateNumber
  )}`;

  let qrSvgClean = "";
  try {
    const rawQr = await QRCode.toString(verifyUrl, {
      type: "svg",
      margin: 1,
      color: { dark: "#0D1117", light: "#FFFFFF" },
    });
    qrSvgClean = rawQr
      .replace(/<\?xml[\s\S]*?\?>/gi, "")
      .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
      .replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
        const clean = attrs
          .replace(/\bwidth="[^"]*"/g, "")
          .replace(/\bheight="[^"]*"/g, "")
          .replace(/\bx="[^"]*"/g, "")
          .replace(/\by="[^"]*"/g, "")
          .replace(/\s+/g, " ")
          .trim();
        return `<svg ${clean}>`;
      });
  } catch {
    qrSvgClean = `<rect width="100%" height="100%" fill="#FFF"/><text x="50%" y="50%" font-size="8" fill="#000" text-anchor="middle">QR</text>`;
  }

  // Format date
  const displayDate = certificate.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "November 21, 2026";

  // Background artwork element if present
  let bgImageSvg = "";
  if (design.backgroundImage?.url) {
    const opacity = design.backgroundImage.overlayOpacity ?? 0.2;
    const fit = design.backgroundImage.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice";
    bgImageSvg = `
  <image href="${escapeXml(design.backgroundImage.url)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="${fit}" />
  <rect x="0" y="0" width="${width}" height="${height}" fill="${escapeXml(design.backgroundImage.overlayColor || "#000000")}" fill-opacity="${opacity}" />`;
  }

  const elementsSvg = (design.elements || [])
    .filter((el) => el.isVisible !== false)
    .map((el) => {
      const rotTransform = el.rotation
        ? ` transform="rotate(${el.rotation} ${el.x + el.width / 2} ${el.y + el.height / 2})"`
        : "";

      if (el.type === "mask") {
        return `
    <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.borderRadius || 0}" fill="${escapeXml(
          el.backgroundColor || el.color || "#FFFFFF"
        )}" fill-opacity="${el.opacity ?? 1}"${rotTransform} />`;
      }

      if (el.type === "qr") {
        return `
    <g transform="translate(${el.x}, ${el.y})"${rotTransform}>
      <rect width="${el.width}" height="${el.height}" rx="${el.borderRadius || 8}" fill="#FFFFFF"/>
      <g transform="translate(6, 6)">
        <svg width="${el.width - 12}" height="${el.height - 12}" viewBox="0 0 ${el.width - 12} ${el.height - 12}">
          ${qrSvgClean}
        </svg>
      </g>
    </g>`;
      }

      let value = typeof el.text === "string" ? el.text : "";
      if (el.bindingKey === "recipient_name") {
        value =
          typeof certificate.recipientName === "string"
            ? certificate.recipientName
            : typeof el.sampleValue === "string"
            ? el.sampleValue
            : typeof el.text === "string"
            ? el.text
            : "";
      } else if (el.bindingKey === "event_title") {
        value =
          typeof certificate.eventTitle === "string"
            ? certificate.eventTitle
            : typeof el.sampleValue === "string"
            ? el.sampleValue
            : typeof el.text === "string"
            ? el.text
            : "";
      } else if (el.bindingKey === "certificate_number") {
        const num =
          typeof certificate.certificateNumber === "string"
            ? certificate.certificateNumber
            : typeof el.sampleValue === "string"
            ? el.sampleValue
            : typeof el.text === "string"
            ? el.text
            : "";
        value = num ? (num.startsWith("ID:") ? num : `ID: ${num}`) : "";
      } else if (el.bindingKey === "issue_date") {
        value =
          typeof certificate.issuedAt === "string" && certificate.issuedAt
            ? displayDate
            : typeof el.sampleValue === "string"
            ? el.sampleValue
            : typeof el.text === "string"
            ? el.text
            : displayDate;
      } else if (el.bindingKey === "event_date") {
        value =
          typeof certificate.eventDate === "string"
            ? certificate.eventDate
            : typeof certificate.issuedAt === "string" && certificate.issuedAt
            ? displayDate
            : typeof el.sampleValue === "string"
            ? el.sampleValue
            : typeof el.text === "string"
            ? el.text
            : displayDate;
      }

      if (!value) return "";

      const x = el.x;
      const y = el.y + (el.height ? Math.min(el.height * 0.72, (el.fontSize || 14) * 1.1) : (el.fontSize || 14));
      const textAnchor = el.alignment === "center" ? "middle" : el.alignment === "right" ? "end" : "start";
      const anchorX = el.alignment === "center" ? x + el.width / 2 : el.alignment === "right" ? x + el.width : x;

      const fontFamily =
        el.fontFamily === "serif"
          ? "Georgia, 'Times New Roman', serif"
          : el.fontFamily === "mono"
          ? "monospace"
          : el.fontFamily === "cinematic"
          ? "Impact, sans-serif"
          : el.fontFamily === "script"
          ? "'Brush Script MT', cursive, sans-serif"
          : "sans-serif";

      const fontWeight =
        el.fontWeight === "bold" || el.fontWeight === "extrabold"
          ? "bold"
          : el.fontWeight === "semibold" || el.fontWeight === "medium"
          ? "600"
          : "normal";

      const letterSpacing = el.letterSpacing ? `letter-spacing="${el.letterSpacing}"` : "";

      let maskBgSvg = "";
      if (el.backgroundColor) {
        maskBgSvg = `
    <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.borderRadius || 0}" fill="${escapeXml(
          el.backgroundColor
        )}" fill-opacity="${el.opacity ?? 1}"${rotTransform} />`;
      }

      return `${maskBgSvg}
    <text x="${anchorX}" y="${y}" font-family="${fontFamily}" font-size="${el.fontSize || 14}" font-weight="${fontWeight}" fill="${escapeXml(
        el.color || textColor
      )}" text-anchor="${textAnchor}" ${letterSpacing}${rotTransform}>${escapeXml(value)}</text>`;
    })
    .join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Outer Background -->
  <rect width="${width}" height="${height}" fill="${escapeXml(bg)}"/>
  ${bgImageSvg}

  <!-- Certificate Border Frame -->
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="12" fill="none" stroke="${escapeXml(accent)}" stroke-width="2" opacity="0.8"/>
  <rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="8" fill="none" stroke="${escapeXml(borderColor)}" stroke-width="1" opacity="0.5"/>

  <!-- Dynamic Certificate Content -->
  ${elementsSvg}
</svg>`;
}
