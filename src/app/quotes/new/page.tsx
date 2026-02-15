import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

import { NewQuoteClient } from "./quote-new-client";
import {
  loadRoofingRateCardForUser,
  isZeroRateCard,
} from "@/trades/roofing/rates.server";

import type { SavedCustomItem } from "@/trades/roofing/pricing";
import { getEntitlements } from "@/lib/billing/entitlements.server";
import type { RoofingNewQuote } from "@/trades/roofing/schema";

export const dynamic = "force-dynamic";

type AwaitedReturn<T extends (...args: never[]) => Promise<unknown>> = Awaited<
  ReturnType<T>
>;
type RoofingRateCard = AwaitedReturn<typeof loadRoofingRateCardForUser>;

type QuoteDefaults = {
  inputs?: {
    roof_size_value?: number;
    roof_size_unit?: "squares" | "sqft";
    pitch?: string;
    stories?: 1 | 2 | 3;
    tearoff?: boolean;
    layers?: 1 | 2 | 3;
  };
  selections?: {
    ridge_vent_selected?: boolean;
    drip_edge_selected?: boolean;
    ice_water_selected?: boolean;
    steep_charge_selected?: boolean;
    permit_fee_selected?: boolean;
    tearoff_selected?: boolean;
  };
};

type HistoricalQuoteSample = {
  total: number | null;
  inputs_json: unknown;
};

function baseNewQuotePayload(): RoofingNewQuote {
  return {
    inputs: {
      customer_name: "",
      customer_address: "",
      roof_size_value: 24,
      roof_size_unit: "squares",
      pitch: "7/12",
      stories: 2,
      tearoff: true,
      layers: 1,
    },
    selections: {
      ridge_vent_selected: false,
      ridge_vent_lf: undefined,
      drip_edge_selected: false,
      drip_edge_lf: undefined,
      ice_water_selected: false,
      ice_water_squares: undefined,
      steep_charge_selected: false,
      permit_fee_selected: false,
      tearoff_selected: true,
      selected_saved_custom_item_ids: [],
      one_time_custom_items: [],
    },
  };
}

function applyQuoteDefaults(payload: RoofingNewQuote, defaults: unknown): RoofingNewQuote {
  const d = (defaults ?? {}) as QuoteDefaults;
  const out: RoofingNewQuote = {
    inputs: { ...payload.inputs },
    selections: { ...payload.selections },
  };

  if (d.inputs) {
    if (typeof d.inputs.roof_size_value === "number" && Number.isFinite(d.inputs.roof_size_value) && d.inputs.roof_size_value > 0) {
      out.inputs.roof_size_value = d.inputs.roof_size_value;
    }
    if (d.inputs.roof_size_unit === "squares" || d.inputs.roof_size_unit === "sqft") {
      out.inputs.roof_size_unit = d.inputs.roof_size_unit;
    }
    if (typeof d.inputs.pitch === "string" && d.inputs.pitch.trim().length > 0) {
      out.inputs.pitch = d.inputs.pitch.trim();
    }
    if (d.inputs.stories === 1 || d.inputs.stories === 2 || d.inputs.stories === 3) {
      out.inputs.stories = d.inputs.stories;
    }
    if (typeof d.inputs.tearoff === "boolean") {
      out.inputs.tearoff = d.inputs.tearoff;
      out.selections.tearoff_selected = d.inputs.tearoff;
    }
    if (out.inputs.tearoff && (d.inputs.layers === 1 || d.inputs.layers === 2 || d.inputs.layers === 3)) {
      out.inputs.layers = d.inputs.layers;
    }
    if (!out.inputs.tearoff) {
      out.inputs.layers = undefined;
      out.selections.tearoff_selected = false;
    }
  }

  if (d.selections) {
    if (typeof d.selections.ridge_vent_selected === "boolean") out.selections.ridge_vent_selected = d.selections.ridge_vent_selected;
    if (typeof d.selections.drip_edge_selected === "boolean") out.selections.drip_edge_selected = d.selections.drip_edge_selected;
    if (typeof d.selections.ice_water_selected === "boolean") out.selections.ice_water_selected = d.selections.ice_water_selected;
    if (typeof d.selections.steep_charge_selected === "boolean") out.selections.steep_charge_selected = d.selections.steep_charge_selected;
    if (typeof d.selections.permit_fee_selected === "boolean") out.selections.permit_fee_selected = d.selections.permit_fee_selected;
    if (typeof d.selections.tearoff_selected === "boolean") out.selections.tearoff_selected = d.selections.tearoff_selected;
  }

  return out;
}

