import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoofingNewQuoteSchema } from "@/trades/roofing/schema";
import { calculateRoofingQuote } from "@/trades/roofing/pricing";
import { loadRoofingRateCardForUser, isZeroRateCard } from "@/trades/roofing/rates.server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const parsed = RoofingNewQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid quote payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const rateCard = await loadRoofingRateCardForUser(supabase as any, auth.user.id);
  if (isZeroRateCard(rateCard)) {
    return NextResponse.json(
      { error: "Roofing rates are all zeros. Fix Settings → Roofing." },
      { status: 400 }
    );
  }

  const args = parsed.data;

  const pricing = calculateRoofingQuote({
    args,
    rateCard: rateCard as any,
    savedCustomItems: [],
  });

  const subtotal =
    typeof (pricing as any).subtotal === "number"
      ? (pricing as any).subtotal
      : typeof (pricing as any).total === "number"
      ? (pricing as any).total
      : 0;

  const tax = 0;
  const total = typeof (pricing as any).total === "number" ? (pricing as any).total : subtotal;
  const lineItems = Array.isArray((pricing as any).line_items) ? (pricing as any).line_items : [];

  const insertPayload = {
    user_id: auth.user.id,
    trade: "roofing",
    status: "draft",
    locked: false,

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
  };

  const { data, error } = await supabase
    .from("quotes")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to save quote", supabase: { message: error?.message, code: (error as any)?.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, quote_id: data.id }, { status: 201 });
}
