import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Separator } from "@/components/ui/separator";
import { calculateEffectiveMargin } from "@/lib/quotes/margin";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type QuoteRow = {
  id: string;
  trade: string | null;
  created_at: string;
  customer_name?: string | null;
  status?: string | null;
  total?: number | null;
  inputs_json?: unknown;
  pricing_json?: unknown;
};

function getCustomerName(inputs: unknown): string {
  if (!inputs || typeof inputs !== "object") return "Customer";
  const v = (inputs as { customer_name?: unknown }).customer_name;
  return typeof v === "string" && v.trim().length > 0 ? v : "Customer";
}

function getCustomerName2(row: QuoteRow): string {
  if (row.customer_name && row.customer_name.trim()) return row.customer_name;
  return getCustomerName(row.inputs_json);
}

function getTotal(pricing: unknown): number | null {
  if (!pricing || typeof pricing !== "object") return null;
  const v = (pricing as { total?: unknown }).total;
  return typeof v === "number" ? v : null;
}

function getTotal2(row: QuoteRow): number | null {
  if (typeof row.total === "number") return row.total;
  return getTotal(row.pricing_json);
}

function fmtMoney(n: number | null) {
  if (n === null) return "—";
  return `$${n.toFixed(2)}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildWeeklyReminder(rows30: QuoteRow[]): string | null {
  if (!rows30.length) return null;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weekRows = rows30.filter((r) => new Date(r.created_at) >= weekAgo);
  if (!weekRows.length) {
    return "Weekly reminder: no quotes sent in the last 7 days. Send at least 3 quotes this week to keep your pipeline warm.";
  }

  const accepted = weekRows.filter((r) => (r.status ?? "").toLowerCase() === "accepted");
  const closeRate = (accepted.length / weekRows.length) * 100;
  const avgMargin =
    weekRows.reduce((sum, r) => sum + calculateEffectiveMargin(r.pricing_json).marginPct, 0) /
    weekRows.length;

  if (avgMargin < 25) {
    return `Weekly reminder: average margin is ${avgMargin.toFixed(
      1
    )}% this week. Tighten pricing on new quotes before discounting.`;
  }

  if (closeRate < 30) {
    return `Weekly reminder: close rate is ${closeRate.toFixed(
      0
    )}% this week. Follow up within 24 hours on open quotes to improve conversion.`;
  }

  return `Weekly reminder: you're at ${closeRate.toFixed(
    0
  )}% close rate with ${avgMargin.toFixed(1)}% margin this week. Keep pricing discipline and continue quick follow-up.`;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: recent30 } = await supabase
    .from("quotes")
    .select("id, trade, created_at, customer_name, status, total, pricing_json, inputs_json")
    .eq("user_id", auth.user.id)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(300);

  const { data: recent5 } = await supabase
    .from("quotes")
    .select("id, trade, created_at, customer_name, total, pricing_json, inputs_json")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const rows30 = (recent30 ?? []) as QuoteRow[];
  const rows5 = (recent5 ?? []) as QuoteRow[];

// Setup checklist (activation)
const [{ data: rateCard }, { data: connectAcct }] = await Promise.all([
  supabase
    .from("rate_cards")
    .select("id, updated_at")
    .eq("user_id", auth.user.id)
    .eq("trade", "roofing")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; updated_at: string | null }>(),
  supabase
    .from("stripe_connect_accounts")
    .select("charges_enabled")
    .eq("user_id", auth.user.id)
    .maybeSingle<{ charges_enabled: boolean | null }>(),
]);

const setup = {
  pricingSet: Boolean(rateCard?.id),
  stripeConnected: Boolean(connectAcct?.charges_enabled),
  hasQuote: rows5.length > 0,
};

const setupComplete = setup.pricingSet && setup.stripeConnected && setup.hasQuote;

  let totalQuoted = 0;
  let count = 0;
  let wonCount = 0;
  let marginSum = 0;

  const TARGET_MARGIN = 25;
  const flagged: Array<{
    id: string;
    trade: string | null;
    created_at: string;
    customer: string;
    total: number | null;
    marginPct: number;
  }> = [];

  for (const q of rows30) {
    const total = getTotal2(q);
    const m = calculateEffectiveMargin(q.pricing_json);

    if (total !== null) totalQuoted += total;
    count += 1;
    marginSum += m.marginPct;

    const status = (q.status ?? "").toLowerCase();

    // Win rate = accepted / total quotes (drafts count as losses).
    if (status === "accepted") wonCount += 1;

    if (m.marginPct < TARGET_MARGIN) {
      flagged.push({
        id: q.id,
        trade: q.trade,
        created_at: q.created_at,
        customer: getCustomerName2(q),
        total,
        marginPct: m.marginPct,
      });
    }
  }

  const winRate = count ? (wonCount / count) * 100 : 0;
  const avgJob = count ? totalQuoted / count : 0;
  const avgMargin = count ? marginSum / count : 0;

  const headline = !setupComplete
    ? "Complete setup"
    : count === 0
    ? "Create your first quote"
    : "Monthly snapshot";

  const subhead = !setupComplete
    ? "Complete these steps once to start sending quotes with confidence."
    : count === 0
    ? "Performance and recommendations will appear after your first quote."
    : "A clear view of your last 30 days.";
  const weeklyReminder = buildWeeklyReminder(rows30);

  return (
    <main className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">{headline}</h1>
        <div className="text-sm text-foreground/65">{subhead}</div>
      </div>

      <Separator />

      {!setupComplete ? (
        <SetupChecklist
          pricingSet={setup.pricingSet}
          stripeConnected={setup.stripeConnected}
          hasQuote={setup.hasQuote}
        />
      ) : null}

      {!setup.hasQuote ? (
        <section className="rounded-2xl border bg-card p-5">
          <div className="text-sm font-medium">Send your first quote in under 5 minutes</div>
          <div className="mt-1 text-sm text-foreground/70">
            Start with customer details, confirm scope, then send. You will immediately see view status, expiry, and follow-up prompts.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/quotes/new">Start first quote</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/roofing">Check pricing</Link>
            </Button>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Quoted (30d)" value={fmtMoney(totalQuoted)} />
        <Kpi label="Win rate" value={`${winRate.toFixed(1)}%`} />
        <Kpi label="Avg job" value={fmtMoney(avgJob)} />
        <Kpi label="Avg margin" value={`${avgMargin.toFixed(1)}%`} />
      </div>

      {weeklyReminder ? (
        <section className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-foreground/55">Weekly reminder</div>
          <div className="mt-1 text-sm text-foreground/80">{weeklyReminder}</div>
          <div className="mt-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/reports">Review insights</Link>
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <div className="text-sm font-medium text-foreground/85">Needs attention</div>
          <div className="text-xs text-foreground/50">
            Quotes below {TARGET_MARGIN}% margin (30 days)
          </div>
        </div>

        {flagged.length === 0 ? (
          <div className="rounded-2xl border bg-card p-5 text-sm text-foreground/70">
            No low-margin quotes in the last 30 days.
          </div>
        ) : (
          <div className="rounded-2xl border bg-card divide-y">
            {flagged.slice(0, 5).map((q) => (
              <Link
                key={q.id}
                href={`/quotes/${q.id}`}
                className="block px-4 py-3 hover:bg-white/5 transition"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="text-sm">{q.customer}</div>
                    <div className="text-xs text-foreground/60">
                      {q.trade} · {fmtDate(q.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{fmtMoney(q.total)}</div>
                    <div className="text-xs text-destructive">
                      {q.marginPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="text-sm font-medium text-foreground/85">Recent quotes</div>

        {rows5.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6">
            <div className="text-sm">No quotes yet</div>
            <div className="mt-4">
              {/* ✅ popup gate */}
              <Button asChild className="w-full">
  <Link href="/quotes/new">New Quote</Link>
</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card divide-y">
            {rows5.map((q) => (
              <Link
                key={q.id}
                href={`/quotes/${q.id}`}
                className="block px-4 py-3 hover:bg-white/5 transition"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="text-sm">{getCustomerName2(q)}</div>
                    <div className="text-xs text-foreground/60">
                      {q.trade} · {fmtDate(q.created_at)}
                    </div>
                  </div>
                  <div className="text-sm">{fmtMoney(getTotal2(q))}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}


function SetupChecklist({
  pricingSet,
  stripeConnected,
  hasQuote,
}: {
  pricingSet: boolean;
  stripeConnected: boolean;
  hasQuote: boolean;
}) {
  const items = [
    {
      label: "Set your pricing",
      done: pricingSet,
      href: "/settings/roofing",
      helper: "These rates drive quote totals.",
    },
    {
      label: "Connect Stripe",
      done: stripeConnected,
      href: "/settings/billing",
      helper: "Enable customer deposits and online payments.",
    },
    {
      label: "Create your first quote",
      done: hasQuote,
      href: "/quotes/new",
      helper: "Once sent, your dashboard insights unlock.",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm text-foreground/70">Setup</div>
          <div className="text-lg font-medium">One-time setup</div>
          <div className="text-xs text-foreground/60">
            {doneCount}/3 complete.
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {items.map((it) => (
          <Link
            key={it.label}
            href={it.href}
            className="group flex items-start justify-between rounded-xl border bg-background/40 px-4 py-3 transition hover:bg-white/5"
          >
            <div className="pr-3">
              <div className="text-sm">
                <span className={it.done ? "text-emerald-500" : "text-foreground/80"}>
                  {it.done ? "✓" : "•"}
                </span>{" "}
                <span className={it.done ? "line-through text-foreground/50" : ""}>{it.label}</span>
              </div>
              <div className="mt-1 text-xs text-foreground/60">{it.helper}</div>
            </div>
            <div className="text-xs text-foreground/50 transition group-hover:text-foreground/70">
              {it.done ? "Done" : "Open →"}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}


function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="text-xs text-foreground/60">{label}</div>
      <div className="mt-1 text-xl font-medium tracking-tight">{value}</div>
    </div>
  );
}
