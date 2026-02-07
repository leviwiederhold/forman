"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StripeRefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(className)}
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const res = await fetch("/api/stripe/connect/sync", { method: "POST" });
          if (!res.ok) {
            // Keep it simple; the page still shows current status.
            // Avoid noisy toasts for now.
            return;
          }
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Refreshing…" : "Refresh status"}
    </Button>
  );
}
