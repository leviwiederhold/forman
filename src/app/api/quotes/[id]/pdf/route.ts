import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
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

function asNumber(n: unknown) {
  const v = Number(n ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function asString(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function fmtDate(iso: unknown) {
  if (typeof iso !== "string") return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function asLineItem(v: unknown): LineItem {
  return typeof v === "object" && v !== null ? (v as LineItem) : {};
}

function lineItemAmount(item: LineItem) {
  return asNumber(item.subtotal ?? item.total ?? item.amount ?? item.line_total ?? item.extended_price ?? 0);
}

function lineItemQty(item: LineItem) {
  const qty = item.quantity ?? item.qty;
  return qty == null ? "-" : String(qty);
}

function lineItemUnit(item: LineItem) {
  if (typeof item.unit === "string") return item.unit;
  return item.unit == null ? "" : String(item.unit);
}

function lineItemName(item: LineItem) {
  const raw = item.name ?? item.label ?? "Item";
  return String(raw || "Item");
}

function drawTextRight(
  page: PDFPage,
  text: string,
  xRight: number,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0)
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: xRight - width, y, size, font, color });
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
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    return NextResponse.json({ error: `Quote lookup failed: ${error.message}` }, { status: 500 });
  }

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  const quoteId = asString(quote.id, id);

  const itemsRaw: unknown[] = Array.isArray(quote.line_items_json) ? quote.line_items_json : [];

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // US Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const marginX = 46;
  const blue = rgb(0.03, 0.27, 0.56);
  const textPrimary = rgb(0.1, 0.13, 0.17);
  const textMuted = rgb(0.35, 0.39, 0.45);
  const lightBlue = rgb(0.9, 0.94, 1);

  const createdDate = fmtDate(quote.created_at);
  const dueDate =
    typeof quote.expires_at === "string" && quote.expires_at ? fmtDate(quote.expires_at) : createdDate;

  page.drawText("Forman Roofing Inc.", {
    x: marginX,
    y: 735,
    size: 16,
    font: fontBold,
    color: textPrimary,
  });
  page.drawText("1234 Company St,", {
    x: marginX,
    y: 713,
    size: 10.5,
    font,
    color: textMuted,
  });
  page.drawText("Company Town, ST 12345", {
    x: marginX,
    y: 697,
    size: 10.5,
    font,
    color: textMuted,
  });

  page.drawRectangle({
    x: 334,
    y: 693,
    width: 232,
    height: 62,
    borderColor: blue,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  page.drawText("Company Logo", {
    x: 410,
    y: 720,
    size: 12,
    font: fontBold,
    color: blue,
  });

  page.drawText("QUOTE", {
    x: 456,
    y: 612,
    size: 42,
    font: fontBold,
    color: blue,
  });

  page.drawText("Bill To", {
    x: marginX,
    y: 575,
    size: 13,
    font: fontBold,
    color: blue,
  });
  page.drawText(String(quote.customer_name || "Customer Name"), {
    x: marginX,
    y: 548,
    size: 18,
    font: fontBold,
    color: textPrimary,
  });
  page.drawText(asString(quote.customer_address, "Customer Address"), {
    x: marginX,
    y: 528,
    size: 11,
    font,
    color: textMuted,
  });
  page.drawText("Customer Town, ST 12345", {
    x: marginX,
    y: 512,
    size: 11,
    font,
    color: textMuted,
  });

  const metaXLabel = 460;
  const metaXValue = 565;
  page.drawText("Quote #", { x: metaXLabel - 50, y: 555, size: 11, font: fontBold, color: blue });
  drawTextRight(page, quoteId.slice(0, 7).toUpperCase(), metaXValue, 555, fontBold, 11, textPrimary);
  page.drawText("Quote date", { x: metaXLabel - 66, y: 532, size: 11, font: fontBold, color: blue });
  drawTextRight(page, createdDate, metaXValue, 532, fontBold, 11, textPrimary);
  page.drawText("Due date", { x: metaXLabel - 54, y: 509, size: 11, font: fontBold, color: blue });
  drawTextRight(page, dueDate, metaXValue, 509, fontBold, 11, textPrimary);

  const tableLeft = marginX;
  const tableRight = 566;
  const tableWidth = tableRight - tableLeft;
  const tableTop = 468;
  const headerH = 26;
  const qtyCol = tableLeft + 24;
  const descCol = tableLeft + 58;
  const unitPriceRight = tableRight - 84;
  const amountRight = tableRight - 4;

  page.drawRectangle({
    x: tableLeft,
    y: tableTop - headerH,
    width: tableWidth,
    height: headerH,
    color: blue,
  });
  page.drawText("QTY", { x: qtyCol - 16, y: tableTop - 17, size: 12, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Description", { x: descCol - 20, y: tableTop - 17, size: 12, font: fontBold, color: rgb(1, 1, 1) });
  drawTextRight(page, "Unit Price", unitPriceRight, tableTop - 17, fontBold, 12, rgb(1, 1, 1));
  drawTextRight(page, "Amount", amountRight, tableTop - 17, fontBold, 12, rgb(1, 1, 1));

  const items = itemsRaw.map(asLineItem);
  const rowHeight = 28;
  let y = tableTop - headerH - 16;
  for (let i = 0; i < items.length && i < 12; i += 1) {
    const it = items[i];
    const amount = lineItemAmount(it);
    const qtyStr = lineItemQty(it);
    const qtyNum = Number(qtyStr);
    const unitPrice = Number.isFinite(qtyNum) && qtyNum > 0 ? amount / qtyNum : null;

    if (i % 2 === 1) {
      page.drawRectangle({
        x: tableLeft,
        y: y - 5,
        width: tableWidth,
        height: rowHeight - 2,
        color: lightBlue,
      });
    }

    drawTextRight(page, qtyStr, qtyCol + 14, y + 5, fontBold, 10.5, textPrimary);
    page.drawText(lineItemName(it).slice(0, 50), {
      x: descCol - 20,
      y: y + 5,
      size: 10.5,
      font,
      color: textPrimary,
    });
    drawTextRight(
      page,
      unitPrice == null ? "-" : money(unitPrice),
      unitPriceRight,
      y + 5,
      font,
      10.5,
      textPrimary
    );
    drawTextRight(page, money(amount), amountRight, y + 5, fontBold, 10.5, textPrimary);
    y -= rowHeight;
  }

  page.drawLine({
    start: { x: tableLeft, y: y + 12 },
    end: { x: tableRight, y: y + 12 },
    thickness: 1,
    color: blue,
  });

  const subtotal = asNumber(quote.subtotal);
  const tax = asNumber(quote.tax);
  const total = asNumber(quote.total);
  const totalsY = y - 2;
  const totalsLeft = 335;

  page.drawText("Subtotal", { x: totalsLeft, y: totalsY - 4, size: 11, font, color: textPrimary });
  drawTextRight(page, money(subtotal), amountRight, totalsY - 4, font, 11, textPrimary);
  page.drawText("Sales Tax", { x: totalsLeft, y: totalsY - 30, size: 11, font, color: textPrimary });
  drawTextRight(page, money(tax), amountRight, totalsY - 30, font, 11, textPrimary);

  page.drawLine({
    start: { x: totalsLeft - 4, y: totalsY - 42 },
    end: { x: tableRight, y: totalsY - 42 },
    thickness: 1,
    color: blue,
  });
  page.drawRectangle({
    x: totalsLeft - 4,
    y: totalsY - 70,
    width: tableRight - (totalsLeft - 4),
    height: 28,
    color: lightBlue,
  });
  page.drawText("Total (USD)", { x: totalsLeft, y: totalsY - 61, size: 13, font: fontBold, color: blue });
  drawTextRight(page, money(total), amountRight, totalsY - 61, fontBold, 13, blue);
  page.drawLine({
    start: { x: totalsLeft - 4, y: totalsY - 70 },
    end: { x: tableRight, y: totalsY - 70 },
    thickness: 1,
    color: blue,
  });

  page.drawText("Terms and Conditions", {
    x: marginX,
    y: 170,
    size: 13,
    font: fontBold,
    color: blue,
  });
  page.drawText("Payment is due in 14 days", {
    x: marginX,
    y: 146,
    size: 11,
    font,
    color: textPrimary,
  });
  page.drawText("Please make checks payable to: Forman Roofing Inc.", {
    x: marginX,
    y: 126,
    size: 11,
    font,
    color: textPrimary,
  });

  page.drawLine({
    start: { x: 354, y: 64 },
    end: { x: 566, y: 64 },
    thickness: 1,
    color: blue,
  });
  page.drawText("customer signature", {
    x: 435,
    y: 46,
    size: 10.5,
    font,
    color: blue,
  });

  const bytes = await pdf.save();
  const body = Buffer.from(bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quote-${quoteId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
