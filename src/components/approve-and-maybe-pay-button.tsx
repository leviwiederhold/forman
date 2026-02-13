"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ApproveAndMaybePayButton({
  token,
}: {
  token: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        className="w-full"
        disabled={isPending}
        onClick={() => {
          setError(null);

          startTransition(async () => {
            // 1️⃣ Approve the quote
            const approveRes = await fetch(`/api/quotes/share/${token}/approve`, {
              method: "POST",
            });

            if (!approveRes.ok) {
              const body = await approveRes.json().catch(() => ({}));
              setError(body?.error ?? "Failed to approve quote");
              return;
            }

            // 2️⃣ Approval success → show approved state on share page
            window.location.href = `/quotes/share/${token}?approved=1`;
          });
        }}
      >
        {isPending ? "Processing..." : "Approve Quote"}
      </Button>

      {error && (
        <div className="mt-2 text-xs text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}
