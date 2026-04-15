"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  isLoggedIn: boolean;
};

export function DemoQuoteDuplicateButton({ isLoggedIn }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function duplicateDemoQuote() {
    if (busy) return;
    setBusy(true);

    try {
      const res = await fetch("/api/demo/quote/duplicate", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };

      if (!res.ok || !json.id) {
        alert(json.error ?? "Could not duplicate the demo quote.");
        return;
      }

      router.push(`/quotes/${json.id}/edit`);
    } finally {
      setBusy(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <Button asChild size="lg">
        <Link href="/signup?redirectTo=%2Fdemo%2Fquote">Create a free account to edit this quote</Link>
      </Button>
    );
  }

  return (
    <Button type="button" size="lg" onClick={duplicateDemoQuote} disabled={busy}>
      {busy ? "Duplicating..." : "Duplicate into my quotes"}
    </Button>
  );
}
