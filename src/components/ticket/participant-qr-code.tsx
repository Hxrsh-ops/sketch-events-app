"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface ParticipantQrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Renders a real, scannable QR code data URL for a participant credential or ticket ID.
 */
export function ParticipantQrCode({
  value,
  size = 160,
  className = "",
}: ParticipantQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setDataUrl(null);
      return;
    }
    QRCode.toDataURL(value, {
      margin: 1,
      width: size * 2,
      color: { dark: "#17191C", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-lg bg-[#F4F5F6] text-[10px] font-mono text-[#858B93] ${className}`}
      >
        Generating QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR Pass ${value}`}
      width={size}
      height={size}
      className={`rounded-lg bg-white ${className}`}
    />
  );
}
