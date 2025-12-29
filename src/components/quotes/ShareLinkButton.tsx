"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function ShareLinkButton({ quoteId }: { quoteId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function copy() {
    try {
      setLoading(true);
      setMsg(null);

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

      if (!shareUrl || !shareUrl.includes("/quotes/share/")) {
        throw new Error("Bad share URL returned");
      }

      await navigator.clipboard.writeText(shareUrl);
      setMsg("Copied!");
      setTimeout(() => setMsg(null), 1200);
    } catch (e: any) {
      setMsg(e?.message ?? "Copy failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={copy} disabled={loading}>
        {loading ? "Generating…" : "Copy Link"}
      </Button>
      {msg ? <span className="text-xs text-foreground/60">{msg}</span> : null}
    </div>
  );
}
