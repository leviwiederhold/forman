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
    ? "Finish setup"
    : count === 0
    ? "Create your first quote"
    : "This month at a glance";

  const subhead = !setupComplete
    ? "A couple quick steps and you'll be ready to send quotes."
    : count === 0
    ? "Once you send a quote, your stats and insights will show up here."
    : "A quick snapshot of your last 30 days.";

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-light tracking-wide">{headline}</h1>
        <div className="text-xs text-foreground/60">{subhead}</div>
      </div>

      <Separator />

      {!setupComplete ? (
        <SetupChecklist
          pricingSet={setup.pricingSet}
          stripeConnected={setup.stripeConnected}
          hasQuote={setup.hasQuote}
        />
      ) : null}

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
      helper: "These rates power your quote totals.",
    },
    {
      label: "Connect Stripe",
      done: stripeConnected,
      href: "/settings/billing",
      helper: "So customers can pay deposits directly to you.",
    },
    {
      label: "Create your first quote",
      done: hasQuote,
      href: "/quotes/new",
      helper: "Takes about 60 seconds once pricing is set.",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm text-foreground/70">Setup</div>
          <div className="text-lg font-medium">Complete these once</div>
          <div className="text-xs text-foreground/60">
            {doneCount}/3 complete · Most roofers finish this in under 5 minutes.
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
    <div className="rounded-2xl border bg-card p-4 transition will-change-transform hover:-translate-y-0.5 hover:shadow-sm">
      <div className="text-xs text-foreground/60">{label}</div>
      <div className="mt-1 text-lg font-light tracking-wide">{value}</div>
    </div>
  );
}
