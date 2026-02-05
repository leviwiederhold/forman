import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { NewQuoteClient } from "@/app/quotes/new/quote-new-client";
import { loadRoofingRateCardForUser } from "@/trades/roofing/rates.server";
import { RoofingNewQuoteSchema, type RoofingNewQuote } from "@/trades/roofing/schema";
import type { SavedCustomItem } from "@/trades/roofing/pricing";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function QuoteEditPage({ params }: PageProps) {
  const { id } = await params;


  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  let rateCard: Awaited<ReturnType<typeof loadRoofingRateCardForUser>>;

  try {
    // Canonical loader (DO NOT BREAK)
    rateCard = await loadRoofingRateCardForUser(supabase, auth.user.id);
  } catch (err) {
    // Fail loudly, but don’t crash the whole app
    return (
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/quotes/${id}`}>
            <Button variant="outline">← Back</Button>
          </Link>
          <div className="text-sm text-foreground/60">Edit Quote</div>
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
            <Link href={`/quotes/${id}`}>
              <Button variant="outline">Back to Quote</Button>
            </Link>
          </div>

          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs text-foreground/70">
            {String(err)}
          </pre>
        </div>
      </main>
    );
  }

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, trade, inputs_json, selections_json")
    .eq("id", id)
    .eq("user_id", auth.user.id)
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
