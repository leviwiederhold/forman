import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LineItem = {
  name?: unknown;
  label?: unknown;
  quantity?: unknown;
  qty?: unknown;
  unit?: unknown;
  subtotal?: unknown;
  total?: unknown;
  amount?: unknown;
  line_total?: unknown;
  extended_price?: unknown;
};

function money(n: unknown) {
  const v = Number(n ?? 0);
  return `$${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
}

function asLineItem(v: unknown): LineItem {
  return typeof v === "object" && v !== null ? (v as LineItem) : {};
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      "id, customer_name, customer_address, status, subtotal, tax, total, line_items_json, created_at"
    )
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const itemsRaw: unknown[] = Array.isArray(quote.line_items_json) ? quote.line_items_json : [];

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const left = 50;
  let y = 740;

  const drawLine = (text: string, size = 12, bold = false) => {
    page.drawText(text, { x: left, y, size, font: bold ? fontBold : font });
    y -= size + 6;
  };

  drawLine("Forman Roofing Quote", 18, true);
  drawLine(`Quote ID: ${quote.id}`, 10);
  drawLine(`Date: ${new Date(quote.created_at).toLocaleString()}`, 10);
  drawLine(`Status: ${String(quote.status ?? "draft")}`, 10);

  y -= 10;
  drawLine(`Customer: ${quote.customer_name || "Customer"}`, 12, true);
  if (quote.customer_address) drawLine(`Address: ${String(quote.customer_address)}`, 10);

  y -= 14;
  drawLine("Line Items", 12, true);

  page.drawText("Item", { x: left, y, size: 10, font: fontBold });
  page.drawText("Qty", { x: 360, y, size: 10, font: fontBold });
  page.drawText("Amount", { x: 470, y, size: 10, font: fontBold });
  y -= 14;

  for (const raw of itemsRaw) {
    if (y < 130) break;

    const it = asLineItem(raw);
    const name = String(it.name ?? it.label ?? "Item");

    const qtyVal = it.quantity ?? it.qty;
    const qty =
      typeof qtyVal === "number" || typeof qtyVal === "string" ? String(qtyVal) : "";

    const unit = typeof it.unit === "string" ? it.unit : String(it.unit ?? "");

    const amount =
      it.subtotal ?? it.total ?? it.amount ?? it.line_total ?? it.extended_price ?? 0;

    page.drawText(name.slice(0, 48), { x: left, y, size: 10, font });
    page.drawText(`${qty} ${unit}`.trim(), { x: 360, y, size: 10, font });
    page.drawText(money(amount), { x: 470, y, size: 10, font });
    y -= 14;
  }

  y -= 10;
  page.drawText(`Subtotal: ${money(quote.subtotal)}`, { x: 360, y, size: 10, font });
  y -= 14;
  page.drawText(`Tax: ${money(quote.tax)}`, { x: 360, y, size: 10, font });
  y -= 14;
  page.drawText(`Total: ${money(quote.total)}`, { x: 360, y, size: 12, font: fontBold });

  const bytes = await pdf.save();
  const body = Buffer.from(bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quote-${quote.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
