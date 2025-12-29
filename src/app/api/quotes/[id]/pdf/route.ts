import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function money(n: unknown) {
  const v = Number(n ?? 0);
  return `$${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      "id, customer_name, customer_address, status, subtotal, tax, total, line_items_json, created_at"
    )
    .eq("id", id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const items = Array.isArray(quote.line_items_json) ? quote.line_items_json : [];

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // US Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const left = 50;
  let y = 740;

  const drawLine = (text: string, size = 12, bold = false) => {
    page.drawText(text, { x: left, y, size, font: bold ? fontBold : font });
    y -= size + 6;
  };

  // Header
  drawLine("Forman Roofing Quote", 18, true);
  drawLine(`Quote ID: ${quote.id}`, 10);
  drawLine(`Date: ${new Date(quote.created_at).toLocaleString()}`, 10);
  drawLine(`Status: ${String(quote.status ?? "draft")}`, 10);

  y -= 10;

  // Customer
  drawLine(`Customer: ${quote.customer_name || "Customer"}`, 12, true);
  if (quote.customer_address) drawLine(`Address: ${quote.customer_address}`, 10);

  y -= 14;

  // Line items header
  drawLine("Line Items", 12, true);

  // Table header
  page.drawText("Item", { x: left, y, size: 10, font: fontBold });
  page.drawText("Qty", { x: 360, y, size: 10, font: fontBold });
  page.drawText("Amount", { x: 470, y, size: 10, font: fontBold });
  y -= 14;

  // Items (single page v1)
  for (const it of items) {
    if (y < 130) break; // v1: stop before bottom

    const name = String((it as any)?.name ?? (it as any)?.label ?? "Item");
    const qty = (it as any)?.quantity ?? (it as any)?.qty ?? "";
    const unit = (it as any)?.unit ?? "";
    const amount =
      (it as any)?.subtotal ??
      (it as any)?.total ??
      (it as any)?.amount ??
      (it as any)?.line_total ??
      (it as any)?.extended_price ??
      0;

    page.drawText(name.slice(0, 48), { x: left, y, size: 10, font });
    page.drawText(`${qty} ${unit}`.trim(), { x: 360, y, size: 10, font });
    page.drawText(money(amount), { x: 470, y, size: 10, font });
    y -= 14;
  }

  y -= 10;

  // Totals
  page.drawText(`Subtotal: ${money(quote.subtotal)}`, { x: 360, y, size: 10, font });
  y -= 14;
  page.drawText(`Tax: ${money(quote.tax)}`, { x: 360, y, size: 10, font });
  y -= 14;
  page.drawText(`Total: ${money(quote.total)}`, { x: 360, y, size: 12, font: fontBold });

  const bytes = await pdf.save(); // Uint8Array

  // ✅ Fix: convert to Buffer (BodyInit-compatible)
  const body = Buffer.from(bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quote-${quote.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
