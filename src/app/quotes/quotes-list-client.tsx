"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuoteRow = {
  id: string;
  trade: string | null;
  created_at: string;
  customer_name: string | null;
  status: string | null;
  total: number | null;
};

function fmtMoney(n: number | null) {
  if (n == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function statusMeta(status: string | null | undefined) {
  const s = (status ?? "draft").toLowerCase();

  if (s === "accepted") {
    return {
      label: "Accepted",
      className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    };
  }

  if (s === "rejected") {
    return {
      label: "Rejected",
      className: "bg-red-500/15 text-red-300 border-red-500/30",
    };
  }

  if (s === "sent") {
    return {
      label: "Sent",
      className: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    };
  }

  return {
    label: "Draft",
    className: "bg-white/10 text-foreground/80 border-white/15",
  };
}

export default function QuotesListClient({
  rows = [],
}: {
  rows?: QuoteRow[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) =>
      (r.customer_name ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search by customer name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="text-xs text-muted-foreground">
          {filtered.length} results
        </div>
      </div>

      <div className="rounded-lg border divide-y">
        {filtered.map((row) => {
          const meta = statusMeta(row.status);
          const total = row.total ?? 0;

          return (
            <Link
              key={row.id}
              href={`/quotes/${row.id}`}
              className="block hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between px-4 py-3">
                {/* LEFT */}
                <div className="space-y-1">
                  <div className="font-medium leading-none">
                    {row.customer_name || "Unnamed customer"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.trade} · {row.status ?? "draft"} ·{" "}
                    {new Date(row.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                      meta.className
                    )}
                  >
                    {meta.label}
                  </span>
                  <div className="text-sm text-foreground/85">
                    {fmtMoney(total)}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No quotes found
          </div>
        )}
      </div>
    </div>
  );
}
