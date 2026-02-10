import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types/json";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatExpiresIn, getQuoteExpirationStatus } from "@/lib/quotes/expiration";
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
  expires_at: string | null;
  share_token: string | null;

  // ✅ Profit guardrails persisted
  low_margin_acknowledged_at: string | null;
};

type SimilarQuoteRow = {
  id: string;
  subtotal: number | null;
  total: number | null;
};

type ProfitRow = {
  status: string | null;
  subtotal: number | null;
  total: number | null;
};

type QuoteViewRow = {
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number | null;
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

function calcMarginPct(subtotal: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return null;
  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
  return ((total - safeSubtotal) / total) * 100;
}

function calcProfit(subtotal: number, total: number) {
  const t = Number.isFinite(total) ? total : 0;
  const s = Number.isFinite(subtotal) ? subtotal : 0;
  return t - s;
}

function readMonthlyProfitTarget(profile: Record<string, unknown> | null): number | null {
  if (!profile) return null;

  const keys = [
    "monthly_profit_target",
    "monthly_profit_goal",
    "monthly_target_profit",
    "profit_target_monthly",
    "profit_goal_monthly",
  ];

  for (const key of keys) {
    const raw = profile[key];
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

function fmtDateTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
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
      "id, trade, customer_name, customer_address, status, subtotal, tax, total, line_items_json, created_at, expires_at, share_token, low_margin_acknowledged_at"
    )
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single<QuoteView>();

  if (error || !quote) redirect("/quotes");

  const items = asArray(quote.line_items_json);
  const SAMPLE_SIZE = 20;
  const MIN_SAMPLE_FOR_WARNING = 5;
  const MATERIAL_DROP_PCT = 5;

  const { data: similarRows } = await supabase
    .from("quotes")
    .select("id, subtotal, total")
    .eq("user_id", auth.user.id)
    .eq("trade", quote.trade)
    .order("created_at", { ascending: false })
    .limit(SAMPLE_SIZE + 1);

  const priorMargins = (similarRows ?? [])
    .filter((r): r is SimilarQuoteRow => Boolean(r && typeof r === "object"))
    .filter((r) => r.id !== quote.id)
    .map((r) => calcMarginPct(r.subtotal ?? 0, r.total ?? 0))
    .filter((m): m is number => typeof m === "number" && Number.isFinite(m))
    .slice(0, SAMPLE_SIZE);

  const currentMargin = calcMarginPct(quote.subtotal ?? 0, quote.total ?? 0);
  const baselineMargin = priorMargins.length
    ? priorMargins.reduce((sum, m) => sum + m, 0) / priorMargins.length
    : null;

  const isMateriallyLower =
    typeof currentMargin === "number" &&
    typeof baselineMargin === "number" &&
    priorMargins.length >= MIN_SAMPLE_FOR_WARNING &&
    currentMargin <= baselineMargin - MATERIAL_DROP_PCT;

  const comparisonWarning = isMateriallyLower
    ? `This quote margin (${currentMargin.toFixed(1)}%) is ${(
        baselineMargin - currentMargin
      ).toFixed(1)} points below your recent ${priorMargins.length} similar quotes (${baselineMargin.toFixed(
        1
      )}% avg).`
    : null;

  let monthlyTargetWarning: string | null = null;
  const quoteProfit = calcProfit(quote.subtotal ?? 0, quote.total ?? 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const [{ data: profile }, { data: mtdRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", auth.user.id)
      .maybeSingle<Record<string, unknown>>(),
    supabase
      .from("quotes")
      .select("status, subtotal, total")
      .eq("user_id", auth.user.id)
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const monthlyProfitTarget = readMonthlyProfitTarget(profile ?? null);
  if (monthlyProfitTarget) {
    const mtdProfit = (mtdRows ?? [])
      .filter((r): r is ProfitRow => Boolean(r && typeof r === "object"))
      .filter((r) => (r.status ?? "").toLowerCase() === "accepted")
      .reduce((sum, r) => sum + calcProfit(r.subtotal ?? 0, r.total ?? 0), 0);

    const projectedMtdProfit = mtdProfit + quoteProfit;
    const expectedMtdProfit = monthlyProfitTarget * (dayOfMonth / daysInMonth);

    if (projectedMtdProfit < expectedMtdProfit) {
      const shortfall = expectedMtdProfit - projectedMtdProfit;
      monthlyTargetWarning =
        `This job leaves you behind your month-to-date profit pace. ` +
        `Projected MTD profit: ${money(projectedMtdProfit)} vs expected ${money(expectedMtdProfit)} ` +
        `(${money(shortfall)} behind target pace).`;
    }
  }

  const { data: viewRow } = await supabase
    .from("quote_views")
    .select("first_viewed_at, last_viewed_at, view_count")
    .eq("quote_id", quote.id)
    .maybeSingle<QuoteViewRow>();

  const viewedAtLabel = fmtDateTime(viewRow?.last_viewed_at ?? null);
  const viewCount = typeof viewRow?.view_count === "number" ? viewRow.view_count : 0;
  const viewed = Boolean(viewRow?.first_viewed_at);
  const expiration = getQuoteExpirationStatus(quote.expires_at);
  const expiresSoonText = formatExpiresIn(expiration.msRemaining);
  const expiresAtLabel = fmtDate(quote.expires_at);

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
            <div className="mt-2 flex items-center gap-2">
              {viewed ? (
                <Badge variant="outline">Viewed</Badge>
              ) : (
                <Badge variant="secondary">Not viewed yet</Badge>
              )}
              <span className="text-xs text-foreground/60">
                {viewed
                  ? `Last viewed ${viewedAtLabel ?? "recently"}${viewCount > 1 ? ` · ${viewCount} views` : ""}`
                  : "Client has not opened the share link yet."}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {expiration.isExpired ? (
                <Badge variant="secondary" className="bg-destructive/15 text-destructive border-destructive/40">
                  Expired
                </Badge>
              ) : expiration.isExpiringSoon ? (
                <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                  {expiresSoonText ?? "Expiring soon"}
                </Badge>
              ) : null}
              {quote.expires_at ? (
                <span className="text-xs text-foreground/60">
                  Valid through {expiresAtLabel ?? "set expiration"}
                </span>
              ) : null}
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
            comparisonWarning={comparisonWarning}
            monthlyTargetWarning={monthlyTargetWarning}
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
