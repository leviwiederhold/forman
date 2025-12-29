import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  loadRoofingRateCardForUser,
  isZeroRateCard,
} from "@/trades/roofing/rates.server";

import { NewQuoteClient } from "@/app/quotes/new/quote-new-client";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const rateCard = await loadRoofingRateCardForUser(
    supabase as any,
    auth.user.id
  );

  const { data: savedItems } = await supabase
    .from("saved_custom_items")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("trade", "roofing")
    .order("created_at", { ascending: true });

  const customItems = savedItems ?? [];

  // ✅ include status so we can block editing before UI loads
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, customer_name, payload, status")
    .eq("id", id)
    .single();

  if (error || !quote) redirect("/quotes");

  // ✅ If final, do not allow opening edit page
  const status = String((quote as any).status ?? "draft");
  if (status === "accepted" || status === "rejected") {
    redirect(`/quotes/${quote.id}`);
  }

  const zero = isZeroRateCard(rateCard);

  const initialPayload: unknown =
    (quote as any).payload ?? { inputs: { customer_name: "" }, selections: {} };

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/quotes/${quote.id}`}>
          <Button variant="outline">← Back</Button>
        </Link>
        <div className="text-sm text-foreground/60">
          Editing {(quote as any).customer_name || "Quote"}
        </div>
      </div>

      {zero ? (
        <div className="rounded-2xl border bg-card p-4 text-sm text-destructive">
          Roofing rate card loaded but looks like all zeros. Check Settings →
          Roofing.
        </div>
      ) : null}

      <NewQuoteClient
        rates={rateCard as any}
        customItems={customItems as any}
        editId={(quote as any).id}
        initialPayload={initialPayload as any}
      />
    </main>
  );
}