export default async function NewQuotePage() {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // ✅ Paywall check INSIDE the page function
  const ent = await getEntitlements();

  // ✅ Instead of redirecting to /billing, SHOW A FRIENDLY MESSAGE
  if (!ent.canCreateQuotes) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard">
            <Button variant="outline">← Back</Button>
          </Link>
          <div className="text-sm text-foreground/60">New Quote</div>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <div className="text-sm text-foreground/70">Trial ended</div>
          <h1 className="mt-1 text-lg font-medium">
            Subscribe to create more quotes
          </h1>

          <p className="mt-2 text-sm text-foreground/70">
            Your free trial has ended. To keep creating new quotes, you’ll need
            to subscribe.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/billing">
              <Button>View plans</Button>
            </Link>
            <Link href="/quotes">
              <Button variant="outline">View existing quotes</Button>
            </Link>
          </div>

          <div className="mt-4 text-xs text-foreground/50">
            You can still view, share, and download existing quotes.
          </div>
        </div>
      </main>
    );
  }

  let rateCard: RoofingRateCard;

  try {
    rateCard = await loadRoofingRateCardForUser(supabase, auth.user.id);
  } catch (err) {
    return (
      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/quotes">
            <Button variant="outline">← Back</Button>
          </Link>
          <div className="text-sm text-foreground/60">New Quote</div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h1 className="text-base font-medium">Roofing rates not set</h1>
          <p className="mt-2 text-sm text-foreground/70">
            You don’t have a valid Roofing rate card yet. Go to Pricing → Roofing, enter your rates, and hit Save.
          </p>

          <div className="mt-4 flex gap-2">
            <Link href="/settings/roofing">
              <Button>Go to Roofing Pricing</Button>
            </Link>
            <Link href="/quotes">
              <Button variant="outline">Back to Quotes</Button>
            </Link>
          </div>

          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs text-foreground/70">
            {String(err)}
          </pre>
        </div>
      </main>
    );
  }

  const { data: savedItems } = await supabase
    .from("custom_items")
    .select(
      `
        id,
        user_id,
        trade,
        name,
        pricing_type,
        unit_label,
        unit_price,
        taxable,
        is_active,
        created_at,
        updated_at
      `
    )
    .eq("user_id", auth.user.id)
    .eq("trade", "roofing")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  const customItems: SavedCustomItem[] =
    (savedItems ?? []) as unknown as SavedCustomItem[];

  const [{ data: profile }, { data: connect }, { data: historicalRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("deposit_percent, accept_deposits_on_share, quote_defaults_json")
      .eq("id", auth.user.id)
      .maybeSingle<{
        deposit_percent: number | null;
        accept_deposits_on_share: boolean | null;
        quote_defaults_json: unknown | null;
      }>(),
    supabase
      .from("stripe_connect_accounts")
      .select("charges_enabled")
      .eq("user_id", auth.user.id)
      .maybeSingle<{ charges_enabled: boolean | null }>(),
    supabase
      .from("quotes")
      .select("total, inputs_json")
      .eq("user_id", auth.user.id)
      .eq("trade", "roofing")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const depositPercent =
    typeof profile?.deposit_percent === "number" && Number.isFinite(profile.deposit_percent)
      ? profile.deposit_percent
      : 0;
  const depositEnabled =
    Boolean(profile?.accept_deposits_on_share) &&
    depositPercent > 0 &&
    Boolean(connect?.charges_enabled);
  const hasSavedDefaults = Boolean(profile?.quote_defaults_json);

  const zero = isZeroRateCard(rateCard);
  const initialPayload = applyQuoteDefaults(baseNewQuotePayload(), profile?.quote_defaults_json);
  const historicalSamples = (historicalRows ?? []) as HistoricalQuoteSample[];

  return (
    <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/quotes">
          <Button variant="outline">← Back</Button>
        </Link>
        <div className="text-sm text-foreground/60">New Quote</div>
      </div>

      {zero ? (
        <div className="rounded-2xl border bg-card p-4 text-sm text-destructive">
          Roofing rate card loaded but looks like all zeros. Check Pricing → Roofing.
        </div>
      ) : null}

      <section className="rounded-2xl border bg-card p-4">
        <div className="text-sm font-medium">Before you send</div>
        <div className="mt-2 grid gap-2 text-sm text-foreground/75 md:grid-cols-3">
          <div className="rounded-lg border bg-background/40 p-3">
            <div className="text-xs text-foreground/60">Margin floor</div>
            <div className="mt-1">Aim to stay at or above 30% margin.</div>
          </div>
          <div className="rounded-lg border bg-background/40 p-3">
            <div className="text-xs text-foreground/60">Deposit option</div>
            <div className="mt-1">
              {depositEnabled
                ? `Enabled at ${depositPercent.toFixed(0)}% for shared quotes.`
                : "Not enabled yet. Turn on deposits to reduce cancellations."}
            </div>
          </div>
          <div className="rounded-lg border bg-background/40 p-3">
            <div className="text-xs text-foreground/60">Client response</div>
            <div className="mt-1">Shared quotes show view status and expiry to guide follow-up.</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-foreground/60">
          {hasSavedDefaults
            ? "Saved defaults are applied to this form."
            : "Tip: after setting your preferred scope choices, use “Save as defaults” in the editor."}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/settings/roofing">
            <Button variant="outline" size="sm">Deposit settings</Button>
          </Link>
          <Link href="/settings/billing">
            <Button variant="outline" size="sm">Connect Stripe</Button>
          </Link>
        </div>
      </section>

      <NewQuoteClient
        rates={rateCard}
        customItems={customItems}
        initialPayload={initialPayload}
        historicalSamples={historicalSamples}
      />
    </main>
  );
}
