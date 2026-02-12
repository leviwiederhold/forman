"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShareLinkButton } from "@/components/quotes/ShareLinkButton";

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<QuoteRow[]>(rows);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(rows);
  }, [rows]);

  async function deleteQuote(id: string) {
    const ok = window.confirm("Delete this quote? This cannot be undone.");
    if (!ok) return;

    // Optimistic remove
    const prev = items;
    setItems((cur) => cur.filter((q) => q.id !== id));

    try {
      const res = await fetch(`/api/quotes/${id}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "Delete failed.");
        setItems(prev);
        return;
      }

      router.refresh();
    } catch {
      alert("Delete failed.");
      setItems(prev);
    }
  }

  async function duplicateQuote(id: string) {
    if (duplicatingId) return;
    setDuplicatingId(id);

    try {
      const res = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };

      if (!res.ok || !json.id) {
        alert(json.error ?? "Duplicate failed.");
        return;
      }

      window.location.href = `/quotes/${json.id}/edit`;
    } finally {
      setDuplicatingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((r) =>
      (r.customer_name ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

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
            <div
              key={row.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
            >
                {/* LEFT */}
                <Link href={`/quotes/${row.id}`} className="min-w-0 flex-1">
                  <div className="space-y-1">
                    <div className="font-medium leading-none">
                      {row.customer_name || "Unnamed customer"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.trade} · {row.status ?? "draft"} ·{" "}
                      {new Date(row.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>

                {/* RIGHT */}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <ShareLinkButton quoteId={row.id} size="sm" variant="ghost" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={Boolean(duplicatingId)}
                    onClick={() => duplicateQuote(row.id)}
                  >
                    {duplicatingId === row.id ? "Duplicating..." : "Duplicate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteQuote(row.id)}
                  >
                    Delete
                  </Button>

                  <div className="ml-1 flex flex-col items-end gap-1">
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
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-10">
            {items.length === 0 && query.trim().length === 0 ? (
              <div className="mx-auto max-w-xl space-y-4 text-center">
                <div className="text-base font-medium">No quotes yet</div>
                <div className="text-sm text-muted-foreground">
                  Create your first quote in minutes. Set pricing once, send the quote, and track views and follow-up from your dashboard.
                </div>
                <div className="grid gap-2 text-left text-sm text-foreground/75">
                  <div className="rounded-lg border bg-background/40 p-3">1. Confirm your pricing and margin targets.</div>
                  <div className="rounded-lg border bg-background/40 p-3">2. Turn on deposits to reduce late cancellations.</div>
                  <div className="rounded-lg border bg-background/40 p-3">3. Create and send your first quote.</div>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm">
                    <Link href="/quotes/new">Create first quote</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/settings/roofing">Pricing</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/settings/billing">Deposits</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">No quotes found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
