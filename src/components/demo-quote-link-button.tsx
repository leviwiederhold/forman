"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { trackClientEvent } from "@/lib/analytics/client";

type Props = {
  sourcePage: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
};

export function DemoQuoteLinkButton({
  sourcePage,
  label = "Try a demo quote",
  variant = "outline",
  className,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);

    await trackClientEvent({
      eventName: "demo_quote_started",
      trade: "roofing",
      sourcePage,
      metadata: {
        user_role: "roofing_owner",
      },
    });

    router.push("/demo/quote");
  }

  return (
    <Button type="button" variant={variant} className={className} onClick={onClick} disabled={busy}>
      {busy ? "Opening..." : label}
    </Button>
  );
}
