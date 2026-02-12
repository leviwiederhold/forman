"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ShareLinkButton({
  quoteId,
  size = "default",
  variant = "secondary",
}: {
  quoteId: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function share() {
    try {
      setBusy(true);

      const res = await fetch(`/api/quotes/${quoteId}/share`, { method: "POST" });
      const json = (await res.json()) as { url?: string; token?: string; error?: string };

      if (!res.ok) throw new Error(json.error ?? "Failed to create share link");

      const path = json.url ?? (json.token ? `/quotes/share/${json.token}` : "");
      if (!path) throw new Error("Share link missing");

      if (path.startsWith("http://") || path.startsWith("https://")) {
        const parsed = new URL(path);
        router.push(`${parsed.pathname}${parsed.search}`);
      } else {
        router.push(path.startsWith("/") ? path : `/quotes/share/${path}`);
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Share failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size={size} variant={variant} onClick={share} disabled={busy}>
      {busy ? "Sharing..." : "Share"}
    </Button>
  );
}
