import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoofingNewQuoteSchema, ROOFING_RATE_DEFAULTS } from "@/trades/roofing/schema";
import { calculateRoofingQuote } from "@/trades/roofing/pricing";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = RoofingNewQuoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { inputs, selections } = parsed.data;

  // ✅ Load saved items from DB
  const { data: savedItems } = await supabase
    .from("custom_items")
    .select("id, name, pricing_type, unit_label, unit_price, taxable")
    .in("id", selections.selected_saved_custom_item_ids ?? []);

  const pricing = calculateRoofingQuote({
  args: { inputs, selections },
  rateCard: ROOFING_RATE_DEFAULTS,
  savedCustomItems: savedItems ?? [],
});


  const { data, error } = await supabase
    .from("quotes")
    .insert({
      user_id: auth.user.id,
      customer_name: inputs.customer_name,
      pricing,
      payload: parsed.data,
      locked: true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quote_id: data.id });
}
