"use client";

import * as React from "react";
import Link from "next/link";

type Ent = {
  access?: "active" | "trial" | "expired" | "past_due" | "canceled" | "incomplete";
  trialDaysRemaining?: number | null;
};

function Pill({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "danger";
}) {
  const base =
    "inline-flex items-center rounded-sm border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em]";

  const styles =
    variant === "danger"
      ? "border-destructive bg-[#ffdad6] text-destructive"
      : variant === "outline"
      ? "border-border bg-white text-foreground/70"
      : "border-[#154625] bg-[#e1f5e6] text-[#154625]";

  return <span className={`${base} ${styles}`}>{children}</span>;
}

export function BillingStatusBadge() {
  const [ent, setEnt] = React.useState<Ent | null>(null);

  React.useEffect(() => {
    fetch("/api/entitlements")
      .then((r) => r.json())
      .then((j) => setEnt(j.ent ?? null))
      .catch(() => {});
  }, []);

  if (!ent) return null;

  if (ent.access === "active") {
    return (
      <Link href="/billing">
        <Pill>Active</Pill>
      </Link>
    );
  }

  if (ent.access === "trial") {
    return (
      <Link href="/billing">
        <Pill variant="outline">
          Trial · {ent.trialDaysRemaining ?? 0} days left
        </Pill>
      </Link>
    );
  }

  return (
    <Link href="/billing">
      <Pill variant="danger">Subscription required</Pill>
    </Link>
  );
}
