import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
};

type Params = { id: string };

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;


  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch original quote (defense-in-depth: filter by user_id too)
  const { data: original, error: fetchErr } = await supabase
    .from("quotes")
    .select(
      "trade, customer_name, customer_address, inputs_json, selections_json, line_items_json, pricing_json, payload, subtotal, tax, total"
    )
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (fetchErr || !original) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const insertPayload = {
    user_id: auth.user.id,

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
  } satisfies Record<string, unknown>;

  const { data: created, error: insertErr } = await supabase
    .from("quotes")
    .insert(insertPayload)
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !created) {
    const e = insertErr as unknown as SupabaseLikeError;

    return NextResponse.json(
      {
        error: "Failed to duplicate quote",
        supabase: {
          code: e.code,
          message: e.message,
          details: e.details ?? null,
        },
      },
      { status: 500 }
    );
  }

  // ✅ Keep response exactly what the client needs
  return NextResponse.json({ id: created.id }, { status: 201 });
}
