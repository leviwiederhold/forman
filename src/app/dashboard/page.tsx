import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type QuoteRow = {
  id: string;
  trade: string | null;
  created_at: string;
  inputs_json: unknown;
  pricing_json: unknown;
};

function getCustomerName(inputs: unknown): string {
  if (!inputs || typeof inputs !== "object") return "Customer";
  const v = (inputs as { customer_name?: unknown }).customer_name;
  return typeof v === "string" && v.trim().length > 0 ? v : "Customer";
}

function getTotal(pricing: unknown): number | null {
  if (!pricing || typeof pricing !== "object") return null;
  const v = (pricing as { total?: unknown }).total;
  return typeof v === "number" ? v : null;
}

function fmtMoney(n: number | null) {
  if (n === null) return "—";
  return `$${n.toFixed(2)}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("id, trade, created_at, inputs_json, pricing_json")
    .order("created_at", { ascending: false })
    .limit(10);

  const rows: QuoteRow[] = (quotes ?? []) as QuoteRow[];

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-foreground/70">Dashboard</div>
          <h1 className="text-lg font-light tracking-wide">Welcome back</h1>
        </div>

        <div className="flex gap-2">
          <Link href="/quotes/new">
            <Button>New Quote</Button>
          </Link>
          <Link href="/settings/roofing">
            <Button variant="outline">Settings</Button>
          </Link>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="text-sm text-foreground/70">Recent quotes</div>

        {error ? (
          <div className="rounded-xl border bg-card p-4 text-sm text-destructive">
            Could not load quotes.
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6">
            <div className="text-sm text-foreground/80">No quotes yet</div>
            <div className="mt-1 text-sm text-foreground/60">
              Create your first Roofing quote to see it here.
            </div>
            <div className="mt-4">
              <Link href="/quotes/new">
                <Button>Start New Quote</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card">
            <div className="divide-y">
              {rows.map((q) => {
                const customer = getCustomerName(q.inputs_json);
                const total = getTotal(q.pricing_json);
                return (
                  <Link
                    key={q.id}
                    href={`/quotes/${q.id}`}
                    className="block px-4 py-3 hover:bg-white/5 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-foreground/85">
                          {customer}
                        </div>
                        <div className="mt-0.5 text-xs text-foreground/60">
                          {q.trade ?? "roofing"} · {fmtDate(q.created_at)}
                        </div>
                      </div>
                      <div className="text-sm text-foreground/85">
                        {fmtMoney(total)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
