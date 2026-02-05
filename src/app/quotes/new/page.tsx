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

export const dynamic = "force-dynamic";

type AwaitedReturn<T extends (...args: never[]) => Promise<unknown>> = Awaited<
  ReturnType<T>
>;
type RoofingRateCard = AwaitedReturn<typeof loadRoofingRateCardForUser>;

export default async function NewQuotePage() {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // ✅ Paywall check INSIDE the page function
  const ent = await getEntitlements();

  // ✅ Instead of redirecting to /billing, SHOW A FRIENDLY MESSAGE
  if (!ent.canCreateQuotes) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
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
      <main className="mx-auto max-w-4xl space-y-6 p-6">
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
          Roofing rate card loaded but looks like all zeros. Check Pricing → Roofing.
        </div>
      ) : null}

      <NewQuoteClient rates={rateCard} customItems={customItems} />
    </main>
  );
}
