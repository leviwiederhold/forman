"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function ShareRespondButtons({
  token,
  disabled,
}: {
  token: string;
  disabled: boolean;
}) {
  const [loading, setLoading] = React.useState<"accept" | "reject" | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function send(action: "accept" | "reject") {
    try {
      setMsg(null);
      setLoading(action);

      const res = await fetch(`/api/quotes/share/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json === "object" && json && "error" in json
            ? String((json as any).error)
            : "Failed"
        );
      }

      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message || "Couldn’t update status. Try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => send("accept")} disabled={disabled || loading !== null}>
          {loading === "accept" ? "Accepting…" : "Accept Quote"}
        </Button>

        <Button
          variant="outline"
          onClick={() => send("reject")}
          disabled={disabled || loading !== null}
        >
          {loading === "reject" ? "Rejecting…" : "Reject Quote"}
        </Button>
      </div>

      {msg ? <div className="text-xs text-white/70">{msg}</div> : null}
    </div>
  );
}
