import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type QuoteShareView = {
  id: string;
  trade: string;
  customer_name: string | null;
  customer_address: string | null;
  status: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  created_at: string | null;
  share_token: string | null;
  low_margin_acknowledged_at: string | null;
};

type PageProps = {
  params: Promise<{ token: string }>;
};

function money(n: number | null | undefined) {
  const val = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

function marginPct(subtotal: number, total: number) {
  if (total <= 0) return 0;
  return ((total - subtotal) / total) * 100;
}

export default async function QuoteSharePage({ params }: PageProps) {
  const { token } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      "id, trade, customer_name, customer_address, status, subtotal, tax, total, created_at, share_token, low_margin_acknowledged_at"
    )
    .eq("share_token", token)
    .single<QuoteShareView>();

  if (error || !quote) redirect("/");

  // ✅ Server-enforced Profit Guardrail (prevents accidental sharing)
  const TARGET_MARGIN = 30;
  const pct = marginPct(quote.subtotal ?? 0, quote.total ?? 0);

  if (pct < TARGET_MARGIN && !quote.low_margin_acknowledged_at) {
    // Keep it generic; do not leak totals/details
    return (
      <main className="mx-auto max-w-xl space-y-3 p-6">
        <h1 className="text-lg font-medium">Quote unavailable</h1>
        <p className="text-sm text-foreground/70">
          This quote is not available to view yet. Please contact the contractor.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="text-xs text-foreground/60">Quote</div>
        <div className="mt-1 text-lg font-medium">
          {quote.customer_name ?? "Customer"}
        </div>
        <div className="mt-1 text-sm text-foreground/70">
          {quote.trade} · {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : ""}
        </div>

        <div className="mt-6 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/70">Total</span>
            <span className="text-xl font-medium">{money(quote.total)}</span>
          </div>
          <div className="mt-3 text-xs text-foreground/60">
            Includes materials & labor. Tax shown if applicable.
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border p-4 text-sm">
            <div className="font-medium">What’s included</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/70">
              <li>Roofing materials & installation</li>
              <li>Site cleanup</li>
              <li>Basic warranty (contractor-provided)</li>
            </ul>
          </div>

          <div className="rounded-xl border p-4 text-sm">
            <div className="font-medium">Estimated timeline</div>
            <div className="mt-2 text-foreground/70">
              Most jobs complete in 1–3 days depending on size/weather.
            </div>
          </div>

          <div className="rounded-xl border p-4 text-sm">
            <div className="font-medium">Trust & warranty</div>
            <div className="mt-2 text-foreground/70">
              Licensed & insured. Warranty details provided by the contractor.
            </div>
          </div>
        </div>

        <form
          className="mt-6"
          action={`/api/quotes/share/${token}/approve`}
          method="post"
        >
          <Button className="w-full">Approve Quote</Button>
          <div className="mt-2 text-xs text-foreground/60">
            Approval notifies the contractor. No payment is collected here yet.
          </div>
        </form>

        <div className="mt-4 text-xs text-foreground/50">
          Subtotal: {money(quote.subtotal)} · Tax: {money(quote.tax)}
        </div>
      </div>
    </main>
  );
}
