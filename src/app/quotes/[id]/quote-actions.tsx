"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Send } from "lucide-react";

type Props = {
  id: string;
  customerName: string;
  subtotal: number;
  total: number;
  shareToken: string;
  acknowledgedAt: string | null;
  comparisonWarning?: string | null;
  monthlyTargetWarning?: string | null;
};

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
}

function calcMarginPct(subtotal: number, total: number) {
  const t = Number.isFinite(total) ? total : 0;
  const s = Number.isFinite(subtotal) ? subtotal : 0;
  if (t <= 0) return 0;
  return ((t - s) / t) * 100;
}

export function QuoteActions({
  id,
  customerName,
  subtotal,
  total,
  shareToken,
  acknowledgedAt,
  comparisonWarning,
  monthlyTargetWarning,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [guardBusy, setGuardBusy] = React.useState(false);
  const [ackAt, setAckAt] = React.useState<string | null>(acknowledgedAt);
  const [ackChecked, setAckChecked] = React.useState(Boolean(acknowledgedAt));
  const [guardError, setGuardError] = React.useState<string | null>(null);

  const TARGET_MARGIN = 30;
  const marginPct = calcMarginPct(subtotal, total);
  const isLowMargin = marginPct < TARGET_MARGIN;
  const isAcknowledged = Boolean(ackAt);

  async function ensureShareUrl() {
    if (shareToken) {
      return new URL(`/quotes/share/${shareToken}`, window.location.origin).toString();
    }

    const res = await fetch(`/api/quotes/${id}/share`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      token?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error ?? "Could not create share link.");
    }

    const path = json.url ?? (json.token ? `/quotes/share/${json.token}` : "");
    if (!path) throw new Error("Share link missing.");

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const normalized = path.startsWith("/") ? path : `/quotes/share/${path}`;
    return new URL(normalized, window.location.origin).toString();
  }

  async function acknowledgeLowMargin(): Promise<boolean> {
    const res = await fetch(`/api/quotes/${id}/acknowledge-low-margin`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      alert(data.error ?? "Could not acknowledge low margin.");
      return false;
    }

    setAckAt(new Date().toISOString());
    return true;
  }

  async function requireGuardrail() {
    if (!isLowMargin) return true;
    if (isAcknowledged) return true;
    if (!ackChecked) {
      setGuardError("Acknowledge the low margin warning before sending this quote.");
      return false;
    }
    setGuardBusy(true);
    return await acknowledgeLowMargin();
  }

  async function onShare() {
    setGuardError(null);
    const ok = await requireGuardrail();
    setGuardBusy(false);
    if (!ok) return;

    try {
      const url = await ensureShareUrl();
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          url,
        });
        return;
      }
      const parsed = new URL(url);
      router.push(`${parsed.pathname}${parsed.search}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create share link.");
    }
  }

  async function onEmail() {
    setGuardError(null);
    const ok = await requireGuardrail();
    setGuardBusy(false);
    if (!ok) return;
    let url = "";
    try {
      url = await ensureShareUrl();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create share link.");
      return;
    }

    const subject = "Here is your quote";
    const body =
      `Hi ${customerName || "there"},\n\n` +
      `Here is your quote link:\n${url}\n\n` +
      `Total: ${money(total)}\n`;

    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  async function onDuplicate() {
    if (busy) return;
    setBusy(true);

    const res = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
    };

    setBusy(false);

    if (!res.ok || !json.id) {
      alert(json.error ?? "Duplicate failed.");
      return;
    }

    router.push(`/quotes/${json.id}/edit`);
  }

  async function onDelete() {
    if (busy) return;
    const ok = window.confirm("Delete this quote? This cannot be undone.");
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(body.error ?? "Delete failed.");
        return;
      }
      router.push("/quotes");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const marginTextClass = !isLowMargin
    ? "text-foreground/70"
    : isAcknowledged
    ? "text-yellow-600"
    : "text-destructive";
  const blockSend = isLowMargin && !isAcknowledged && !ackChecked;
  const sendBusy = guardBusy || busy;

  return (
    <div className="space-y-3">
      {comparisonWarning ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3">
          <div className="text-sm font-medium text-amber-200">Price Comparison Advisory</div>
          <div className="mt-1 text-xs text-foreground/80">{comparisonWarning}</div>
        </div>
      ) : null}
      {monthlyTargetWarning ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3">
          <div className="text-sm font-medium text-amber-200">Monthly Goal Advisory</div>
          <div className="mt-1 text-xs text-foreground/80">{monthlyTargetWarning}</div>
        </div>
      ) : null}

      {isLowMargin ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
          <div className="text-sm font-medium text-destructive">
            Margin below floor ({TARGET_MARGIN.toFixed(0)}%)
          </div>
          <div className="mt-1 text-xs text-foreground/80">
            Current margin is {marginPct.toFixed(1)}%. You must acknowledge this low-margin quote before sending.
          </div>
          {!isAcknowledged ? (
            <label className="mt-3 inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={ackChecked}
                onCheckedChange={(checked) => {
                  setAckChecked(Boolean(checked));
                  setGuardError(null);
                }}
                disabled={sendBusy}
                aria-label="Acknowledge low margin warning"
              />
              I understand this quote is below the margin floor and want to send it anyway.
            </label>
          ) : (
            <div className="mt-2 text-xs text-yellow-600">Low-margin acknowledgment saved.</div>
          )}
          {guardError ? <div className="mt-2 text-xs text-destructive">{guardError}</div> : null}
        </div>
      ) : null}

      <div className="rounded-xl border bg-background/40 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 border-foreground/20 bg-transparent px-3">
            <Link href={`/quotes/${id}/edit`} className="inline-flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>

          <Button className="h-9 px-4" onClick={onShare} disabled={blockSend || sendBusy}>
            <Send className="mr-2 h-3.5 w-3.5" />
            {sendBusy ? "Sending..." : "Share quote"}
          </Button>

          <div className={`ml-auto rounded-full border px-2.5 py-1 text-xs ${marginTextClass}`}>
            Margin {marginPct.toFixed(1)}%
            {isLowMargin && isAcknowledged ? " acknowledged" : ""}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-foreground/70">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-foreground/75 hover:text-foreground"
            onClick={onEmail}
            disabled={busy || sendBusy}
          >
            Email
          </Button>
          <span className="text-foreground/35">•</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-foreground/75 hover:text-foreground"
            onClick={onDuplicate}
            disabled={busy || sendBusy}
          >
            Duplicate
          </Button>
          <span className="text-foreground/35">•</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive/85 hover:text-destructive"
            onClick={onDelete}
            disabled={busy || sendBusy}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
