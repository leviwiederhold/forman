// src/app/api/quotes/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoofingNewQuoteSchema } from "@/trades/roofing/schema";
import { calculateRoofingQuote } from "@/trades/roofing/pricing";
import { DEFAULT_ROOFING_RATE_CARD } from "@/trades/roofing/defaultRateCard";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RoofingNewQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid quote payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const args = parsed.data;

  let pricing: ReturnType<typeof calculateRoofingQuote>;
  try {
    pricing = calculateRoofingQuote({
      args,
      rateCard: DEFAULT_ROOFING_RATE_CARD,
      savedCustomItems: [],
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Pricing calculation failed",
        message: e?.message ?? String(e),
        where: "calculateRoofingQuote",
      },
      { status: 500 }
    );
  }

  // RoofingPricingResult doesn't have `tax` yet
  const subtotal =
    typeof (pricing as any).subtotal === "number"
      ? (pricing as any).subtotal
      : typeof (pricing as any).total === "number"
        ? (pricing as any).total
        : 0;

  const tax = 0;

  const total =
    typeof (pricing as any).total === "number" ? (pricing as any).total : subtotal + tax;

  const lineItems =
    Array.isArray((pricing as any).line_items) ? (pricing as any).line_items : [];

  const insertPayload = {
    user_id: auth.user.id,
    trade: "roofing",

    customer_name: (args.inputs?.customer_name ?? "").trim() || "",
    customer_address: args.inputs?.customer_address ?? null,

    inputs_json: args.inputs ?? {},
    selections_json: args.selections ?? {},

    line_items_json: lineItems,
    pricing_json: pricing ?? {},
    payload: args ?? {},

    subtotal,
    tax,
    total,

    locked: false,
  };

  const { data, error } = await supabase
    .from("quotes")
    .insert(insertPayload)
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to save quote",
        supabase: {
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, quote: data }, { status: 201 });
}
