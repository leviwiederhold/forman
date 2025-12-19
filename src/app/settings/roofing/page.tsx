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
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-base font-light tracking-wide">Settings</h1>
          <p className="text-sm text-foreground/70">Roofing rate card</p>
        </div>

       <RoofingSettingsForm initialRates={initialRates} />

<div className="h-6" />

<MyItems trade="roofing" />

      </div>
    </main>
  );
}
