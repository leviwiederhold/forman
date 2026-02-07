// src/lib/quotes/margin.ts
//
// Dashboard v1 uses a deterministic "effective margin" based on pricing_json.
// pricing_json currently stores revenue math (subtotal + total) and markup fields.
// Until you store true job costs, we define:
//   marginPct = (total - subtotal) / total

export type PricingJsonLike = {
  subtotal?: unknown;
  total?: unknown;
  markup_percent?: unknown;
  markup_amount?: unknown;
};

export type EffectiveMargin = {
  subtotal: number;
  total: number;
  markupPercent: number;
  markupAmount: number;
  marginPct: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function calculateEffectiveMargin(pricing: unknown): EffectiveMargin {
  const p: PricingJsonLike = isRecord(pricing) ? (pricing as PricingJsonLike) : {};

  const subtotal = toNumber(p.subtotal, 0);
  const total = toNumber(p.total, subtotal);
  const markupPercent = toNumber(p.markup_percent, 0);
  const markupAmount = toNumber(p.markup_amount, Math.max(0, total - subtotal));

  const marginPct = total > 0 ? ((total - subtotal) / total) * 100 : 0;

  return {
    subtotal,
    total,
    markupPercent,
    markupAmount,
    marginPct,
  };
}
