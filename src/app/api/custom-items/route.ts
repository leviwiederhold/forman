import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateCustomItemSchema } from "@/trades/roofing/schema";

const TradeQuerySchema = z.object({
  trade: z.string().min(1),
});

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = TradeQuerySchema.safeParse({
    trade: url.searchParams.get("trade") ?? "roofing",
  });

  if (!parsed.success) return NextResponse.json({ error: "invalid_trade" }, { status: 400 });

  const { data, error } = await supabase
    .from("custom_items")
    .select(
      "id, trade, name, pricing_type, unit_label, unit_price, taxable, is_active, created_at, updated_at"
    )
    .eq("user_id", auth.user.id)
    .eq("trade", parsed.data.trade)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = CreateCustomItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  const { data, error } = await supabase
    .from("custom_items")
    .insert({
  user_id: auth.user.id,
  trade: "roofing",
  name: payload.name,
  pricing_type: payload.pricing_type,
  unit_label: payload.unit_label ?? null,
  unit_price: payload.unit_price,
  taxable: payload.taxable,
  is_active: true,
})

    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}

