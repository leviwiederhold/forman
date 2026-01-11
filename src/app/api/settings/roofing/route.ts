import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoofingRateCardSchema } from "@/trades/roofing/schema";

const TRADE = "roofing";
const DEFAULT_NAME = "Default Roofing Rate Card";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const parsed = RoofingRateCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rate card payload" },
      { status: 400 }
    );
  }

  const rates = parsed.data;

  // Keep this legacy endpoint working by delegating to the canonical UPSERT strategy.
  // Requires UNIQUE (user_id, trade) on rate_cards.
  const { error } = await supabase
    .from("rate_cards")
    .upsert(
      {
        user_id: auth.user.id,
        trade: TRADE,
        name: DEFAULT_NAME,
        currency: "USD",
        rates_json: rates,
      },
      { onConflict: "user_id,trade" }
    );

  if (error) {
    return NextResponse.json(
      { error: "Failed to save rate card", supabase: { message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
