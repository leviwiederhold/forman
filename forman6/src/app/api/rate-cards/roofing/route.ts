import { NextResponse } from "next/server";
import { RoofingRateCardSchema, ROOFING_RATE_DEFAULTS } from "@/trades/roofing/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TRADE = "roofing";
const DEFAULT_NAME = "Default Roofing Rate Card";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("rate_cards")
    .select("id, trade, name, currency, rates_json, created_at, updated_at")
    .eq("user_id", auth.user.id)
    .eq("trade", TRADE)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      exists: false,
      rateCard: {
        trade: TRADE,
        name: DEFAULT_NAME,
        currency: "USD",
        rates: ROOFING_RATE_DEFAULTS,
      },
    });
  }

  return NextResponse.json({
    exists: true,
    rateCard: {
      id: data.id,
      trade: data.trade,
      name: data.name,
      currency: data.currency,
      rates: data.rates_json,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  });
}

export async function PUT(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const parsed = RoofingRateCardSchema.safeParse(body?.rates);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_rates", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // ✅ Canonical, non-fragile save: UPSERT on (user_id, trade)
  // Requires a UNIQUE constraint or unique index on (user_id, trade)
  const { data: saved, error } = await supabase
    .from("rate_cards")
    .upsert(
      {
        user_id: auth.user.id,
        trade: TRADE,
        name: DEFAULT_NAME,
        currency: "USD",
        rates_json: parsed.data,
      },
      { onConflict: "user_id,trade" }
    )
    .select("id, updated_at")
    .single();

  if (error || !saved) {
    return NextResponse.json(
      {
        error: "Failed to save rate card",
        supabase: { message: error?.message ?? "unknown" },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: saved.id, updated_at: saved.updated_at });
}
