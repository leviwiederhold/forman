"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function EmailQuoteButton({
  quoteId,
  customerName,
  total,
}: {
  quoteId: string;
  customerName?: string | null;
  total?: number | null;
}) {
  const [loading, setLoading] = React.useState(false);

  async function email() {
    try {
      setLoading(true);

      const res = await fetch(`/api/quotes/${quoteId}/share`, { method: "POST" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof json === "object" && json && "error" in json
            ? String((json as any).error)
            : "Failed to generate share link"
        );
      }

      const shareUrl =
        typeof json === "object" && json && "share_url" in json
          ? String((json as any).share_url)
          : "";

      const subject = `Roofing Quote${customerName ? ` - ${customerName}` : ""}`;
      const bodyLines = [
        `Hi${customerName ? ` ${customerName}` : ""},`,
        ``,
        `Here is your roofing quote${total != null ? ` for $${Number(total).toFixed(2)}` : ""}:`,
        shareUrl,
        ``,
        `Thanks,`,
        `Forman`,
      ];

      const mailto = `mailto:?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

      window.location.href = mailto;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={email} disabled={loading}>
      {loading ? "Preparing…" : "Email"}
    </Button>
  );
}
