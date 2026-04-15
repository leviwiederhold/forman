import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roofingDemoQuote } from "@/lib/demo/roofing-demo-quote";
import { trackServerEvent } from "@/lib/analytics/server";
import type { JsonObject, JsonValue } from "@/lib/types/json";

function randomToken(len = 22): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let out = "";
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function quoteAmountRange(total: number) {
  if (total < 5000) return "under_5k";
  if (total < 10000) return "5k_to_10k";
  if (total < 20000) return "10k_to_20k";
  return "20k_plus";
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profitability, payload, lineItems } = roofingDemoQuote;

  const insertPayload = {
    user_id: auth.user.id,
    trade: "roofing",
    customer_name: payload.inputs.customer_name,
    customer_address: payload.inputs.customer_address ?? null,
    inputs_json: payload.inputs as unknown as JsonObject,
    selections_json: payload.selections as unknown as JsonObject,
    line_items_json: lineItems as unknown as JsonValue,
    pricing_json: {
      subtotal: profitability.subtotal,
      tax: profitability.tax,
      total: profitability.total,
      demo_seeded: true,
      margin_pct: profitability.marginPct,
      profit: profitability.profit,
    } as JsonObject,
    payload: {
      demo_seeded: true,
      source: "roofing_demo_quote",
    } as JsonObject,
    subtotal: profitability.subtotal,
    tax: profitability.tax,
    total: profitability.total,
    status: "draft",
    share_token: randomToken(),
  } satisfies Record<string, unknown>;

  const { data: created, error } = await supabase
    .from("quotes")
    .insert(insertPayload)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? "Could not duplicate demo quote" }, { status: 500 });
  }

  await trackServerEvent({
    eventName: "demo_quote_duplicated",
    userId: auth.user.id,
    trade: "roofing",
    sourcePage: "/demo/quote",
    metadata: {
      demo_quote_id: roofingDemoQuote.id,
      duplicated_quote_id: created.id,
      quote_amount_range: quoteAmountRange(profitability.total),
      user_role: "roofing_owner",
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
