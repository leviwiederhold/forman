"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function PayDepositButton({ token }: { token: string }) {
  const [state, setState] = React.useState<null | "loading" | "error">(null);

  async function onClick() {
    setState("loading");
    try {
      const res = await fetch(`/api/quotes/share/${token}/deposit-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        console.error("Deposit checkout failed", res.status, json);
        setState("error");
        return;
      }

      window.location.href = json.url;
    } catch (e) {
      console.error("Deposit checkout error", e);
      setState("error");
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={onClick} disabled={state === "loading"}>
        {state === "loading" ? "Redirecting…" : "Pay deposit"}
      </Button>

      {state === "error" ? (
        <div className="text-xs text-destructive/90">
          Payment link failed. Please contact the contractor.
        </div>
      ) : null}
    </div>
  );
}
