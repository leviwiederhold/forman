"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConnectStripeButtonProps = {
  className?: string;
  label?: string;
};

export function ConnectStripeButton({
  className,
  label = "Connect Stripe",
}: ConnectStripeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      disabled={loading}
      className={cn(className)}
      onClick={() => {
        setLoading(true);
        router.push("/api/stripe/connect");
      }}
    >
      {loading ? "Redirecting..." : label}
    </Button>
  );
}
