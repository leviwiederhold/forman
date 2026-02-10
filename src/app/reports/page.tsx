import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Separator } from "@/components/ui/separator";
import { calculateEffectiveMargin } from "@/lib/quotes/margin";
import { getEntitlements } from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";

type QuoteRow = {
  id: string;
  created_at: string;
  status: string | null;
  total: number | null;
  subtotal: number | null;
  trade: string | null;
  customer_name: string | null;
  customer_address: string | null;
  deposit_paid_at: string | null;
  pricing_json: unknown;
};

type DailyPoint = { day: string; count: number };

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(n) ? n : 0
  );
}

function pct(n: number) {
  return `${(Number.isFinite(n) ? n : 0).toFixed(0)}%`;
}

async function loadRange(days: number, userId: string) {
  const supabase = await createSupabaseServerClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("quotes")
    .select(
      "id, created_at, status, total, subtotal, trade, customer_name, customer_address, deposit_paid_at, pricing_json"
    )
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(1000);

  return (data ?? []) as QuoteRow[];
}


function summarize(rows: QuoteRow[]) {
  let count = 0;
  let wonCount = 0;
  let totalQuoted = 0;
  let marginSum = 0;

  let lowCount = 0;
  let lowWon = 0;
  let healthyCount = 0;
  let healthyWon = 0;

  // For simple “follow up” signal
  let olderPending = 0;

  const LOW_MARGIN = 25;

  for (const r of rows) {
    count += 1;

    const status = (r.status ?? "").toLowerCase();
    const accepted = status === "accepted";
    if (accepted) wonCount += 1;

    const t = typeof r.total === "number" ? r.total : 0;
    totalQuoted += t;

    const m = calculateEffectiveMargin(r.pricing_json).marginPct;
    marginSum += m;

    if (m < LOW_MARGIN) {
      lowCount += 1;
      if (accepted) lowWon += 1;
    } else {
      healthyCount += 1;
      if (accepted) healthyWon += 1;
    }

    const created = new Date(r.created_at).getTime();
    const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
    // “Pending” = anything not accepted (draft/sent/viewed/etc)
    if (!accepted && ageDays >= 7) olderPending += 1;
  }

  const winRate = count ? (wonCount / count) * 100 : 0;
  const avgJob = count ? totalQuoted / count : 0;
  const avgMargin = count ? marginSum / count : 0;

  const lowWinRate = lowCount ? (lowWon / lowCount) * 100 : null;
  const healthyWinRate = healthyCount ? (healthyWon / healthyCount) * 100 : null;

  return {
    count,
    totalQuoted,
    winRate,
    avgJob,
    avgMargin,
    lowCount,
    lowWinRate,
    healthyCount,
    healthyWinRate,
    olderPending,
  };
}


