import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { calculateEffectiveMargin } from "@/lib/quotes/margin";
import { NewQuoteButton } from "@/components/new-quote-button";

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

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-foreground/70">Dashboard</div>
          <h1 className="text-lg font-light tracking-wide">Welcome back</h1>
        </div>

        <div className="flex gap-2">
          {/* ✅ popup gate */}
          <NewQuoteButton />

          <Button asChild variant="outline">
            <Link href="/settings/roofing">Pricing</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/reports">Reports</Link>
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Quoted (30d)" value={fmtMoney(totalQuoted)} />
        <Kpi label="Win rate" value={`${winRate.toFixed(1)}%`} />
        <Kpi label="Avg job" value={fmtMoney(avgJob)} />
        <Kpi label="Avg margin" value={`${avgMargin.toFixed(1)}%`} />
      </div>

      <section className="space-y-3">
        <div>
          <div className="text-sm text-foreground/70">Needs attention</div>
          <div className="text-xs text-foreground/50">
            Quotes below {TARGET_MARGIN}% margin (30 days)
          </div>
        </div>

        {flagged.length === 0 ? (
          <div className="rounded-2xl border bg-card p-4 text-sm text-foreground/70">
            No low-margin quotes. Nice work.
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

      <section className="space-y-3">
        <div className="text-sm text-foreground/70">Recent quotes</div>

        {rows5.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6">
            <div className="text-sm">No quotes yet</div>
            <div className="mt-4">
              {/* ✅ popup gate */}
              <NewQuoteButton />
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs text-foreground/60">{label}</div>
      <div className="mt-1 text-lg font-light tracking-wide">{value}</div>
    </div>
  );
}
