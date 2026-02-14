import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PayDepositButton } from "@/components/pay-deposit-button";
import { ApproveAndMaybePayButton } from "@/components/approve-and-maybe-pay-button";
import { formatExpiresIn, getQuoteExpirationStatus } from "@/lib/quotes/expiration";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type QuoteShareView = {
  user_id: string;
  id: string;
  trade: string;
  customer_name: string | null;
  customer_address: string | null;
  status: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  created_at: string | null;
  expires_at: string | null;
  share_token: string | null;
  low_margin_acknowledged_at: string | null;
  deposit_paid_at: string | null;
  deposit_paid_cents: number | null;
};

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function money(n: number | null | undefined) {
  const val = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

function marginPct(subtotal: number, total: number) {
  if (total <= 0) return 0;
  return ((total - subtotal) / total) * 100;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isMissingTrackQuoteViewRpc(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  if (err.code === "PGRST202") return true;
  return (err.message ?? "").includes("track_quote_view");
}

export default async function QuoteSharePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const sp = (await searchParams) ?? {};

  const approvedViaQuery =
    sp.approved === "1" || (Array.isArray(sp.approved) && sp.approved[0] === "1");

  const supabase = await createSupabaseServerClient();

  const { data: quoteRow, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("share_token", token)
    .single<Record<string, unknown>>();

  if (error || !quoteRow) redirect("/");

  const row = asRecord(quoteRow);
  if (!row) redirect("/");

  const quote: QuoteShareView = {
    user_id: asString(row.user_id) ?? "",
    id: asString(row.id) ?? "",
    trade: asString(row.trade) ?? "",
    customer_name: asString(row.customer_name),
    customer_address: asString(row.customer_address),
    status: asString(row.status),
    subtotal: asNumber(row.subtotal),
    tax: asNumber(row.tax),
    total: asNumber(row.total),
    created_at: asString(row.created_at),
    expires_at: asString(row.expires_at),
    share_token: asString(row.share_token),
    low_margin_acknowledged_at: asString(row.low_margin_acknowledged_at),
    deposit_paid_at: asString(row.deposit_paid_at),
    deposit_paid_cents: asNumber(row.deposit_paid_cents),
  };

  // Record client view (idempotent row via upsert in DB function).
  // We intentionally keep this non-blocking for page rendering.
  const { error: viewTrackError } = await supabase.rpc("track_quote_view", {
    p_quote_id: quote.id,
    p_token: token,
  });
  if (viewTrackError && !isMissingTrackQuoteViewRpc(viewTrackError)) {
    console.warn("quote view tracking unavailable:", viewTrackError.message);
  }

  // IMPORTANT: share page is public → RLS blocks profiles/stripe_connect_accounts via anon client
  // Use admin client for these two lookups so the prospect can see deposit option if roofer enabled it.
  const admin = createSupabaseAdminClient();

  // Load roofer deposit preference + payments readiness
  const [{ data: prof }, { data: acct }] = await Promise.all([
    admin
      .from("profiles")
      .select("deposit_percent, accept_deposits_on_share")
      .eq("id", quote.user_id)
      .maybeSingle<{ deposit_percent: number | null; accept_deposits_on_share: boolean | null }>(),
    admin
      .from("stripe_connect_accounts")
      .select("charges_enabled")
      .eq("user_id", quote.user_id)
      .maybeSingle<{ charges_enabled: boolean }>(),
  ]);

  const acceptDeposits = Boolean(prof?.accept_deposits_on_share);
  const depositPercent =
    typeof prof?.deposit_percent === "number" && Number.isFinite(prof.deposit_percent)
      ? prof.deposit_percent
      : 0;

  const depositEnabled = acceptDeposits && depositPercent > 0 && Boolean(acct?.charges_enabled);

  const depositPaid = Boolean(quote.deposit_paid_at) || (quote.deposit_paid_cents ?? 0) > 0;

  const depositDueDollars =
    depositEnabled && !depositPaid
      ? Math.round((((quote.total ?? 0) * depositPercent) / 100) * 100) / 100
      : 0;

  const depositMessage =
    sp.deposit === "success"
      ? "Payment received. Thanks!"
      : sp.deposit === "cancel"
      ? "Payment cancelled."
      : null;

  const approvedViaStatus = (quote.status ?? "").toLowerCase() === "accepted";
  const approved = approvedViaQuery || approvedViaStatus;
  const createdLabel = formatDate(quote.created_at);
  const expiration = getQuoteExpirationStatus(quote.expires_at);
  const expiresAtLabel = formatDate(quote.expires_at);
  const isExpired = expiration.isExpired;
  const expiresSoonText = formatExpiresIn(expiration.msRemaining);

  // Server-enforced Profit Guardrail
  const TARGET_MARGIN = 30;
  const pct = marginPct(quote.subtotal ?? 0, quote.total ?? 0);

  if (pct < TARGET_MARGIN && !quote.low_margin_acknowledged_at) {
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
        {approved ? (
          <div className="mb-4 rounded-xl border p-3 text-sm">
            ✅ Approved — the contractor has been notified.
          </div>
        ) : null}

        <div className="text-xs text-foreground/60">Quote</div>
        <div className="mt-1 text-lg font-medium">{quote.customer_name ?? "Customer"}</div>
        <div className="mt-1 text-sm text-foreground/70">
          {quote.trade} · {createdLabel ?? ""}
        </div>

        {expiresAtLabel ? (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground/80">
            {isExpired ? (
              <Badge variant="secondary" className="mb-2 border-destructive/40 bg-destructive/15 text-destructive">
                Expired
              </Badge>
            ) : expiration.isExpiringSoon ? (
              <Badge variant="outline" className="mb-2 border-amber-500/40 text-amber-300">
                {expiresSoonText ?? "Expiring soon"}
              </Badge>
            ) : null}
            {isExpired
              ? `This quote expired on ${expiresAtLabel}. Contact your contractor to refresh pricing and availability.`
              : expiration.isExpiringSoon
              ? `${expiresSoonText ?? "Expiring soon"} · valid through ${expiresAtLabel}.`
              : `This quote is valid through ${expiresAtLabel}.`}
          </div>
        ) : null}

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
            <div className="font-medium">What’s excluded</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/70">
              <li>Hidden structural repairs discovered after tear-off</li>
              <li>Permit fees unless explicitly listed by contractor</li>
              <li>Change requests not included in this scope</li>
            </ul>
          </div>

          <div className="rounded-xl border p-4 text-sm">
            <div className="font-medium">Timeline of work</div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-foreground/70">
              <li>Approval and scheduling confirmation</li>
              <li>Material delivery and site preparation</li>
              <li>Installation and daily cleanup (typically 1–3 days)</li>
              <li>Final walkthrough and closeout</li>
            </ol>
          </div>

          <div className="rounded-xl border p-4 text-sm">
            <div className="font-medium">Trust & warranty</div>
            <div className="mt-2 text-foreground/70">
              Licensed & insured. Warranty details provided by the contractor.
            </div>
          </div>
        </div>

        {/* Deposit payment (optional, roofer-controlled; only after approval) */}
        {depositEnabled && approved ? (
          <div className="mt-6 rounded-xl border p-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">Deposit</div>
              <div className="text-foreground/70">{depositPercent.toFixed(0)}%</div>
            </div>

            <div className="mt-2 text-foreground/70">
              To reserve your spot, deposit due today:{" "}
              <span className="font-medium">{money(depositDueDollars)}</span>
            </div>
            <div className="mt-2 text-xs text-foreground/60">
              The remaining balance is handled directly with your contractor at completion.
            </div>

            {depositMessage ? (
              <div className="mt-2 text-xs text-foreground/60">{depositMessage}</div>
            ) : null}

            {depositPaid ? (
              <div className="mt-3 rounded-lg border p-2 text-xs">
                ✅ Deposit paid — the contractor has been notified.
              </div>
            ) : isExpired ? (
              <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                Quote is expired. Deposit payment is no longer available.
              </div>
            ) : (
              <div className="mt-3">
                <PayDepositButton token={token} quoteId={quote.id} />
                <div className="mt-2 text-xs text-foreground/60">
                  Secure payment powered by Stripe.
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Approve (client-side: approve → maybe redirect later) */}
        {approved ? null : isExpired ? (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            This quote has expired and can no longer be approved online.
          </div>
        ) : (
          <div className="mt-6">
            <ApproveAndMaybePayButton
              token={token}
              quoteId={quote.id}
            />
            <div className="mt-2 text-xs text-foreground/60">
              Approval notifies the contractor.
              {depositEnabled && !depositPaid ? " You can pay the deposit right after approval." : ""}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-foreground/50">
          Subtotal: {money(quote.subtotal)} · Tax: {money(quote.tax)}
        </div>
      </div>
    </main>
  );
}
