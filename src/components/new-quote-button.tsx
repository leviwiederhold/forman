"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Ent = {
  canCreateQuotes: boolean;
  trialEndsAt: string | null;
  inTrial: boolean;
  isPaid: boolean;
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

export function NewQuoteButton({
  variant,
  className,
}: {
  variant?: "default" | "outline";
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onClick() {
    setLoading(true);

    const res = await fetch("/api/entitlements");
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

    const ok = window.confirm(
      `Your free trial has ended${
        ent.trialEndsAt ? ` (ended ${fmtDate(ent.trialEndsAt)})` : ""
      }.\n\nSubscribe to create more quotes.`
    );

    if (ok) {
      router.push("/billing");
    }
  }

  return (
    <Button
      variant={variant ?? "default"}
      className={className}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? "Checking…" : "New Quote"}
    </Button>
  );
}
