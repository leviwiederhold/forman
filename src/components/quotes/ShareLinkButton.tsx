"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

function isAbortError(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

export function ShareLinkButton({
  quoteId,
  size = "default",
  variant = "secondary",
}: {
  quoteId: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}) {
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function getShareUrl() {
    const res = await fetch(`/api/quotes/${quoteId}/share`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      token?: string;
      error?: string;
    };

    if (!res.ok) throw new Error(json.error ?? "Failed to create share link");

    const path = json.url ?? (json.token ? `/quotes/share/${json.token}` : "");
    if (!path) throw new Error("Share link missing");

    if (path.startsWith("http://") || path.startsWith("https://")) return path;

    const normalized = path.startsWith("/") ? path : `/quotes/share/${path}`;
    return new URL(normalized, window.location.origin).toString();
  }

  async function share() {
    try {
      setBusy(true);
      const url = await getShareUrl();

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Quote",
          text: "Here is your quote",
          url,
        });
        setCopied(true);
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (e) {
      if (isAbortError(e)) return;
      alert(e instanceof Error ? e.message : "Share failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size={size} variant={variant} onClick={share} disabled={busy}>
      {busy ? "Sharing..." : copied ? "Link copied" : "Share"}
    </Button>
  );
}
