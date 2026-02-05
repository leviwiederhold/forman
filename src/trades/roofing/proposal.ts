import { PDFDocument, StandardFonts } from "pdf-lib";
import type { RoofingPricingResult } from "./pricing";
import type { RoofingQuoteArgs } from "./schema";

type StoredQuote = {
  id: string;
  inputs_json: RoofingQuoteArgs["inputs"];
  selections_json: RoofingQuoteArgs["selections"];
  pricing_json: RoofingPricingResult;
};

export async function generateQuotePDF(quote: StoredQuote): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const { height } = page.getSize();
  let y = height - 40;

  const draw = (text: string, size = 12) => {
    page.drawText(text, {
      x: 40,
      y,
      size,
      font,
    });
    y -= size + 6;
  };

  draw("Forman Roofing Quote", 18);
  y -= 10;

  draw(`Customer: ${quote.inputs_json.customer_name}`);
  if (quote.inputs_json.customer_address) {
    draw(`Address: ${quote.inputs_json.customer_address}`);
  }

  y -= 10;
  draw("Line Items", 14);
  y -= 6;

  for (const item of quote.pricing_json.line_items) {
    draw(
      `${item.name} — ${item.quantity} ${item.unit} @ $${item.unit_price.toFixed(
        2
      )} = $${item.subtotal.toFixed(2)}`,
      11
    );
  }

  y -= 10;
  draw(`Subtotal: $${quote.pricing_json.subtotal.toFixed(2)}`);
  draw(`Markup: $${quote.pricing_json.markup_amount.toFixed(2)}`);
  draw(`Total: $${quote.pricing_json.total.toFixed(2)}`, 14);

  return await pdf.save();
}
