import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Separator } from "@/components/ui/separator";
import { calculateEffectiveMargin } from "@/lib/quotes/margin";

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

  for (const r of rows) {
    count += 1;

    const status = (r.status ?? "").toLowerCase();
    // Win rate assumes any non-accepted quote is a loss (including drafts).
    if (status === "accepted") wonCount += 1;

    const t = typeof r.total === "number" ? r.total : 0;
    totalQuoted += t;
    marginSum += calculateEffectiveMargin(r.pricing_json).marginPct;
  }

  const winRate = count ? (wonCount / count) * 100 : 0;
  const avgJob = count ? totalQuoted / count : 0;
  const avgMargin = count ? marginSum / count : 0;

  return { count, totalQuoted, winRate, avgJob, avgMargin };
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

  const rows30 = await loadRange(30, auth.user.id);
  const rows90 = await loadRange(90, auth.user.id);

  const s30 = summarize(rows30);
  const s90 = summarize(rows90);
  const volume30 = buildDailySeries(rows30, 30);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-foreground/70">Reports</div>
          <h1 className="text-lg font-light tracking-wide">Analytics</h1>
          <div className="text-xs text-foreground/60">Trends and performance over time</div>
        </div>
      </div>

      <Separator />

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
    <div className="rounded-2xl border bg-card p-4">
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
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs text-foreground/60">{label}</div>
      <div className="mt-1 text-lg font-medium">{value}</div>
    </div>
  );
}
