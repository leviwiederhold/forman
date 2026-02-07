// src/trades/roofing/pricing.ts
import type {
  RoofingQuoteArgs,
  RoofingQuoteInputs,
  RoofingQuoteSelections,
  RoofingRateCard,
  OneTimeCustomItem,
} from "./schema";

export type QuoteLineItem = {
  name: string;
  category: "core" | "tearoff" | "optional" | "custom" | "adjustment";
  quantity: number;
  unit: string; // "sq", "LF", "each", etc.
  unit_price: number;
  subtotal: number;
  is_custom: boolean;
};

export type SavedCustomItem = {
  id: string;
  name: string;
  pricing_type: "flat" | "per_unit";
  unit_label: string | null;
  unit_price: number;
  taxable: boolean;
};

export type RoofingPricingResult = {
  line_items: QuoteLineItem[];
  subtotal: number;
  markup_percent: number;
  markup_amount: number;
  total_before_minimum: number;
  total: number;
  squares: number;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function sqftToSquares(sqft: number) {
  return sqft / 100;
}

export function normalizeSquares(inputs: RoofingQuoteInputs): number {
  const v = inputs.roof_size_value;
  if (inputs.roof_size_unit === "squares") return v;
  return sqftToSquares(v);
}

function li(params: Omit<QuoteLineItem, "subtotal">): QuoteLineItem {
  const subtotal = round2(params.quantity * params.unit_price);
  return { ...params, subtotal };
}

/**
 * Canonical pricing function for Roofing v1
 */
export function calculateRoofingQuote(params: {
  args: RoofingQuoteArgs;
  rateCard: RoofingRateCard;
  savedCustomItems: SavedCustomItem[]; // pass all; we filter by IDs inside
}): RoofingPricingResult {
  const { args, rateCard, savedCustomItems } = params;
  const inputs: RoofingQuoteInputs = args.inputs;
  const selections: RoofingQuoteSelections = args.selections;

  const squaresRaw = normalizeSquares(inputs);
  const squares = round2(squaresRaw);

  const line_items: QuoteLineItem[] = [];

  // Core always included
  line_items.push(
    li({
      name: "Labor",
      category: "core",
      quantity: squares,
      unit: "sq",
      unit_price: Number(rateCard.labor_per_square ?? 0),
      is_custom: false,
    })
  );

  line_items.push(
    li({
      name: "Shingles",
      category: "core",
      quantity: squares,
      unit: "sq",
      unit_price: Number(rateCard.shingles_per_square ?? 0),
      is_custom: false,
    })
  );

  line_items.push(
    li({
      name: "Underlayment",
      category: "core",
      quantity: squares,
      unit: "sq",
      unit_price: Number(rateCard.underlayment_per_square ?? 0),
      is_custom: false,
    })
  );

  // Tear-off / disposal (v1: only if tearoff=true and checkbox selected)
  if (inputs.tearoff && selections.tearoff_selected) {
    line_items.push(
      li({
        name: "Tear-off & disposal",
        category: "tearoff",
        quantity: squares,
        unit: "sq",
        unit_price: Number(rateCard.tearoff_disposal_per_square ?? 0),
        is_custom: false,
      })
    );
  }

  // Optional items (only if selected)
  if (selections.ridge_vent_selected) {
    line_items.push(
      li({
        name: "Ridge vent",
        category: "optional",
        quantity: Number(selections.ridge_vent_lf ?? 0),
        unit: "LF",
        unit_price: Number(rateCard.ridge_vent_per_lf ?? 0),
        is_custom: false,
      })
    );
  }

  if (selections.drip_edge_selected) {
    line_items.push(
      li({
        name: "Drip edge",
        category: "optional",
        quantity: Number(selections.drip_edge_lf ?? 0),
        unit: "LF",
        unit_price: Number(rateCard.drip_edge_per_lf ?? 0),
        is_custom: false,
      })
    );
  }

  if (selections.ice_water_selected) {
    line_items.push(
      li({
        name: "Ice & water shield",
        category: "optional",
        quantity: Number(selections.ice_water_squares ?? 0),
        unit: "sq",
        unit_price: Number(rateCard.ice_water_per_square ?? 0),
        is_custom: false,
      })
    );
  }

  if (selections.steep_charge_selected) {
    line_items.push(
      li({
        name: "Steep charge (flat)",
        category: "optional",
        quantity: 1,
        unit: "each",
        unit_price: Number(rateCard.steep_charge_flat ?? 0),
        is_custom: false,
      })
    );
  }

  if (selections.permit_fee_selected) {
    line_items.push(
      li({
        name: "Permit fee (flat)",
        category: "optional",
        quantity: 1,
        unit: "each",
        unit_price: Number(rateCard.permit_fee_flat ?? 0),
        is_custom: false,
      })
    );
  }

  // Saved custom items selected by ID
  const selectedIds = new Set(selections.selected_saved_custom_item_ids ?? []);
  const selectedSavedItems = savedCustomItems.filter((it) => selectedIds.has(it.id));

  // v1: per_unit saved items treated as qty=1 (no qty UI yet)
  for (const it of selectedSavedItems) {
    const qty = 1;
    const unit = it.pricing_type === "per_unit" ? it.unit_label ?? "unit" : "each";

    line_items.push(
      li({
        name: it.name,
        category: "custom",
        quantity: qty,
        unit,
        unit_price: Number(it.unit_price ?? 0),
        is_custom: true,
      })
    );
  }

  // One-time custom items (from selections)
  const oneTimeItems: OneTimeCustomItem[] = selections.one_time_custom_items ?? [];
  for (const it of oneTimeItems) {
    const qty = it.pricing_type === "per_unit" ? Number(it.quantity ?? 0) : 1;
    const unit = it.pricing_type === "per_unit" ? it.unit_label ?? "unit" : "each";

    line_items.push(
      li({
        name: it.name,
        category: "custom",
        quantity: qty,
        unit,
        unit_price: Number(it.unit_price ?? 0),
        is_custom: true,
      })
    );
  }

  const subtotal = round2(line_items.reduce((sum, x) => sum + x.subtotal, 0));
  const markup_percent = Number(rateCard.markup_percent ?? 0);
  const markup_amount = round2(subtotal * (markup_percent / 100));
  const total_before_minimum = round2(subtotal + markup_amount);

  const minimum = Number(rateCard.minimum_job_price ?? 0);
  let total = total_before_minimum;

  if (minimum > total_before_minimum) {
    const diff = round2(minimum - total_before_minimum);
    line_items.push({
      name: "Minimum job price adjustment",
      category: "adjustment",
      quantity: 1,
      unit: "each",
      unit_price: diff,
      subtotal: diff,
      is_custom: false,
    });
    total = minimum;
  }

  return {
    line_items,
    subtotal,
    markup_percent,
    markup_amount,
    total_before_minimum,
    total: round2(total),
    squares,
  };
}
