// src/app/api/quotes/[id]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateQuotePDF } from "@/trades/roofing/proposal";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (!quote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfBytes = await generateQuotePDF(quote);

// Force to a normal ArrayBuffer by copying
const safeBytes = new Uint8Array(pdfBytes);

return new NextResponse(safeBytes, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": "attachment; filename=quote.pdf",
  },
});
}