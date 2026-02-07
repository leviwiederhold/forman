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
    .select("id, created_at, status, total, pricing_json")
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

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-light tracking-wide">Insights</h1>
          <div className="text-xs text-foreground/60">Personalized tips + performance trends</div>
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
  <div className="text-sm text-foreground/70">Trend</div>
        <QuoteVolumeChart
          data={volume30}
          title="Quote volume (30 days)"
          subtitle="Quotes created per day"
        />
      </section>

      <section className="space-y-3">
        <div className="text-sm text-foreground/70">Last 30 days</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Quotes" value={`${s30.count}`} />
          <Kpi label="Quoted" value={fmtMoney(s30.totalQuoted)} />
          <Kpi label="Win rate" value={pct(s30.winRate)} />
          <Kpi label="Avg job" value={fmtMoney(s30.avgJob)} />
          <Kpi label="Avg margin" value={pct(s30.avgMargin)} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-sm text-foreground/70">Last 90 days</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Quotes" value={`${s90.count}`} />
          <Kpi label="Quoted" value={fmtMoney(s90.totalQuoted)} />
          <Kpi label="Win rate" value={pct(s90.winRate)} />
          <Kpi label="Avg job" value={fmtMoney(s90.avgJob)} />
          <Kpi label="Avg margin" value={pct(s90.avgMargin)} />
        </div>
      </section>

      <div className="rounded-2xl border bg-card p-4 text-sm text-foreground/70">
        This page is meant for trends. More reports can come later (filters, exports, pipeline).
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
      body: `Your average margin is ${pct(avgMargin)}. Most roofers aim for ~30% to cover overhead and surprises. Try tightening material markup or bumping labor slightly on your next few quotes.`,
      action: { label: "Review pricing", href: "/settings/roofing" },
    });
  } else if (avgMargin < 30) {
    cards.push({
      title: "Margin health",
      body: `Your average margin is ${pct(avgMargin)} — solid. If you want to push closer to 30%, start with small increases (1–3%) on labor or disposal and watch your win rate.`,
      action: { label: "Review pricing", href: "/settings/roofing" },
    });
  } else {
    cards.push({
      title: "Margin health",
      body: `Your average margin is ${pct(avgMargin)}. That’s a strong buffer for overhead and change orders. Keep an eye on low-margin outliers so you don’t give away profit.`,
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
        ? "Low-margin quotes are winning more often — be careful not to train customers to expect discounts."
        : diff <= -5
        ? "Low-margin quotes are NOT winning more often."
        : "Low-margin quotes are performing about the same.";
    cards.push({
      title: "Underbidding check",
      body: `You’ve created ${lowCount} quotes below 25% margin recently. ${direction} If you’re not seeing a real win-rate lift, raising margin is usually the smarter move.`,
      action: { label: "Open quotes", href: "/quotes" },
    });
  } else {
    cards.push({
      title: "Underbidding check",
      body: `Keep an eye on quotes below 25% margin. If underbids aren’t converting noticeably better, you’re usually better off protecting margin instead of chasing price.`,
      action: { label: "Open quotes", href: "/quotes" },
    });
  }

  // 3) Deposits
  if (!depositEnabled) {
    cards.push({
      title: "Deposits",
      body: `Deposits are currently off. Collecting even a small deposit reduces ghosting and helps lock in the schedule. If you want to offer deposits on share links, enable Stripe + set a deposit percent.`,
      action: { label: "Enable deposits", href: "/settings/roofing" },
    });
  } else {
    cards.push({
      title: "Deposits",
      body: `Deposits are enabled at ${depositPercent.toFixed(0)}%. Consider using deposits for higher-ticket jobs to reduce last-minute cancellations and keep your calendar predictable.`,
      action: { label: "Check deposit settings", href: "/settings/roofing" },
    });
  }

  // 4) Follow up
  if (olderPending > 0) {
    cards.push({
      title: "Follow-ups",
      body: `You have ${olderPending} quote(s) older than 7 days that aren’t accepted yet. A simple “Any questions?” follow‑up often bumps close rate without discounting.`,
      action: { label: "See quotes", href: "/quotes" },
    });
  } else {
    cards.push({
      title: "Follow ups",
      body: `No stale quotes right now. If you notice customers going quiet, try a short follow‑up message before offering discounts.`,
      action: { label: "See quotes", href: "/quotes" },
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="text-sm text-foreground/70">Next best moves</div>

        {locked ? (
          <a
            href="/billing"
            className="text-xs underline text-foreground/70 hover:text-foreground"
          >
            Unlock →
          </a>
        ) : null}
      </div>

      <div className="space-y-2">
        {cards.map((c, idx) => (
          <details
            key={c.title}
            className="group overflow-hidden rounded-2xl border bg-card transition will-change-transform hover:-translate-y-0.5 hover:shadow-sm"
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
                    Trial ended — unlock insights to keep improving margins.
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
    <div className="rounded-2xl border bg-card p-4 transition will-change-transform hover:-translate-y-0.5 hover:shadow-sm">
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
    <div className="rounded-2xl border bg-card p-4 transition will-change-transform hover:-translate-y-0.5 hover:shadow-sm">
      <div className="text-xs text-foreground/60">{label}</div>
      <div className="mt-1 text-lg font-medium">{value}</div>
    </div>
  );
}
