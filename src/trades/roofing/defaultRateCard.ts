// src/trades/roofing/defaultRateCard.ts
import { calculateRoofingQuote } from "@/trades/roofing/pricing";

type QuotePricingParams = Parameters<typeof calculateRoofingQuote>[0];
type RoofingRateCard = QuotePricingParams["rateCard"];

/**
 * Zeroed defaults that exactly match the rateCard type used by pricing.ts.
 */
export const DEFAULT_ROOFING_RATE_CARD: RoofingRateCard = {
  labor_per_square: 0,
  shingles_per_square: 0,
  underlayment_per_square: 0,
  tearoff_disposal_per_square: 0,
  minimum_job_price: 0,
  markup_percent: 0,

  ridge_vent_per_lf: 0,
  ridge_vent_default_selected: false,

  drip_edge_per_lf: 0,
  drip_edge_default_selected: false,

  ice_water_per_square: 0,
  ice_water_default_selected: false,

  steep_charge_flat: 0,
  steep_charge_default_selected: false,

  permit_fee_flat: 0,
  permit_fee_default_selected: false,
};
