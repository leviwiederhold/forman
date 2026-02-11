"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [copied, setCopied] = React.useState(false);
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

  async function onCopyLink() {
    setGuardError(null);
    const ok = await requireGuardrail();
    setGuardBusy(false);
    if (!ok) return;

    try {
      const url = await ensureShareUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
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

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link href={`/quotes/${id}/edit`}>Edit</Link>
        </Button>

        <Button variant="outline" onClick={onDuplicate} disabled={busy}>
          {busy ? "Duplicating..." : "Duplicate"}
        </Button>

        <Button asChild variant="outline">
          <Link href={`/api/quotes/${id}/pdf`}>Download PDF</Link>
        </Button>

        <Button variant="outline" onClick={onCopyLink} disabled={blockSend || sendBusy}>
          {copied ? "Copied!" : sendBusy ? "Sending..." : "Copy Link"}
        </Button>

        <Button variant="outline" onClick={onEmail} disabled={blockSend || sendBusy}>
          {sendBusy ? "Sending..." : "Email"}
        </Button>

        <div className={`ml-2 text-xs ${marginTextClass}`}>
          Margin: {marginPct.toFixed(1)}%
          {isLowMargin && isAcknowledged ? " (acknowledged)" : ""}
        </div>
      </div>
    </div>
  );
}
