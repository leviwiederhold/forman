import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROOFING_RATE_DEFAULTS } from "@/trades/roofing/schema";
import { NewQuoteClient } from "./quote-new-client";

export default async function NewQuotePage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login");

  // Latest rate card (roofing)
  const { data: rateCardRow } = await supabase
    .from("rate_cards")
    .select("rates_json, updated_at")
    .eq("user_id", auth.user.id)
    .eq("trade", "roofing")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const usingDefaults = !rateCardRow?.rates_json;
  const rates = (rateCardRow?.rates_json ?? ROOFING_RATE_DEFAULTS) as typeof ROOFING_RATE_DEFAULTS;

  // Active custom items (roofing)
  const { data: customItems } = await supabase
    .from("custom_items")
    .select("id, name, pricing_type, unit_label, unit_price, taxable, is_active, updated_at")
    .eq("user_id", auth.user.id)
    .eq("trade", "roofing")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-base font-light tracking-wide">New Quote</h1>
          <p className="text-sm text-foreground/70">Roofing v1</p>
        </div>

        {usingDefaults ? (
          <div className="rounded-2xl border bg-card p-4 text-sm text-card-foreground">
            <div className="text-foreground/80">Using default rates</div>
            <div className="mt-1 text-foreground/60">
              Set your Roofing rate card for accuracy.
              <a className="ml-2 underline underline-offset-4" href="/settings/roofing">
                Go to Settings
              </a>
            </div>
          </div>
        ) : null}

        <NewQuoteClient rates={rates} customItems={customItems ?? []} />
      </div>
    </main>
  );
}
