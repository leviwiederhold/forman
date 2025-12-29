import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ShareLinkButton } from "@/components/quotes/ShareLinkButton";

function money(n: unknown) {
  const v = Number(n ?? 0);
  return `$${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      `
      id,
      customer_name,
      customer_address,
      status,
      subtotal,
      tax,
      total,
      line_items_json,
      created_at
    `
    )
    .eq("id", id)
    .single();

  if (error || !quote) redirect("/quotes");

  const status = String(quote.status ?? "draft");
  const isFinal = status === "accepted" || status === "rejected";

  const items = Array.isArray(quote.line_items_json)
    ? quote.line_items_json
    : [];

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/quotes">
          <Button variant="outline">← Back</Button>
        </Link>

        <div className="flex flex-wrap gap-2">
          {/* STATUS BUTTONS (optional internal controls) */}
          <Button variant="secondary" disabled>
            {status}
          </Button>

          {/* EDIT (blocked if accepted/rejected) */}
          {!isFinal ? (
            <Link href={`/quotes/${quote.id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
          ) : (
            <Button variant="outline" disabled title="Duplicate to revise">
              Edit
            </Button>
          )}

          {/* DUPLICATE (always allowed) */}
          <Link href={`/api/quotes/${quote.id}/duplicate`}>
            <Button variant="outline">Duplicate</Button>
          </Link>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap gap-2">
        <a href={`/api/quotes/${quote.id}/pdf`}>
          <Button variant="outline">Download PDF</Button>
        </a>

        {/* ✅ THIS is the ONLY copy link */}
        <ShareLinkButton quoteId={quote.id} />

        {/* SIMPLE EMAIL */}
        <a
          href={`mailto:?subject=Roofing Quote&body=Here is your quote:%0D%0A`}
        >
          <Button variant="outline">Email</Button>
        </a>
      </div>

      {/* SUMMARY */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-foreground/60">Customer</div>
            <div className="text-lg">
              {quote.customer_name || "Customer"}
            </div>
            {quote.customer_address ? (
              <div className="text-sm text-foreground/60">
                {quote.customer_address}
              </div>
            ) : null}
          </div>

          <div className="text-right">
            <div className="text-sm text-foreground/60">Total</div>
            <div className="text-2xl font-medium">
              {money(quote.total)}
            </div>
            <div className="text-xs text-foreground/60">
              Subtotal {money(quote.subtotal)} · Tax {money(quote.tax)}
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-foreground/60">
          Created {new Date(quote.created_at).toLocaleString()}
        </div>
      </div>

      {/* LINE ITEMS */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 text-sm text-foreground/60">Line items</div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-foreground/60">
              No line items found.
            </div>
          ) : (
            items.map((it: any, idx: number) => {
              const name = it?.name ?? it?.label ?? `Item ${idx + 1}`;
              const qty = it?.qty ?? it?.quantity ?? null;
              const unit = it?.unit ?? "";
              const amount =
                it?.subtotal ??
                it?.total ??
                it?.amount ??
                it?.line_total ??
                it?.extended_price ??
                0;

              return (
                <div
                  key={`${name}-${idx}`}
                  className="flex items-center justify-between rounded-xl border px-4 py-2"
                >
                  <div>
                    <div className="text-sm">{name}</div>
                    {qty != null ? (
                      <div className="text-xs text-foreground/60">
                        {qty} {unit}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-sm">
                    {money(amount)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