function buildDailySeries(rows: QuoteRow[], days: number): DailyPoint[] {
  // Build a stable, gap-free daily series for the last N days.
  // day is formatted as "MM/DD" for display.
  const byDay = new Map<string, number>();

  for (const r of rows) {
    const d = new Date(r.created_at);
    // Normalize to local day string key YYYY-MM-DD
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const out: DailyPoint[] = [];
  const today = new Date();
  // Start days-1 ago through today
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(
      2,
      "0"
    )}`;
    out.push({ day: label, count: byDay.get(key) ?? 0 });
  }
  return out;
}

function buildDecisionSignals(rows: QuoteRow[]) {
  const signals: string[] = [];

  const accepted = (r: QuoteRow) => (r.status ?? "").toLowerCase() === "accepted";
  const validTotal = (r: QuoteRow) =>
    typeof r.total === "number" && Number.isFinite(r.total) ? r.total : 0;
  const validSubtotal = (r: QuoteRow) =>
    typeof r.subtotal === "number" && Number.isFinite(r.subtotal) ? r.subtotal : 0;
  const closeRate = (items: QuoteRow[]) =>
    items.length ? (items.filter(accepted).length / items.length) * 100 : 0;

  const withDepositPaid = rows.filter((r) => Boolean(r.deposit_paid_at));
  const withoutDepositPaid = rows.filter((r) => !r.deposit_paid_at);
  if (withDepositPaid.length >= 3 && withoutDepositPaid.length >= 3) {
    const withRate = closeRate(withDepositPaid);
    const withoutRate = closeRate(withoutDepositPaid);
    const diff = withRate - withoutRate;
    if (Math.abs(diff) >= 5) {
      signals.push(
        `Jobs with deposits close ${Math.round(Math.abs(diff))}% ${
          diff >= 0 ? "more often" : "less often"
        } (${Math.round(withRate)}% vs ${Math.round(withoutRate)}%). ${
          diff >= 0
            ? "Use deposits earlier on larger bids to protect your calendar."
            : "Review deposit timing so it helps close, not friction."
        }`
      );
    }
  }

  const isStormLike = (r: QuoteRow) =>
    `${r.trade ?? ""} ${r.customer_name ?? ""} ${r.customer_address ?? ""}`
      .toLowerCase()
      .includes("storm");
  const daysToDeposit = (r: QuoteRow) => {
    if (!r.deposit_paid_at) return null;
    const start = new Date(r.created_at).getTime();
    const paid = new Date(r.deposit_paid_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(paid)) return null;
    const days = (paid - start) / (1000 * 60 * 60 * 24);
    return days >= 0 ? days : null;
  };
  const stormPaid = rows.filter((r) => isStormLike(r)).map(daysToDeposit).filter((d): d is number => d !== null);
  const nonStormPaid = rows
    .filter((r) => !isStormLike(r))
    .map(daysToDeposit)
    .filter((d): d is number => d !== null);
  if (stormPaid.length >= 3 && nonStormPaid.length >= 3) {
    const avgStorm = stormPaid.reduce((s, d) => s + d, 0) / stormPaid.length;
    const avgNonStorm = nonStormPaid.reduce((s, d) => s + d, 0) / nonStormPaid.length;
    if (Math.abs(avgNonStorm - avgStorm) >= 1) {
      signals.push(
        `Storm jobs ${
          avgStorm < avgNonStorm ? "pay faster" : "pay slower"
        } (${avgStorm.toFixed(1)} days to deposit vs ${avgNonStorm.toFixed(
          1
        )}). ${avgStorm < avgNonStorm ? "Prioritize storm follow-ups while urgency is high." : "Tighten storm follow-up timing to speed cash flow."}`
      );
    }
  }

  const totals = rows.map(validTotal).filter((t) => t > 0).sort((a, b) => a - b);
  if (totals.length >= 8) {
    const pivot = totals[Math.floor(totals.length * 0.75)] ?? 0;
    const highValue = rows.filter((r) => validTotal(r) >= pivot);
    const baseValue = rows.filter((r) => validTotal(r) > 0 && validTotal(r) < pivot);

    const pendingAges = (items: QuoteRow[]) =>
      items
        .filter((r) => !accepted(r))
        .map((r) => (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))
        .filter((d) => Number.isFinite(d) && d >= 0);
    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

    const highPendingAges = pendingAges(highValue);
    const basePendingAges = pendingAges(baseValue);

    const acceptedProfit = (items: QuoteRow[]) =>
      items
        .filter(accepted)
        .map((r) => validTotal(r) - validSubtotal(r))
        .filter((n) => Number.isFinite(n));
    const highProfit = acceptedProfit(highValue);
    const baseProfit = acceptedProfit(baseValue);

    if (highPendingAges.length >= 3 && basePendingAges.length >= 3 && highProfit.length >= 3 && baseProfit.length >= 3) {
      const pendingGap = avg(highPendingAges) - avg(basePendingAges);
      const profitGap = avg(highProfit) - avg(baseProfit);
      if (pendingGap >= 1.5 && profitGap > 0) {
        signals.push(
          `High-value quotes close slower (about ${pendingGap.toFixed(
            1
          )} more days waiting) but earn ${fmtMoney(profitGap)} more profit per win. Start follow-up earlier on premium bids.`
        );
      }
    }
  }

  if (signals.length === 0) {
    signals.push(
      "Not enough pattern data yet for strong recommendations. Keep sending quotes and this section will turn into concrete playbook advice."
    );
  }

  return signals.slice(0, 4);
}

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

const ent = await getEntitlements();
const insightsLocked = !ent.canCreateQuotes;


  const rows30 = await loadRange(30, auth.user.id);
  const rows90 = await loadRange(90, auth.user.id);

const [{ data: prof }, { data: acct }] = await Promise.all([
  supabase
    .from("profiles")
    .select("deposit_percent, accept_deposits_on_share")
    .eq("id", auth.user.id)
    .maybeSingle<{ deposit_percent: number | null; accept_deposits_on_share: boolean | null }>(),
  supabase
    .from("stripe_connect_accounts")
    .select("charges_enabled")
    .eq("user_id", auth.user.id)
    .maybeSingle<{ charges_enabled: boolean | null }>(),
]);

const depositPercent =
  typeof prof?.deposit_percent === "number" && Number.isFinite(prof.deposit_percent)
    ? prof.deposit_percent
    : 0;
const depositEnabled = Boolean(prof?.accept_deposits_on_share) && depositPercent > 0 && Boolean(acct?.charges_enabled);

  const s30 = summarize(rows30);
  const s90 = summarize(rows90);
  const volume30 = buildDailySeries(rows30, 30);
  const decisions = buildDecisionSignals(rows90);

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium tracking-tight">Insights</h1>
          <div className="text-sm text-foreground/65">Practical recommendations from your quote history.</div>
        </div>
      </div>


<Separator />

<InsightsSection
  locked={insightsLocked}
  avgMargin={s90.avgMargin}
  lowCount={s90.lowCount}
  lowWinRate={s90.lowWinRate}
  healthyWinRate={s90.healthyWinRate}
  olderPending={s90.olderPending}
  depositEnabled={depositEnabled}
  depositPercent={depositPercent}
/>

<section className="space-y-3">
  <div className="text-sm font-medium text-foreground/85">Decision signals</div>
  <div className="rounded-2xl border bg-card p-4">
    <div className="space-y-2 text-sm text-foreground/80">
      {decisions.map((line, idx) => (
        <p key={`${idx}-${line}`}>{line}</p>
      ))}
    </div>
  </div>
</section>

<section className="space-y-3">
  <div className="text-sm font-medium text-foreground/85">Trend</div>
        <QuoteVolumeChart
          data={volume30}
          title="Quote volume (30 days)"
          subtitle="Quotes created per day"
        />
      </section>

      <section className="space-y-3">
        <div className="text-sm font-medium text-foreground/85">Last 30 days</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Quotes" value={`${s30.count}`} />
          <Kpi label="Quoted" value={fmtMoney(s30.totalQuoted)} />
          <Kpi label="Win rate" value={pct(s30.winRate)} />
          <Kpi label="Avg job" value={fmtMoney(s30.avgJob)} />
          <Kpi label="Avg margin" value={pct(s30.avgMargin)} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-sm font-medium text-foreground/85">Last 90 days</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Quotes" value={`${s90.count}`} />
          <Kpi label="Quoted" value={fmtMoney(s90.totalQuoted)} />
          <Kpi label="Win rate" value={pct(s90.winRate)} />
          <Kpi label="Avg job" value={fmtMoney(s90.avgJob)} />
          <Kpi label="Avg margin" value={pct(s90.avgMargin)} />
        </div>
      </section>

      <div className="rounded-2xl border bg-card p-4 text-sm text-foreground/70">
        Use these signals to adjust pricing, follow-up timing, and deposit strategy.
      </div>
    </main>
  );
}


function InsightsSection({
  locked,
  avgMargin,
  lowCount,
  lowWinRate,
  healthyWinRate,
  olderPending,
  depositEnabled,
  depositPercent,
}: {
  locked: boolean;
  avgMargin: number;
  lowCount: number;
  lowWinRate: number | null;
  healthyWinRate: number | null;
  olderPending: number;
  depositEnabled: boolean;
  depositPercent: number;
}) {
  const cards: Array<{
    title: string;
    body: string;
    action?: { label: string; href: string };
  }> = [];

  // 1) Margin health
  if (avgMargin < 25) {
    cards.push({
      title: "Margin health",
      body: `Average margin is ${pct(avgMargin)}. You are likely underpricing relative to overhead risk. Raise labor or material pricing in small steps and monitor close rate.`,
      action: { label: "Review pricing", href: "/settings/roofing" },
    });
  } else if (avgMargin < 30) {
    cards.push({
      title: "Margin health",
      body: `Average margin is ${pct(avgMargin)}. Performance is healthy. If you want more cushion, test modest increases and track conversion before making larger changes.`,
      action: { label: "Review pricing", href: "/settings/roofing" },
    });
  } else {
    cards.push({
      title: "Margin health",
      body: `Average margin is ${pct(avgMargin)}. This gives strong protection for overhead and change orders. Focus on eliminating low-margin outliers.`,
      action: { label: "View low-margin quotes", href: "/quotes" },
    });
  }

  // 2) Underbidding signal
  if (lowCount >= 3) {
    const lw = lowWinRate ?? 0;
    const hw = healthyWinRate ?? 0;
    const diff = lw - hw;
    const direction =
      diff >= 5
        ? "Low-margin quotes are winning more often."
        : diff <= -5
        ? "Low-margin quotes are not winning more often."
        : "Low-margin quotes are performing about the same.";
    cards.push({
      title: "Underbidding check",
      body: `You have ${lowCount} quotes below 25% margin. ${direction} If lift is minimal, increase margin rather than discounting.`,
      action: { label: "Open quotes", href: "/quotes" },
    });
  } else {
    cards.push({
      title: "Underbidding check",
      body: `Few recent quotes are below 25% margin. Keep pricing discipline and avoid lowering price without a measurable conversion benefit.`,
      action: { label: "Open quotes", href: "/quotes" },
    });
  }

  // 3) Deposits
  if (!depositEnabled) {
    cards.push({
      title: "Deposits",
      body: `Deposits are off. Enabling deposits improves commitment and helps stabilize schedule planning.`,
      action: { label: "Enable deposits", href: "/settings/roofing" },
    });
  } else {
    cards.push({
      title: "Deposits",
      body: `Deposits are enabled at ${depositPercent.toFixed(0)}%. Keep using them for higher-value work to reduce late cancellations.`,
      action: { label: "Check deposit settings", href: "/settings/roofing" },
    });
  }

  // 4) Follow up
  if (olderPending > 0) {
    cards.push({
      title: "Follow-ups",
      body: `${olderPending} quote(s) are older than 7 days without acceptance. Prioritize concise follow-ups before considering price changes.`,
      action: { label: "See quotes", href: "/quotes" },
    });
  } else {
    cards.push({
      title: "Follow-ups",
      body: `No stale quotes right now. Maintain a consistent follow-up cadence to preserve close rate without discounting.`,
      action: { label: "See quotes", href: "/quotes" },
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="text-sm font-medium text-foreground/85">Recommended actions</div>

        {locked ? (
          <a
            href="/billing"
            className="text-xs underline text-foreground/70 hover:text-foreground"
          >
            Unlock
          </a>
        ) : null}
      </div>

      <div className="space-y-2">
        {cards.map((c, idx) => (
          <details
            key={c.title}
            className="group overflow-hidden rounded-2xl border bg-card"
            open={idx === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm">
              <span className="font-medium">{c.title}</span>
              <span className="text-xs text-foreground/60 transition group-open:rotate-180">▾</span>
            </summary>

            <div className="relative border-t border-white/10 px-4 py-4">
              <div
                className={
                  locked
                    ? "text-sm text-foreground/70 blur-sm select-none"
                    : "text-sm text-foreground/70"
                }
              >
                {c.body}
              </div>

              {locked ? (
                <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-background/90 via-background/30 to-transparent px-4 py-4">
                  <div className="text-xs text-foreground/70">
                    Trial ended. Subscribe to view full recommendations.
                  </div>
                  <a
                    href="/billing"
                    className="rounded-lg border bg-background/60 px-3 py-1.5 text-xs transition hover:bg-white/5"
                  >
                    Subscribe
                  </a>
                </div>
              ) : c.action ? (
                <a
                  href={c.action.href}
                  className="mt-3 inline-flex text-xs underline text-foreground/70 hover:text-foreground"
                >
                  {c.action.label}
                </a>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}


function QuoteVolumeChart({
  data,
  title,
  subtitle,
}: {
  data: DailyPoint[];
  title: string;
  subtitle?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-foreground/85">{title}</div>
          {subtitle ? <div className="text-xs text-foreground/60">{subtitle}</div> : null}
        </div>
        <div className="text-xs text-foreground/60">Max/day: {max}</div>
      </div>

      <div className="mt-4">
        <div className="flex items-end gap-1">
          {data.map((d, idx) => {
            const h = Math.round((d.count / max) * 64); // px
            return (
              <div key={`${d.day}-${idx}`} className="flex w-full flex-col items-center gap-1">
                <div
                  className="w-full rounded-md bg-foreground/20"
                  style={{ height: `${Math.max(4, h)}px` }}
                  title={`${d.day}: ${d.count}`}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex justify-between text-[10px] text-foreground/50">
          <span>{data[0]?.day}</span>
          <span>{data[Math.floor(data.length / 2)]?.day}</span>
          <span>{data[data.length - 1]?.day}</span>
        </div>
      </div>
    </div>
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
