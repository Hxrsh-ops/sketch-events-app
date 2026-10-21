import { NextResponse } from "next/server";
import { SketchRepository } from "@/lib/supabase/repository";

export async function GET() {
  const isPreview = SketchRepository.isPreview();
  try {
    const count = await SketchRepository.getEventCount();
    return NextResponse.json({ count, isPreview, success: true });
  } catch (error: any) {
    return NextResponse.json(
      { count: null, isPreview, error: error.message || "Failed to count events" },
      { status: 500 }
    );
  }
}
