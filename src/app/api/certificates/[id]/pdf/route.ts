import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { verifyAdminSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { SketchRepository } from "@/lib/supabase/repository";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession();

    if (!session.isAuthenticated || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "certificates:issue")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!id || id.length > 128 || /[/\\]/.test(id)) {
      return NextResponse.json({ error: "Invalid certificate ID" }, { status: 400 });
    }

    const certificates = await SketchRepository.listCertificates();
    const certificate = certificates.find((item) => item.id === id);

    if (!certificate || certificate.status !== "issued") {
      return NextResponse.json(
        { error: "Issued certificate not found" },
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
      x: 20, y: 20, width: 802, height: 555,
      borderColor: dark, borderWidth: 3,
    });
    page.drawRectangle({
      x: 30, y: 30, width: 782, height: 535,
      borderColor: rgb(0.82, 0.84, 0.86), borderWidth: 1,
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
    centered(certificate.recipientName, 335, 29, bold);

    page.drawLine({
      start: { x: 220, y: 320 },
      end: { x: 622, y: 320 },
      thickness: 1,
      color: dark,
    });

    centered("FOR ATTENDING AND PARTICIPATING IN", 282, 12, regular, muted);
    centered(certificate.eventTitle, 242, 20, bold);

    const issuedDate = new Date(certificate.issuedAt);
    const dateText = Number.isNaN(issuedDate.getTime())
      ? "Date unavailable"
      : issuedDate.toLocaleDateString("en-GB", { timeZone: "UTC" });

    page.drawText(`ISSUED: ${dateText}`, {
      x: 85, y: 105, size: 11, font: regular, color: muted,
    });
    page.drawText(`CERTIFICATE ID: ${certificate.certificateNumber}`, {
      x: 85, y: 80, size: 11, font: bold, color: dark,
    });

    centered("SKETCH DIGITAL CREDENTIAL", 48, 9, regular, muted);

    const bytes = await pdf.save();

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.certificateNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[certificate-pdf] Generation failed:", error);
    return NextResponse.json(
      { error: "Unable to generate certificate PDF" },
      { status: 500 }
    );
  }
}
