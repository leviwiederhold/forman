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

export const dynamic = "force-dynamic";


// Helper to infer async return types cleanly
type AwaitedReturn<T extends (...args: never[]) => Promise<unknown>> = Awaited<
  ReturnType<T>
>;

// Canonical roofing rate card type (inferred from loader)
type RoofingRateCard = AwaitedReturn<typeof loadRoofingRateCardForUser>;

export default async function NewQuotePage() {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  let rateCard: RoofingRateCard;

try {
  // Canonical loader (DO NOT BREAK)
  rateCard = await loadRoofingRateCardForUser(supabase, auth.user.id);
} catch (err) {
  // Fail loudly, but don’t crash the whole app
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
          You don’t have a valid Roofing rate card yet. Go to Settings → Roofing, enter your rates, and hit Save.
        </p>

        <div className="mt-4 flex gap-2">
          <Link href="/settings/roofing">
            <Button>Go to Roofing Settings</Button>
          </Link>
          <Link href="/quotes">
            <Button variant="outline">Back to Quotes</Button>
          </Link>
        </div>

        {/* Optional: show the actual error so it’s “loud” */}
        <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs text-foreground/70">
          {String(err)}
        </pre>
      </div>
    </main>
  );
}

  // ✅ IMPORTANT: This table is "custom_items" (your DB does not have saved_custom_items)
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

  // Your NewQuoteClient expects SavedCustomItem[].
  // We'll cast from custom_items rows to the same shape it needs.
  // (If you want, we can later rename this type to CustomItem and remove casting.)
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
          Roofing rate card loaded but looks like all zeros. Check Settings → Roofing.
        </div>
      ) : null}

      <NewQuoteClient rates={rateCard} customItems={customItems} />
    </main>
  );
}
