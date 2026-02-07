// src/app/quotes/share/[token]/share-respond-buttons.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  token: string;
  disabled?: boolean;
};

export default function ShareRespondButtons({ token, disabled }: Props) {
  const [loading, setLoading] = React.useState<"accept" | "reject" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function respond(action: "accept" | "reject") {
    setError(null);
    setLoading(action);

    try {
      const res = await fetch(`/api/quotes/share/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as { error?: unknown }).error ?? "Failed")
            : "Failed";
        setError(msg);
        return;
      }

      // simplest: refresh the page to reflect status changes
      window.location.reload();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        disabled={!!disabled || loading !== null}
        onClick={() => respond("accept")}
      >
        {loading === "accept" ? "Accepting..." : "Accept Quote"}
      </Button>

      <Button
        variant="secondary"
        disabled={!!disabled || loading !== null}
        onClick={() => respond("reject")}
      >
        {loading === "reject" ? "Rejecting..." : "Reject Quote"}
      </Button>

      {error ? <div className="text-xs text-red-400">{error}</div> : null}
    </div>
  );
}
