"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Ent = {
  canCreateQuotes: boolean;
  trialEndsAt: string | null;
  inTrial: boolean;
  isPaid: boolean;
  trialDaysRemaining?: number | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  /** "nav" makes it look like the header links (text-only) */
  appearance?: "cta" | "nav";
  /** only used for appearance="cta" */
  variant?: "default" | "outline";
  /** only used for appearance="cta" */
  size?: "default" | "sm";
  className?: string;
  label?: string;
};

export function NewQuoteButton({
  appearance = "cta",
  variant = "default",
  size = "default",
  className = "",
  label = "New Quote",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);

    const res = await fetch("/api/entitlements", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as { ent?: Ent };

    setLoading(false);

    const ent = json.ent;
    if (!ent) {
      alert("Unable to check subscription status.");
      return;
    }

    if (ent.canCreateQuotes) {
      router.push("/quotes/new");
      return;
    }

    const endedText = ent.trialEndsAt
      ? ` (ended ${fmtDate(ent.trialEndsAt)})`
      : "";

    const ok = window.confirm(
      `Subscription required.\n\nYour free trial has ended${endedText}.\nSubscribe to create more quotes.`
    );

    if (ok) router.push("/billing");
  }

  // ✅ Header-style link (text only)
  if (appearance === "nav") {
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={[
        "rounded-xl px-3 py-1.5 text-sm font-medium text-foreground/70 transition-all hover:bg-white/8 hover:text-foreground",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
    >
      {loading ? "Checking…" : label}
    </button>
  );
}


  // ✅ Normal CTA button for dashboards/pages
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      type="button"
      className={className}
    >
      {loading ? "Checking…" : label}
    </Button>
  );
}
