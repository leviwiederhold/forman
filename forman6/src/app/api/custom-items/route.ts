import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TradeQuerySchema = z.object({
  trade: z.string().min(1),
});

const CreateItemSchema = z.object({
  trade: z.string().optional().default("roofing"),
  item: z.object({
    name: z.string().min(1),
    pricing_type: z.string().min(1),
    unit_label: z.string().optional().nullable(),
    unit_price: z.coerce.number().min(0),
    taxable: z.coerce.boolean().default(false),
  }),
});

const PatchItemSchema = z.object({
  id: z.string().min(1),
  is_active: z.coerce.boolean(),
});

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = TradeQuerySchema.safeParse({
    trade: url.searchParams.get("trade") ?? "roofing",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_trade" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("custom_items")
    .select(
      "id, trade, name, pricing_type, unit_label, unit_price, taxable, is_active, created_at, updated_at"
    )
    .eq("user_id", auth.user.id)
    .eq("trade", parsed.data.trade)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = CreateItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  const rawType = payload.item.pricing_type.trim().toLowerCase();
  const pricing_type: "flat" | "per_unit" = rawType === "flat" ? "flat" : "per_unit";

  const unit_label = pricing_type === "flat" ? "Flat" : payload.item.unit_label?.trim() || "Unit";

  const { data, error } = await supabase
    .from("custom_items")
    .insert({
      user_id: auth.user.id,
      trade: payload.trade,
      name: payload.item.name.trim(),
      pricing_type,
      unit_label,
      unit_price: payload.item.unit_price,
      taxable: payload.item.taxable,
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return NextResponse.json(
      { error: "insert_failed", detail: error?.message ?? "unknown" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}

/**
 * PATCH /api/custom-items
 * Body: { id: string, is_active: boolean }
 * Used to deactivate/reactivate items
 */
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = PatchItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, is_active } = parsed.data;

  const { error } = await supabase
    .from("custom_items")
    .update({ is_active })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/custom-items?id=...
 * Hard delete (optional). If you prefer soft-delete only, don’t call this from UI.
 */
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { error } = await supabase
    .from("custom_items")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: "delete_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
