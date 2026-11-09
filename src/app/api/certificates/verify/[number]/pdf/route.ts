import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SketchRepository } from "@/lib/supabase/repository";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const cleanNumber = (number || "").trim();

    if (!cleanNumber || cleanNumber.length > 128 || /[/\\]/.test(cleanNumber)) {
      return NextResponse.json({ error: "Invalid certificate number format" }, { status: 400 });
    }

    const verified = await SketchRepository.verifyCertificate(cleanNumber);

    if (!verified || !verified.isValid || verified.status !== "issued") {
      return NextResponse.json(
        { error: "Valid issued certificate not found" },
        { status: 404 }
      );
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([842, 595]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const dark = rgb(0.09, 0.10, 0.12);
    const muted = rgb(0.40, 0.42, 0.45);

    page.drawRectangle({
      x: 20,
      y: 20,
      width: 802,
      height: 555,
      borderColor: dark,
      borderWidth: 3,
    });
    page.drawRectangle({
      x: 30,
      y: 30,
      width: 782,
      height: 535,
      borderColor: rgb(0.82, 0.84, 0.86),
      borderWidth: 1,
    });

    const centered = (
      text: string,
      y: number,
      size: number,
      font = regular,
      color = dark
    ) => {
      const safeText = text.replace(/[\r\n\t]/g, " ").slice(0, 180);
      const width = font.widthOfTextAtSize(safeText, size);
      page.drawText(safeText, {
        x: Math.max(40, (842 - width) / 2),
        y,
        size,
        font,
        color,
      });
    };

    centered("SKETCH EVENT OPERATIONS PLATFORM", 505, 15, bold, muted);
    centered("CERTIFICATE OF PARTICIPATION", 445, 27, bold);
    centered("THIS CERTIFICATE IS PRESENTED TO", 395, 12, regular, muted);
    centered(verified.recipientName || "Participant", 335, 29, bold);

    page.drawLine({
      start: { x: 220, y: 320 },
      end: { x: 622, y: 320 },
      thickness: 1,
      color: dark,
    });

    centered("FOR ATTENDING AND PARTICIPATING IN", 282, 12, regular, muted);
    centered(verified.eventTitle || "Official Event", 242, 20, bold);

    const issuedDate = verified.issuedAt ? new Date(verified.issuedAt) : new Date();
    const dateText = Number.isNaN(issuedDate.getTime())
      ? "Date unavailable"
      : issuedDate.toLocaleDateString("en-GB", { timeZone: "UTC" });

    page.drawText(`ISSUED: ${dateText}`, {
      x: 85,
      y: 105,
      size: 11,
      font: regular,
      color: muted,
    });
    page.drawText(`CERTIFICATE ID: ${verified.certificateNumber}`, {
      x: 85,
      y: 80,
      size: 11,
      font: bold,
      color: dark,
    });

    centered("SKETCH DIGITAL CREDENTIAL • OFFICIALLY VERIFIED", 48, 9, regular, muted);

    const bytes = await pdf.save();

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${verified.certificateNumber?.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[public-certificate-pdf] Generation failed:", error);
    return NextResponse.json(
      { error: "Unable to generate certificate PDF" },
      { status: 500 }
    );
  }
}
