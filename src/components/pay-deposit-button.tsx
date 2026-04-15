"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function PayDepositButton({ token, quoteId }: { token: string; quoteId?: string }) {
  const [state, setState] = React.useState<null | "loading" | "error">(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function onClick() {
    setState("loading");
    setErrorMessage(null);
    try {
      const quoteIdParam = quoteId ? `?quoteId=${encodeURIComponent(quoteId)}` : "";
      const res = await fetch(`/api/quotes/share/${token}/deposit-checkout${quoteIdParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteId ? { quoteId } : {}),
      });

      const raw = await res.text();
      let json: { url?: string; error?: string } = {};
      try {
        json = raw ? (JSON.parse(raw) as { url?: string; error?: string }) : {};
      } catch {
        json = {};
      }
      if (!res.ok || !json.url) {
        console.warn("Deposit checkout failed", res.status, json, raw);
        const details =
          json.error ??
          (raw.startsWith("<!DOCTYPE") || raw.startsWith("<html")
            ? `HTTP ${res.status} ${res.statusText}`
            : raw || `HTTP ${res.status} ${res.statusText}`);
        setErrorMessage(details);
        setState("error");
        return;
      }

      window.location.href = json.url;
    } catch (e) {
      console.warn("Deposit checkout error", e);
      setErrorMessage("Network error starting payment. Please try again.");
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
          {errorMessage ?? "Payment link failed. Please contact the contractor."}
        </div>
      ) : null}
    </div>
  );
}
