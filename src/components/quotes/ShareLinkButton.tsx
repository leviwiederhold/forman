"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function ShareLinkButton({ quoteId }: { quoteId: string }) {
  const [busy, setBusy] = React.useState(false);

  async function copy() {
    try {
      setBusy(true);

      const res = await fetch(`/api/quotes/${quoteId}/share`, { method: "POST" });
      const json = (await res.json()) as { url?: string; token?: string; error?: string };

      if (!res.ok) throw new Error(json.error ?? "Failed to create share link");

      const url =
        json.url ??
        (json.token ? `${window.location.origin}/quotes/share/${json.token}` : null);

      if (!url) throw new Error("Share link missing");

      await navigator.clipboard.writeText(url);
      alert("Share link copied!");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Copy failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" onClick={copy} disabled={busy}>
      {busy ? "Copying..." : "Copy Link"}
    </Button>
  );
}
