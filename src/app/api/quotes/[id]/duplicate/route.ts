import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseLikeError = { code?: string; message?: string; details?: string | null };

function randomToken(len = 22): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let out = "";
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: original, error: fetchErr } = await supabase
    .from("quotes")
    .select(
      "trade, customer_name, customer_address, inputs_json, selections_json, line_items_json, pricing_json, payload, subtotal, tax, total"
    )
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (fetchErr || !original) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

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

    share_token: randomToken(), // ✅ critical
  } satisfies Record<string, unknown>;

  const { data: created, error: insertErr } = await supabase
    .from("quotes")
    .insert(insertPayload)
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !created) {
    const e = insertErr as unknown as SupabaseLikeError;
    return NextResponse.json(
      { error: "Failed to duplicate quote", supabase: { code: e.code, message: e.message, details: e.details ?? null } },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: created.id }, { status: 201 });
}
