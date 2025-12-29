import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the original quote (RLS ensures it must belong to user)
  const { data: original, error: fetchErr } = await supabase
    .from("quotes")
    .select(
      "trade, customer_name, customer_address, inputs_json, selections_json, line_items_json, pricing_json, payload, subtotal, tax, total"
    )
    .eq("id", id)
    .single();

  if (fetchErr || !original) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // Create a new quote as a draft copy
  const insertPayload = {
    trade: original.trade ?? "roofing",
    customer_name: original.customer_name ?? "",
    customer_address: original.customer_address ?? null,

    inputs_json: original.inputs_json ?? {},
    selections_json: original.selections_json ?? {},
    line_items_json: original.line_items_json ?? [],
    pricing_json: original.pricing_json ?? {},
    payload: original.payload ?? {},

    subtotal: Number(original.subtotal ?? 0),
    tax: Number(original.tax ?? 0),
    total: Number(original.total ?? 0),

    status: "draft",
    locked: false,
    // user_id is filled by us explicitly to be safe (even though RLS insert policy checks it)
    user_id: auth.user.id,
  };

  const { data: created, error: insertErr } = await supabase
    .from("quotes")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertErr || !created) {
    return NextResponse.json(
      {
        error: "Failed to duplicate quote",
        supabase: {
          message: insertErr?.message,
          code: (insertErr as any)?.code,
          details: (insertErr as any)?.details,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
