import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

import { NewQuoteClient } from "./quote-new-client";
import { loadRoofingRateCardForUser, isZeroRateCard } from "@/trades/roofing/rates.server";

export default async function NewQuotePage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const rateCard = await loadRoofingRateCardForUser(supabase as any, auth.user.id);

  const { data: savedItems } = await supabase
    .from("saved_custom_items")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("trade", "roofing")
    .order("created_at", { ascending: true });

  const customItems = savedItems ?? [];

  const zero = isZeroRateCard(rateCard);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/quotes">
          <Button variant="outline">← Back</Button>
        </Link>
        <div className="text-sm text-foreground/60">New Quote</div>
      </div>

      {zero ? (
        <div className="rounded-2xl border bg-card p-4 text-sm text-destructive">
          Roofing rate card loaded but looks like all zeros. Check Settings → Roofing.
        </div>
      ) : null}

      <NewQuoteClient rates={rateCard as any} customItems={customItems as any} />
    </main>
  );
}
