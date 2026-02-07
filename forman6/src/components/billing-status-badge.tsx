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
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";

  const styles =
    variant === "danger"
      ? "bg-red-500/10 text-red-600"
      : variant === "outline"
      ? "border border-white/20 text-foreground/70"
      : "bg-emerald-500/10 text-emerald-600";

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
