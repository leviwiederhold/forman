"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

function money(n: number) {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

export function EmailQuoteButton({
  quoteId,
  customerName,
  total,
}: {
  quoteId: string;
  customerName: string;
  total: number;
}) {
  const [busy, setBusy] = React.useState(false);

  async function email() {
    try {
      setBusy(true);

      // Ensure share link exists (best UX)
      const res = await fetch(`/api/quotes/${quoteId}/share`, { method: "POST" });
      const json = (await res.json()) as { url?: string; token?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create share link");

      const shareUrl =
        json.url ??
        (json.token ? `${window.location.origin}/quotes/share/${json.token}` : "");

      const pdfUrl = `${window.location.origin}/api/quotes/${quoteId}/pdf`;

      const subject = `Here is your quote${customerName ? ` for ${customerName}` : ""}`;
      const body = [
        `Hi${customerName ? ` ${customerName}` : ""},`,
        ``,
        `Here is your quote total: ${money(total)}`,
        ``,
        `View quote (share link):`,
        shareUrl,
        ``,
        `Download PDF:`,
        pdfUrl,
        ``,
        `Thanks!`,
      ].join("\n");

      // mailto cannot attach files; links are the correct approach
      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        body
      )}`;

      window.location.href = mailto;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Email failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" onClick={email} disabled={busy}>
      {busy ? "Preparing..." : "Email"}
    </Button>
  );
}
