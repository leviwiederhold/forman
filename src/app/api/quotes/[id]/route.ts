import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoofingNewQuoteSchema } from "@/trades/roofing/schema";
import { calculateRoofingQuote } from "@/trades/roofing/pricing";
import { loadRoofingRateCardForUser, isZeroRateCard } from "@/trades/roofing/rates.server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ LOCK RULES: prevent edits once final
  const { data: existing, error: existingErr } = await supabase
    .from("quotes")
    .select("id,status")
    .eq("id", id)
    .single();

  if (existingErr || !existing) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const currentStatus = String((existing as any).status ?? "draft");
  if (currentStatus === "accepted" || currentStatus === "rejected") {
    return NextResponse.json(
      { error: `Quote is ${currentStatus} and cannot be edited. Duplicate to revise.` },
      { status: 409 }
    );
  }

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

  // ✅ IMPORTANT: use saved items during pricing (matches New Quote)
  const { data: savedItems } = await supabase
    .from("saved_custom_items")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("trade", "roofing")
    .order("created_at", { ascending: true });

  const customItems = savedItems ?? [];

  const args = parsed.data;

  const pricing = calculateRoofingQuote({
    args,
    rateCard: rateCard as any,
    savedCustomItems: customItems as any,
  });

  const subtotal =
    typeof (pricing as any).subtotal === "number"
      ? (pricing as any).subtotal
      : typeof (pricing as any).total === "number"
        ? (pricing as any).total
        : 0;

  const tax = 0;
  const total =
    typeof (pricing as any).total === "number" ? (pricing as any).total : subtotal;

  const lineItems = Array.isArray((pricing as any).line_items)
    ? (pricing as any).line_items
    : [];

  const patch = {
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
    .update(patch)
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error: "Failed to update quote",
        supabase: { message: error?.message, code: (error as any)?.code },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 200 });
}
