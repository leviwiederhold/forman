import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoofingNewQuoteSchema } from "@/trades/roofing/schema";
import { calculateRoofingQuote } from "@/trades/roofing/pricing";
import type { SavedCustomItem } from "@/trades/roofing/pricing";
import type { JsonObject, JsonValue } from "@/lib/types/json";

/**
 * 🔥 IMPORTANT (ONE-LINE FIX)
 * Replace this import with the REAL one used in your repo.
 * Search: rg "loadRoofingRateCardForUser" -n src
 * Copy the working import line here.
 */
import { loadRoofingRateCardForUser } from "@/trades/roofing/rates.server";

type Params = { id: string };

type QuoteRow = {
  id: string;
  trade: string;
  customer_name: string | null;
  customer_address: string | null;
  inputs_json: JsonObject | null;
  selections_json: JsonObject | null;
  line_items_json: JsonValue | null;
  pricing_json: JsonObject | null;
  payload: JsonObject | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  status: string | null;
  share_token: string | null;
  created_at?: string | null;
};

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

// GET /api/quotes/:id (private)
export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      "id, trade, customer_name, customer_address, inputs_json, selections_json, line_items_json, pricing_json, payload, subtotal, tax, total, status, share_token, created_at"
    )
    .eq("id", id)
    .single<QuoteRow>();

  if (error || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  return NextResponse.json({ quote });
}

// PATCH /api/quotes/:id (private) — expects FULL RoofingNewQuoteSchema payload
export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure exists (RLS enforces ownership)
  const { data: exists, error: fetchErr } = await supabase
    .from("quotes")
    .select("id")
    .eq("id", id)
    .single<{ id: string }>();

  if (fetchErr || !exists) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const body: unknown = await req.json();
  const parsed = RoofingNewQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quote payload" }, { status: 400 });
  }

  const args = parsed.data;

  // Canonical loader (DO NOT BREAK)
  const rateCard = await loadRoofingRateCardForUser(supabase, auth.user.id);

  const savedCustomItems: SavedCustomItem[] = [];

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

  const pricing_json = asJsonObject(computedR["pricing_json"] ?? computedR["pricing"] ?? {});
  const payload = asJsonObject(computedR["payload"] ?? {});

  const { data: updated, error: updateErr } = await supabase
    .from("quotes")
    .update({
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
    })
    .eq("id", id)
    .select(
      "id, trade, customer_name, customer_address, inputs_json, selections_json, line_items_json, pricing_json, payload, subtotal, tax, total, status, share_token, created_at"
    )
    .single<QuoteRow>();

  if (updateErr || !updated) {
    return NextResponse.json({ error: updateErr?.message ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ quote: updated });
}
