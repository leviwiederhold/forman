import { createClient } from "@supabase/supabase-js";
import ShareRespondButtons from "./share-respond-buttons";

type PageProps = { params: Promise<{ token: string }> };

function money(n: unknown) {
  const v = Number(n ?? 0);
  return `$${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
}

export default async function QuoteSharePage({ params }: PageProps) {
  const { token } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          // Required for public RLS access
          "x-share-token": token,
        },
      },
    }
  );

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
      created_at,
      accepted_at,
      rejected_at
    `
    )
    .eq("share_token", token)
    .single();

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          This quote link is invalid or no longer available.
        </div>
      </div>
    );
  }

  const status = String(quote.status ?? "draft");
  const isFinal = status === "accepted" || status === "rejected";

  const items = Array.isArray(quote.line_items_json)
    ? quote.line_items_json
    : [];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* HEADER */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-white/60">
            Quote
          </div>

          <h1 className="mt-1 text-2xl font-light">
            {quote.customer_name || "Customer"}
          </h1>

          {quote.customer_address ? (
            <div className="mt-1 text-sm text-white/70">
              {quote.customer_address}
            </div>
          ) : null}

          <div className="mt-2 text-sm text-white/70">
            Status: <span className="text-white">{status}</span>
          </div>

          {isFinal ? (
            <div className="mt-2 text-xs text-white/60">
              {status === "accepted" && quote.accepted_at
                ? `Accepted: ${new Date(quote.accepted_at).toLocaleString()}`
                : null}
              {status === "rejected" && quote.rejected_at
                ? `Rejected: ${new Date(quote.rejected_at).toLocaleString()}`
                : null}
            </div>
          ) : null}
        </div>

        {/* TOTALS */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm text-white/70">Total</div>
            <div className="text-3xl font-light">
              {money(quote.total)}
            </div>
          </div>
          <div className="mt-2 text-sm text-white/70">
            Subtotal {money(quote.subtotal)} · Tax {money(quote.tax)}
          </div>
        </div>

        {/* RESPOND */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-3 text-sm uppercase tracking-wider text-white/60">
            Respond
          </div>

          <ShareRespondButtons token={token} disabled={isFinal} />

          <div className="mt-3 text-xs text-white/60">
            {isFinal
              ? `This quote has already been ${status}.`
              : "Accepting or rejecting will update the quote status."}
          </div>
        </div>

        {/* LINE ITEMS */}
        <div className="mt-8">
          <div className="mb-3 text-sm uppercase tracking-wider text-white/60">
            Line items
          </div>

          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
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
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div>
                      <div className="text-base font-light">
                        {String(name)}
                      </div>
                      {qty != null ? (
                        <div className="text-sm text-white/60">
                          {qty} {unit}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-base">
                      {money(amount)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-8 text-xs text-white/50">
            This is a read-only shared link.
          </div>
        </div>
      </div>
    </div>
  );
}
