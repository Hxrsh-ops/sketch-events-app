/**
 * Certificate Template Studio Types and Definitions
 */

export type CertificateFontFamily = "sans" | "serif" | "mono" | "cinematic" | "script";

export type CertificateFontWeight = "normal" | "medium" | "semibold" | "bold" | "extrabold";

export type CertificateAlignment = "left" | "center" | "right";

export type CertificateBindingKey =
  | "recipient_name"
  | "event_title"
  | "certificate_number"
  | "issue_date"
  | "event_date"
  | "completion_status"
  | "qr_code"
  | "custom";

export interface CertificateElement {
  id: string;
  type: "text" | "qr" | "badge" | "signature" | "mask";
  bindingKey: CertificateBindingKey;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isLocked?: boolean;
  isVisible?: boolean;
  text?: string;
  sampleValue?: string;
  fontSize?: number;
  fontWeight?: CertificateFontWeight;
  fontFamily?: CertificateFontFamily;
  color?: string;
  backgroundColor?: string;
  alignment?: CertificateAlignment;
  letterSpacing?: number;
  lineHeight?: number;
  rotation?: number;
  borderRadius?: number;
  opacity?: number;
}

export interface CertificateBackgroundImage {
  url: string;
  fit: "cover" | "contain";
  position?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  fileName?: string;
}

export interface CertificateDesignData {
  canvas: {
    width: number;
    height: number;
    unit: "px" | "pt" | "mm";
  };
  theme: {
    background: string;
    textColor: string;
    accentColor: string;
    borderColor: string;
    fontFamily: CertificateFontFamily;
  };
  backgroundImage?: CertificateBackgroundImage;
  elements: CertificateElement[];
  sampleData?: {
    recipientName?: string;
    eventTitle?: string;
    certificateNumber?: string;
    issueDate?: string;
    eventDate?: string;
  };
}

export const DEFAULT_CERTIFICATE_DESIGN: CertificateDesignData = {
  canvas: {
    width: 842,
    height: 595,
    unit: "px",
  },
  theme: {
    background: "#0D1117",
    textColor: "#FFFFFF",
    accentColor: "#E2B857",
    borderColor: "#30363D",
    fontFamily: "serif",
  },
  sampleData: {
    recipientName: "Aditi Rao",
    eventTitle: "Annual Design & Tech Summit 2026",
    certificateNumber: "SKETCH-CERT-2026-8849",
    issueDate: "November 21, 2026",
    eventDate: "November 21, 2026",
  },
  elements: [
    {
      id: "cert-org",
      type: "text",
      bindingKey: "custom",
      text: "SKETCH EVENT OPERATIONS PLATFORM",
      x: 71,
      y: 70,
      width: 700,
      height: 24,
      zIndex: 2,
      fontSize: 12,
      fontWeight: "bold",
      fontFamily: "sans",
      color: "#8B949E",
      alignment: "center",
      letterSpacing: 3,
    },
    {
      id: "cert-headline",
      type: "text",
      bindingKey: "custom",
      text: "CERTIFICATE OF APPRECIATION & PARTICIPATION",
      x: 71,
      y: 110,
      width: 700,
      height: 40,
      zIndex: 2,
      fontSize: 24,
      fontWeight: "extrabold",
      fontFamily: "cinematic",
      color: "#E2B857",
      alignment: "center",
      letterSpacing: 2,
    },
    {
      id: "cert-presented-label",
      type: "text",
      bindingKey: "custom",
      text: "THIS PROUD CREDENTIAL IS PRESENTED TO",
      x: 71,
      y: 185,
      width: 700,
      height: 20,
      zIndex: 2,
      fontSize: 11,
      fontWeight: "medium",
      fontFamily: "sans",
      color: "#8B949E",
      alignment: "center",
      letterSpacing: 2,
    },
    {
      id: "cert-recipient-name",
      type: "text",
      bindingKey: "recipient_name",
      text: "Participant Full Name",
      sampleValue: "Aditi Rao",
      x: 71,
      y: 220,
      width: 700,
      height: 56,
      zIndex: 3,
      fontSize: 34,
      fontWeight: "bold",
      fontFamily: "serif",
      color: "#FFFFFF",
      alignment: "center",
      letterSpacing: 1,
    },
    {
      id: "cert-for-label",
      type: "text",
      bindingKey: "custom",
      text: "FOR ACTIVE ATTENDANCE & EXCELLENCE IN",
      x: 71,
      y: 300,
      width: 700,
      height: 20,
      zIndex: 2,
      fontSize: 11,
      fontWeight: "medium",
      fontFamily: "sans",
      color: "#8B949E",
      alignment: "center",
      letterSpacing: 2,
    },
    {
      id: "cert-event-title",
      type: "text",
      bindingKey: "event_title",
      text: "Official Event Experience 2026",
      sampleValue: "Annual Design & Tech Summit 2026",
      x: 71,
      y: 330,
      width: 700,
      height: 40,
      zIndex: 2,
      fontSize: 22,
      fontWeight: "bold",
      fontFamily: "cinematic",
      color: "#F0F6FC",
      alignment: "center",
      letterSpacing: 1,
    },
    {
      id: "cert-number",
      type: "text",
      bindingKey: "certificate_number",
      text: "SKETCH-CERT-2026-8849",
      x: 71,
      y: 500,
      width: 320,
      height: 26,
      zIndex: 2,
      fontSize: 11,
      fontWeight: "medium",
      fontFamily: "mono",
      color: "#E2B857",
      alignment: "left",
    },
    {
      id: "cert-date",
      type: "text",
      bindingKey: "issue_date",
      text: "November 21, 2026",
      x: 450,
      y: 500,
      width: 320,
      height: 26,
      zIndex: 2,
      fontSize: 11,
      fontWeight: "medium",
      fontFamily: "sans",
      color: "#8B949E",
      alignment: "right",
    },
    {
      id: "cert-qr",
      type: "qr",
      bindingKey: "qr_code",
      x: 700,
      y: 400,
      width: 80,
      height: 80,
      zIndex: 3,
    },
  ],
};
