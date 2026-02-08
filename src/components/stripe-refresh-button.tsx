"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StripeRefreshButton({
  action = "/api/stripe/connect/return",
  className,
}: {
  action?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      className={cn(className)}
      onClick={async () => {
        try {
          setLoading(true);
          const res = await fetch(action, { method: "POST" });
          if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
          router.refresh();
        } catch (e) {
          console.error(e);
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Refreshing..." : "Refresh status"}
    </Button>
  );
}