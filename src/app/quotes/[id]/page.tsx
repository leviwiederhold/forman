import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types/json";
import { Button } from "@/components/ui/button";
import { QuoteActions } from "./quote-actions";
import { DeleteQuoteButton } from "@/components/delete-quote-button";

export const dynamic = "force-dynamic";

type QuoteView = {
  id: string;
  trade: string;
  customer_name: string | null;
  customer_address: string | null;
  status: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  line_items_json: JsonValue | null;
  created_at: string | null;
  share_token: string | null;

  // ✅ Profit guardrails persisted
  low_margin_acknowledged_at: string | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function asArray(v: JsonValue | null): unknown[] {
  return Array.isArray(v) ? v : [];
}

function money(n: number | null | undefined) {
  const val = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // ✅ Email verification required (launch hardening)
  if (!auth.user.email_confirmed_at) redirect("/verify-email");

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      "id, trade, customer_name, customer_address, status, subtotal, tax, total, line_items_json, created_at, share_token, low_margin_acknowledged_at"
    )
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single<QuoteView>();

  if (error || !quote) redirect("/quotes");

  const items = asArray(quote.line_items_json);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/quotes">← Back</Link>
        </Button>
        <div className="text-sm text-foreground/60">Quote</div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-lg font-medium">
              {quote.customer_name ?? "Unnamed"}
            </div>
            <div className="text-xs text-foreground/60">
              {quote.trade} · {quote.status ?? "draft"}
              {quote.created_at
                ? ` · ${new Date(quote.created_at).toLocaleString()}`
                : ""}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-foreground/60">Total</div>
            <div className="text-lg font-medium">{money(quote.total)}</div>
          </div>
        </div>

        <div className="mt-4">
          <QuoteActions
            id={quote.id}
            customerName={quote.customer_name ?? ""}
            subtotal={quote.subtotal ?? 0}
            total={quote.total ?? 0}
            shareToken={quote.share_token ?? ""}
            acknowledgedAt={quote.low_margin_acknowledged_at}
          />

          <div className="mt-3 flex justify-end">
            <DeleteQuoteButton
              quoteId={quote.id}
              afterDeleteHref="/quotes"
              variant="destructive"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="text-sm text-foreground/80">Totals</div>
        <div className="mt-3 rounded-xl border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/70">Subtotal</span>
            <span>{money(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">Tax</span>
            <span>{money(quote.tax)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{money(quote.total)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="text-sm text-foreground/80">Line items</div>

        <div className="mt-3 rounded-xl border p-3 text-sm">
          {items.length === 0 ? (
            <div className="text-foreground/60">No line items found.</div>
          ) : (
            <div className="space-y-2">
              {items.map((raw, idx) => {
                const obj = (raw ?? {}) as Record<string, unknown>;
                const name = String(obj.name ?? obj.label ?? `Item ${idx + 1}`);
                const qty = obj.quantity ?? obj.qty ?? "";
                const unit = obj.unit ?? "";
                const unitPrice = Number(obj.unit_price ?? obj.price ?? 0);
                const itemSubtotal = Number(obj.subtotal ?? obj.amount ?? 0);

                return (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-foreground/80">{name}</div>
                      <div className="text-xs text-foreground/60">
                        {qty ? `${qty} ${unit}` : ""}
                        {qty ? ` × $${unitPrice.toFixed(2)}` : ""}
                      </div>
                    </div>
                    <div className="text-foreground/80">
                      ${itemSubtotal.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
