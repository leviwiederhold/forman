import { PDFDocument, StandardFonts } from "pdf-lib";

export async function generateQuotePDF(quote: any) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let y = 750;

  page.drawText("Roofing Estimate", { x: 50, y, font, size: 18 });
  y -= 30;

  page.drawText(`Customer: ${quote.customer_name}`, { x: 50, y, font });
  y -= 20;

  quote.pricing.line_items.forEach((it: any) => {
    page.drawText(
      `${it.name} — $${it.subtotal.toFixed(2)}`,
      { x: 50, y, font }
    );
    y -= 16;
  });

  y -= 20;
  page.drawText(`Total: $${quote.pricing.total.toFixed(2)}`, {
    x: 50,
    y,
    font,
    size: 14,
  });

  return await pdf.save();
}
