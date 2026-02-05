// src/app/settings/roofing/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoofingSettingsForm } from "./roofing-settings-form";
import { ROOFING_RATE_DEFAULTS } from "@/trades/roofing/schema";
import { MyItems } from "./my-items";

export default async function RoofingSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login");

  const { data } = await supabase
    .from("rate_cards")
    .select("id, rates_json, updated_at")
    .eq("user_id", auth.user.id)
    .eq("trade", "roofing")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initialRates = (data?.rates_json ?? ROOFING_RATE_DEFAULTS) as typeof ROOFING_RATE_DEFAULTS;

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Page header */}
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs uppercase tracking-wider text-foreground/60">
              Pricing
            </div>
          </div>

          <h1 className="text-xl font-light">Roofing pricing</h1>
          <p className="text-sm text-foreground/70">
            These prices are used to calculate new roofing quotes. You can still add custom items per quote.
          </p>
        </header>

        <section className="space-y-3">
          <RoofingSettingsForm initialRates={initialRates} />
        </section>

        <section className="space-y-3">
          <div>
            <div className="text-sm font-medium">Saved items</div>
            <div className="text-xs text-foreground/60">
              Extras you can include on quotes (never added automatically).
            </div>
          </div>

          <MyItems trade="roofing" />
        </section>
      </div>
    </main>
  );
}
