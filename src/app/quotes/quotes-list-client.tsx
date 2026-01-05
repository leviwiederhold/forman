"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

type QuoteRow = {
  id: string;
  trade: string | null;
  created_at: string;
  customer_name: string | null;
  status: string | null;
  total: number | null;
};

function getCustomerName(name: string | null): string {
  return name && name.trim().length > 0 ? name : "Customer";
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

export default function QuotesListClient({ initialQuotes }: { initialQuotes: QuoteRow[] }) {
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return initialQuotes;
    return initialQuotes.filter((row) =>
      getCustomerName(row.customer_name).toLowerCase().includes(term)
    );
  }, [q, initialQuotes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by customer name…"
          className="max-w-sm"
        />
        <div className="text-xs text-foreground/60">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-foreground/70">
          No matching quotes.
        </div>
      ) : (
        <div className="rounded-2xl border bg-card">
          <div className="divide-y">
            {filtered.map((row) => {
              const customer = getCustomerName(row.customer_name);
              const total = row.total ?? null;

              return (
                <Link
                  key={row.id}
                  href={`/quotes/${row.id}`}
                  className="block px-4 py-3 hover:bg-white/5 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-foreground/85">{customer}</div>
                      <div className="mt-0.5 text-xs text-foreground/60">
                        {(row.trade ?? "roofing")} · {(row.status ?? "draft")} · {fmtDate(row.created_at)}
                      </div>
                    </div>
                    <div className="text-sm text-foreground/85">{fmtMoney(total)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
