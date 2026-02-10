"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StripeRefreshButton({
  className,
}: {
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
      onClick={() => {
        setLoading(true);
        router.push("/api/stripe/connect/refresh");
      }}
    >
      {loading ? "Refreshing..." : "Refresh status"}
    </Button>
  );
}
