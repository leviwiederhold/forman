import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { NewQuoteClient } from "@/app/quotes/new/quote-new-client";
import { loadRoofingRateCardForUser } from "@/trades/roofing/rates.server";
import { RoofingNewQuoteSchema, type RoofingNewQuote } from "@/trades/roofing/schema";
import type { SavedCustomItem } from "@/trades/roofing/pricing";


type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuoteEditPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const rateCard = await loadRoofingRateCardForUser(supabase, auth.user.id);

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, trade, inputs_json, selections_json")
    .eq("id", id)
    .single();

  if (error || !quote) redirect("/quotes");

  const initialMaybe: unknown = {
    inputs: quote.inputs_json ?? {},
    selections: quote.selections_json ?? {},
  };

  const parsed = RoofingNewQuoteSchema.safeParse(initialMaybe);
  const initialPayload: RoofingNewQuote | undefined = parsed.success ? parsed.data : undefined;

  // load saved items for roofing
  const { data: savedItems } = await supabase
    .from("custom_items")
    .select("id, name, pricing_type, unit_label, unit_price, taxable, trade, user_id, created_at, updated_at")
    .eq("user_id", auth.user.id)
    .eq("trade", "roofing")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/quotes/${id}`}>
          <Button variant="outline">← Back</Button>
        </Link>
        <div className="text-sm text-foreground/60">Edit Quote</div>
      </div>

      <NewQuoteClient
        rates={rateCard}
        customItems={(savedItems ?? []) as SavedCustomItem[]}
        editId={id}
        initialPayload={initialPayload}
      />
    </main>
  );
}
