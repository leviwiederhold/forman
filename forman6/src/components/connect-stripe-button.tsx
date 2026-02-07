"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ConnectStripeButton() {
  return (
    <Button asChild>
      <Link href="/api/stripe/connect/onboard">
        Connect Stripe
      </Link>
    </Button>
  );
}