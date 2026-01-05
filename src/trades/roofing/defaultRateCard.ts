import { RoofingRateCard } from "./schema";

export const DEFAULT_ROOFING_RATE_CARD: RoofingRateCard = {
  trade: "roofing",

  // Core rates
  labor_per_square: 0,
  shingles_per_square: 0,
  underlayment_per_square: 0,
  tearoff_per_square: 0,

  // Common add-ons
  ridge_vent_per_lf: 0,
  drip_edge_per_lf: 0,
  ice_water_per_square: 0,

  // Flat charges
  steep_charge_flat: 0,
  permit_fee_flat: 0,

  // Job rules
  minimum_job_price: 0,
  markup_percent: 0,
};
