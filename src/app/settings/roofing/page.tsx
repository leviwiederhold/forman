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
    <main className="forman-page">
      <div className="space-y-8">
        <header className="border-l-8 border-primary pl-5">
          <div className="forman-kicker">Pricing</div>
          <h1 className="forman-title text-4xl">Roofing rate card</h1>
          <p className="forman-subtitle mt-2">
            Set the default rates used for new roofing quotes. You can still add custom items per quote.
          </p>
        </header>

        <section className="space-y-3">
          <RoofingSettingsForm initialRates={initialRates} />
        </section>

        <section className="space-y-3">
          <div>
            <div className="forman-kicker">Saved items</div>
            <div className="text-xs text-muted-foreground">
              Extras you can include on quotes (never added automatically).
            </div>
          </div>

          <MyItems trade="roofing" />
        </section>
      </div>
    </main>
  );
}
