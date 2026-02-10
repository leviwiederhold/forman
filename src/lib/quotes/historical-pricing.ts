type QuoteSample = {
  total: number | null;
  inputs_json: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toSquares(input: { roof_size_value?: unknown; roof_size_unit?: unknown }): number | null {
  const roofSizeValue =
    typeof input.roof_size_value === "number" && Number.isFinite(input.roof_size_value)
      ? input.roof_size_value
      : null;
  if (!roofSizeValue || roofSizeValue <= 0) return null;
  const unit = input.roof_size_unit;
  if (unit === "sqft") return roofSizeValue / 100;
  return roofSizeValue;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export type HistoricalPricingGuidance = {
  sampleCount: number;
  medianPricePerSquare: number | null;
  recommendedTotal: number | null;
  lowerRangeTotal: number | null;
  upperRangeTotal: number | null;
};

export function buildHistoricalPricingGuidance({
  samples,
  currentRoofSizeValue,
  currentRoofSizeUnit,
}: {
  samples: QuoteSample[];
  currentRoofSizeValue: number;
  currentRoofSizeUnit: "squares" | "sqft";
}): HistoricalPricingGuidance {
  const points = samples
    .map((row) => {
      const total = typeof row.total === "number" && Number.isFinite(row.total) ? row.total : null;
      const inputs = isRecord(row.inputs_json) ? row.inputs_json : {};
      const squares = toSquares(inputs);
      if (!total || total <= 0 || !squares || squares <= 0) return null;
      return total / squares;
    })
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);

  const currentSquares = currentRoofSizeUnit === "sqft" ? currentRoofSizeValue / 100 : currentRoofSizeValue;
  const m = median(points);
  if (!m || !Number.isFinite(currentSquares) || currentSquares <= 0) {
    return {
      sampleCount: points.length,
      medianPricePerSquare: null,
      recommendedTotal: null,
      lowerRangeTotal: null,
      upperRangeTotal: null,
    };
  }

  const recommendedTotal = m * currentSquares;
  return {
    sampleCount: points.length,
    medianPricePerSquare: m,
    recommendedTotal,
    lowerRangeTotal: recommendedTotal * 0.9,
    upperRangeTotal: recommendedTotal * 1.1,
  };
}
