import type { SupabaseClient } from "@supabase/supabase-js";
import { ROOFING_RATE_DEFAULTS } from "@/trades/roofing/schema";

/**
 * Canonical rate source:
 *   public.rate_cards where user_id = <uid> and trade = 'roofing'
 *   use newest updated_at
 */
export async function loadRoofingRateCardForUser(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("rate_cards")
    .select("rates_json, updated_at")
    .eq("user_id", userId)
    .eq("trade", "roofing")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[rates] error loading from rate_cards:", error.message);
    return ROOFING_RATE_DEFAULTS as any;
  }

  if (!data?.rates_json) {
    console.warn("[rates] not found in rate_cards. Using defaults.");
    return ROOFING_RATE_DEFAULTS as any;
  }

  console.log("[rates] source=rate_cards trade=roofing");
  return data.rates_json as any;
}

export function isZeroRateCard(rateCard: any) {
  if (!rateCard || typeof rateCard !== "object") return true;
  const keys = [
    "labor_per_square",
    "shingles_per_square",
    "underlayment_per_square",
    "tearoff_disposal_per_square",
    "minimum_job_price",
  ];
  return keys.every((k) => Number((rateCard as any)[k] ?? 0) === 0);
}
