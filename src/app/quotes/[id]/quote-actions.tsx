"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  customerName: string;
  total: number;
  shareToken: string;
};

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
}

export function QuoteActions({ id, customerName, total, shareToken }: Props) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);

  async function onCopyLink() {
    if (!shareToken) {
      alert("Missing share token for this quote.");
      return;
    }

    const url = new URL(`/quotes/share/${shareToken}`, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function onEmail() {
    if (!shareToken) {
      alert("Missing share token for this quote.");
      return;
    }

    const url = new URL(`/quotes/share/${shareToken}`, window.location.origin).toString();
    const subject = "Here is your quote";
    const body = `Hi ${customerName || "there"},\n\nHere is your quote link:\n${url}\n\nTotal: ${money(
      total
    )}\n`;

    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  async function onDuplicate() {
    const res = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };

    if (!res.ok || !json.id) {
      alert(json.error ?? "Duplicate failed.");
      return;
    }

    // ✅ Go to the newly created quote
    router.push(`/quotes/${json.id}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/quotes/${id}/edit`}>
        <Button variant="outline">Edit</Button>
      </Link>

      <Button variant="outline" onClick={onDuplicate}>
        Duplicate
      </Button>

      <Link href={`/api/quotes/${id}/pdf`}>
        <Button variant="outline">Download PDF</Button>
      </Link>

      <Button variant="outline" onClick={onCopyLink}>
        {copied ? "Copied!" : "Copy Link"}
      </Button>

      <Button variant="outline" onClick={onEmail}>
        Email
      </Button>
    </div>
  );
}
