import type { SupabaseClient } from "@supabase/supabase-js";
import { RoofingRateCardSchema, type RoofingRateCard } from "./schema";

type RateCardRow = {
  user_id: string;
  trade: string;
  rates_json: unknown;
  updated_at: string;
};

export function isZeroRateCard(card: RoofingRateCard) {
  // conservative: if every numeric is 0, treat as zero
  const nums = Object.values(card).filter((v) => typeof v === "number") as number[];
  return nums.length > 0 && nums.every((n) => n === 0);
}

export async function loadRoofingRateCardForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<RoofingRateCard> {
  const { data, error } = await supabase
    .from("rate_cards")
    .select("user_id, trade, rates_json, updated_at")
    .eq("user_id", userId)
    .eq("trade", "roofing")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load rate card: ${error.message}`);
  }

  const row = (data?.[0] ?? null) as RateCardRow | null;

  if (!row) {
    // If you have defaults elsewhere, import them; otherwise fail loudly.
    // This matches your constraint: do NOT silently fall back.
    throw new Error("No roofing rate card found. Set rates in Pricing → Roofing.");
  }

  const parsed = RoofingRateCardSchema.safeParse(row.rates_json);
  if (!parsed.success) {
    throw new Error("Roofing rate card is invalid. Fix Pricing → Roofing.");
  }

  return parsed.data;
}
