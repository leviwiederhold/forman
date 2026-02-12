"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function DeleteQuoteButton({
  quoteId,
  afterDeleteHref,
  size = "sm",
  variant = "ghost",
  children,
}: {
  quoteId: string;
  afterDeleteHref?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onDelete() {
    const ok = window.confirm("Delete this quote? This cannot be undone.");
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "Delete failed.");
        return;
      }

      if (afterDeleteHref) {
        router.push(afterDeleteHref);
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={onDelete}
      disabled={loading}
    >
      {children ?? (loading ? "Deleting…" : "Delete")}
    </Button>
  );
}
