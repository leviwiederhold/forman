"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  customerName: string;
  subtotal: number;
  total: number;
  shareToken: string;
  acknowledgedAt: string | null;
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
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [ackAt, setAckAt] = React.useState<string | null>(acknowledgedAt);

  const TARGET_MARGIN = 30;
  const marginPct = calcMarginPct(subtotal, total);
  const isLowMargin = marginPct < TARGET_MARGIN;
  const isAcknowledged = Boolean(ackAt);

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

  async function requireGuardrail(actionLabel: string) {
    if (!isLowMargin) return true;
    if (isAcknowledged) return true;

    const msg =
      `⚠️ Low margin warning\n\n` +
      `Target: ${TARGET_MARGIN.toFixed(0)}%\n` +
      `Current: ${marginPct.toFixed(1)}%\n\n` +
      `Total: ${money(total)}\n\n` +
      `Press OK to ${actionLabel} anyway.`;

    const ok = window.confirm(msg);
    if (!ok) return false;

    return await acknowledgeLowMargin();
  }

  async function onCopyLink() {
    if (!shareToken) {
      alert("Missing share token for this quote.");
      return;
    }

    const ok = await requireGuardrail("share this quote");
    if (!ok) return;

    const url = new URL(
      `/quotes/share/${shareToken}`,
      window.location.origin
    ).toString();

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function onEmail() {
    if (!shareToken) {
      alert("Missing share token for this quote.");
      return;
    }

    const ok = await requireGuardrail("email this quote");
    if (!ok) return;

    const url = new URL(
      `/quotes/share/${shareToken}`,
      window.location.origin
    ).toString();

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

    router.push(`/quotes/${json.id}`);
  }

  const marginTextClass = !isLowMargin
    ? "text-foreground/70"
    : isAcknowledged
    ? "text-yellow-600"
    : "text-destructive";

  return (
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

      <Button variant="outline" onClick={onCopyLink}>
        {copied ? "Copied!" : "Copy Link"}
      </Button>

      <Button variant="outline" onClick={onEmail}>
        Email
      </Button>

      <div className={`ml-2 text-xs ${marginTextClass}`}>
        Margin: {marginPct.toFixed(1)}%
        {isLowMargin && isAcknowledged ? " (acknowledged)" : ""}
      </div>
    </div>
  );
}
