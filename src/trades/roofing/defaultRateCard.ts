// src/trades/roofing/defaultRateCard.ts

import type { RoofingRateCard } from "./schema";
import { ROOFING_RATE_DEFAULTS } from "./schema";

/**
 * This represents ONLY the rates_json shape.
 * No database fields (user_id, trade, etc) belong here.
 */
export const DEFAULT_ROOFING_RATE_CARD: RoofingRateCard = {
  ...ROOFING_RATE_DEFAULTS,
};
