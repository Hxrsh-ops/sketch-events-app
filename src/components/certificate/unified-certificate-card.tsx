"use client";

import React, { useState } from "react";
import { QrCode, Award, ShieldCheck } from "lucide-react";
import { CertificateDesignData, CertificateElement } from "@/types/certificate-template";

export interface UnifiedCertificateCardProps {
  design: CertificateDesignData;
  certificate: {
    recipientName: string;
    eventTitle: string;
    certificateNumber: string;
    issuedAt: string;
    eventDate?: string;
  };
  showVariableKeys?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
  interactive?: boolean;
  className?: string;
}

export function UnifiedCertificateCard({
  design,
  certificate,
  showVariableKeys = false,
  selectedElementId,
  onSelectElement,
  interactive = false,
  className = "",
}: UnifiedCertificateCardProps) {
  const [bgFailed, setBgFailed] = useState(false);

  const canvasWidth = design.canvas?.width || 842;
  const canvasHeight = design.canvas?.height || 595;
  const bg = design.theme?.background || "#0D1117";
  const accent = design.theme?.accentColor || "#E2B857";
  const textColor = design.theme?.textColor || "#FFFFFF";
  const borderColor = design.theme?.borderColor || "#30363D";

  const hasBgImage = Boolean(design.backgroundImage?.url && !bgFailed);

  const displayDate = certificate.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "November 21, 2026";

  const getElementValue = (el: CertificateElement) => {
    if (showVariableKeys && el.bindingKey && el.bindingKey !== "custom") {
      return `{{${el.bindingKey}}}`;
    }
    switch (el.bindingKey) {
      case "recipient_name":
        if (typeof certificate.recipientName === "string") return certificate.recipientName;
        if (typeof el.sampleValue === "string") return el.sampleValue;
        if (typeof el.text === "string") return el.text;
        return "Participant Full Name";
      case "event_title":
        if (typeof certificate.eventTitle === "string") return certificate.eventTitle;
        if (typeof el.sampleValue === "string") return el.sampleValue;
        if (typeof el.text === "string") return el.text;
        return "Official Event Experience";
      case "certificate_number": {
        const num =
          typeof certificate.certificateNumber === "string"
            ? certificate.certificateNumber
            : typeof el.sampleValue === "string"
            ? el.sampleValue
            : typeof el.text === "string"
            ? el.text
            : "";
        if (!num) return "";
        return num.startsWith("ID:") ? num : `ID: ${num}`;
      }
      case "issue_date":
        if (typeof certificate.issuedAt === "string" && certificate.issuedAt) return displayDate;
        if (typeof el.sampleValue === "string") return el.sampleValue;
        if (typeof el.text === "string") return el.text;
        return displayDate;
      case "event_date":
        if (typeof certificate.eventDate === "string") return certificate.eventDate;
        if (typeof certificate.issuedAt === "string" && certificate.issuedAt) return displayDate;
        if (typeof el.sampleValue === "string") return el.sampleValue;
        if (typeof el.text === "string") return el.text;
        return displayDate;
      case "custom":
      default:
        return typeof el.text === "string" ? el.text : "";
    }
  };

  const getFontFamily = (font?: string) => {
    switch (font) {
      case "serif":
        return "Georgia, 'Times New Roman', serif";
      case "mono":
        return "ui-monospace, SFMono-Regular, Menlo, monospace";
      case "cinematic":
        return "Impact, 'Arial Black', sans-serif";
      case "script":
        return "'Brush Script MT', cursive, sans-serif";
      case "sans":
      default:
        return "inherit";
    }
  };

  return (
    <div
      className={`unified-certificate-root relative select-none shrink-0 overflow-hidden rounded-2xl shadow-2xl transition-all ${className}`}
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        backgroundColor: bg,
        borderColor,
      }}
    >
      {/* Background Artwork Layer */}
      {hasBgImage && (
        <div
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
          style={{
            backgroundImage: `url(${design.backgroundImage!.url})`,
            backgroundSize: design.backgroundImage!.fit || "contain",
            backgroundPosition: design.backgroundImage!.position || "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Readability Contrast Overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: design.backgroundImage!.overlayColor || "#000000",
              opacity: design.backgroundImage!.overlayOpacity ?? 0.2,
            }}
          />
        </div>
      )}

      {/* Decorative Border Frame (When no custom background or as watermark) */}
      <div
        className="absolute inset-5 rounded-xl pointer-events-none z-10 border-2"
        style={{ borderColor: accent, opacity: 0.6 }}
      />
      <div
        className="absolute inset-7 rounded-lg pointer-events-none z-10 border"
        style={{ borderColor, opacity: 0.4 }}
      />

      {/* Dynamic Elements Layer */}
      <div className="absolute inset-0 z-20">
        {(design.elements || []).map((el) => {
          if (el.isVisible === false) return null;

          const isSelected = interactive && el.id === selectedElementId;

          if (el.type === "mask") {
            return (
              <div
                key={el.id}
                onClick={interactive ? (e) => { e.stopPropagation(); onSelectElement?.(el.id); } : undefined}
                style={{
                  position: "absolute",
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  zIndex: el.zIndex || 1,
                  backgroundColor: el.backgroundColor || el.color || "#FFFFFF",
                  borderRadius: `${el.borderRadius || 0}px`,
                  opacity: el.opacity ?? 1,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                  transformOrigin: "center center",
                }}
                className={`transition-all ${interactive ? "cursor-move" : ""} ${
                  isSelected
                    ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-neutral-900"
                    : interactive
                    ? "hover:ring-1 hover:ring-amber-500/40"
                    : ""
                }`}
              />
            );
          }

          if (el.type === "qr") {
            return (
              <div
                key={el.id}
                onClick={interactive ? (e) => { e.stopPropagation(); onSelectElement?.(el.id); } : undefined}
                style={{
                  position: "absolute",
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  zIndex: el.zIndex || 2,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                  transformOrigin: "center center",
                }}
                className={`flex items-center justify-center bg-white p-2 rounded-xl shadow-lg border border-neutral-200 ${
                  interactive ? "cursor-move" : ""
                } ${isSelected ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-neutral-900" : ""}`}
              >
                <QrCode className="h-full w-full text-neutral-900" />
              </div>
            );
          }

          const value = getElementValue(el);

          return (
            <div
              key={el.id}
              onClick={interactive ? (e) => { e.stopPropagation(); onSelectElement?.(el.id); } : undefined}
              style={{
                position: "absolute",
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: `${el.width}px`,
                height: `${el.height}px`,
                zIndex: el.zIndex || 2,
                color: el.color || textColor,
                fontSize: `${el.fontSize || 14}px`,
                fontWeight: el.fontWeight || "normal",
                fontFamily: getFontFamily(el.fontFamily),
                textAlign: el.alignment || "center",
                letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                lineHeight: el.lineHeight ? `${el.lineHeight}` : undefined,
                backgroundColor: el.backgroundColor,
                borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                transformOrigin: "center center",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  el.alignment === "left"
                    ? "flex-start"
                    : el.alignment === "right"
                    ? "flex-end"
                    : "center",
              }}
              className={`transition-all ${interactive ? "cursor-move select-none" : ""} ${
                isSelected
                  ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-neutral-900 rounded bg-amber-500/10"
                  : interactive
                  ? "hover:ring-1 hover:ring-amber-500/40 rounded"
                  : ""
              }`}
            >
              <span className="truncate w-full">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
