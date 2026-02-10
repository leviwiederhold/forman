import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonObject } from "@/lib/types/json";

type QuoteDefaults = {
  inputs: {
    roof_size_value?: number;
    roof_size_unit?: "squares" | "sqft";
    pitch?: string;
    stories?: 1 | 2 | 3;
    tearoff?: boolean;
    layers?: 1 | 2 | 3;
  };
  selections: {
    ridge_vent_selected?: boolean;
    drip_edge_selected?: boolean;
    ice_water_selected?: boolean;
    steep_charge_selected?: boolean;
    permit_fee_selected?: boolean;
    tearoff_selected?: boolean;
  };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toBool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function toNum(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function toStories(v: unknown, fallback: 1 | 2 | 3): 1 | 2 | 3 {
  return v === 1 || v === 2 || v === 3 ? v : fallback;
}

function toUnit(v: unknown, fallback: "squares" | "sqft"): "squares" | "sqft" {
  return v === "squares" || v === "sqft" ? v : fallback;
}

function toPitch(v: unknown, fallback: string) {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
}

function sanitizeDefaults(raw: unknown): QuoteDefaults {
  const body = isRecord(raw) ? raw : {};
  const rawInputs = isRecord(body.inputs) ? body.inputs : {};
  const rawSelections = isRecord(body.selections) ? body.selections : {};

  const tearoff = toBool(rawInputs.tearoff, true);
  const layers = toStories(rawInputs.layers, 1);

  return {
    inputs: {
      roof_size_value: Math.max(0.01, toNum(rawInputs.roof_size_value, 24)),
      roof_size_unit: toUnit(rawInputs.roof_size_unit, "squares"),
      pitch: toPitch(rawInputs.pitch, "7/12"),
      stories: toStories(rawInputs.stories, 2),
      tearoff,
      layers: tearoff ? layers : undefined,
    },
    selections: {
      ridge_vent_selected: toBool(rawSelections.ridge_vent_selected, false),
      drip_edge_selected: toBool(rawSelections.drip_edge_selected, false),
      ice_water_selected: toBool(rawSelections.ice_water_selected, false),
      steep_charge_selected: toBool(rawSelections.steep_charge_selected, false),
      permit_fee_selected: toBool(rawSelections.permit_fee_selected, false),
      tearoff_selected: toBool(rawSelections.tearoff_selected, tearoff),
    },
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ defaults: null }, { status: 401 });
  }

  const { data } = await supabase
    .from("profiles")
    .select("quote_defaults_json")
    .eq("id", auth.user.id)
    .maybeSingle<{ quote_defaults_json: JsonObject | null }>();

  return NextResponse.json({
    defaults: data?.quote_defaults_json ?? null,
  });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { defaults?: unknown };
  const defaults = sanitizeDefaults(body.defaults);

  const payload = {
    id: auth.user.id,
    quote_defaults_json: defaults as unknown as JsonObject,
  };

  const result = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (result.error) {
    return NextResponse.json({ error: "Could not save defaults" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, defaults });
}
