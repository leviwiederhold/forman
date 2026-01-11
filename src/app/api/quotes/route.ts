import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoofingNewQuoteSchema } from "@/trades/roofing/schema";
import { calculateRoofingQuote } from "@/trades/roofing/pricing";
import type { SavedCustomItem } from "@/trades/roofing/pricing";
import type { JsonObject, JsonValue } from "@/lib/types/json";

import { loadRoofingRateCardForUser } from "@/trades/roofing/rates.server";
import { getEntitlements } from "@/lib/billing/entitlements";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asJsonObject(v: unknown, fallback: JsonObject = {}): JsonObject {
  return isRecord(v) ? (v as unknown as JsonObject) : fallback;
}

function asJsonValue(v: unknown, fallback: JsonValue): JsonValue {
  return v === undefined ? fallback : (v as JsonValue);
}

function getNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function randomToken(len = 22): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// GET /api/quotes -> list latest quotes (private)
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ent = await getEntitlements();
if (!ent.canCreateQuotes) {
  return NextResponse.json({ error: "Subscription required" }, { status: 402 });
}


  const { data, error } = await supabase
    .from("quotes")
    .select("id, trade, customer_name, status, subtotal, tax, total, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data ?? [] });
}

// POST /api/quotes -> create quote (private, server authoritative)
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = RoofingNewQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid quote payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const args = parsed.data;

  // Canonical loader (DO NOT BREAK)
  const rateCard = await loadRoofingRateCardForUser(supabase, auth.user.id);

  // ✅ Load active custom items for this user + trade
  const { data: allCustomItems, error: ciErr } = await supabase
    .from("custom_items")
    .select("id, name, pricing_type, unit_label, unit_price, taxable")
    .eq("user_id", auth.user.id)
    .eq("trade", "roofing")
    .eq("is_active", true);

  if (ciErr) {
    return NextResponse.json({ error: ciErr.message }, { status: 500 });
  }

  const selectedIds = Array.isArray(
    args.selections.selected_saved_custom_item_ids
  )
    ? args.selections.selected_saved_custom_item_ids
    : [];

  const selectedSet = new Set(selectedIds);

  // Map custom_items rows into the SavedCustomItem shape expected by pricing
  const savedCustomItems: SavedCustomItem[] = (allCustomItems ?? [])
    .filter((row) => selectedSet.has(row.id))
    .map((row) => ({
      id: row.id,
      name: row.name,
      pricing_type: row.pricing_type as SavedCustomItem["pricing_type"],
      unit_label: row.unit_label ?? null,
      unit_price: row.unit_price,
      taxable: row.taxable,
    }));

  const computed = calculateRoofingQuote({
    args,
    rateCard,
    savedCustomItems,
  });

  const computedU: unknown = computed;
  const computedR: Record<string, unknown> = isRecord(computedU) ? computedU : {};

  const lineItems = computedR["line_items"];
  const subtotal = getNumber(computedR["subtotal"], 0);
  const total = getNumber(computedR["total"], subtotal);
  const tax = getNumber(computedR["tax"], 0);

  // Persist a stable pricing snapshot for list/detail/share/PDF
  const pricing_json: JsonObject = {
    subtotal,
    tax,
    total,
    squares: getNumber(computedR["squares"], 0),
    markup_percent: getNumber(computedR["markup_percent"], 0),
    markup_amount: getNumber(computedR["markup_amount"], 0),
    total_before_minimum: getNumber(computedR["total_before_minimum"], 0),
  };

  // payload reserved for future use; keep but don't rely on it
  const payload = asJsonObject(computedR["payload"] ?? {});

  const share_token = randomToken();

  const insertPayload = {
    user_id: auth.user.id,
    trade: "roofing",
    customer_name: args.inputs.customer_name,
    customer_address: args.inputs.customer_address ?? null,
    inputs_json: asJsonObject(args.inputs),
    selections_json: asJsonObject(args.selections),
    line_items_json: asJsonValue(lineItems, []) as JsonValue,
    pricing_json,
    payload,
    subtotal,
    tax,
    total,
    status: "draft",
    share_token,
  } satisfies Record<string, unknown>;

  // ✅ ACTUAL INSERT (you were missing this)
  const { data: created, error: insertErr } = await supabase
    .from("quotes")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertErr || !created) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: created.id });
}
