"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShareLinkButton } from "@/components/quotes/ShareLinkButton";

export default function QuoteActions({
  quoteId,
  status,
  customerName,
}: {
  quoteId: string;
  status: string | null;
  customerName?: string | null;
}) {
  const isFinal = status === "accepted" || status === "rejected";

  return (
    <div className="flex flex-wrap gap-2">
      {/* EDIT (disabled if final) */}
      {!isFinal ? (
        <Link href={`/quotes/${quoteId}/edit`}>
          <Button variant="outline">Edit</Button>
        </Link>
      ) : (
        <Button variant="outline" disabled title="Duplicate to revise">
          Edit
        </Button>
      )}

      {/* DUPLICATE (always allowed) */}
      <Link href={`/api/quotes/${quoteId}/duplicate`}>
        <Button variant="outline">Duplicate</Button>
      </Link>

      {/* PDF */}
      <a href={`/api/quotes/${quoteId}/pdf`}>
        <Button variant="outline">Download PDF</Button>
      </a>

      {/* ✅ CORRECT SHARE LINK */}
      <ShareLinkButton quoteId={quoteId} />

      {/* EMAIL (simple v1) */}
      <a
        href={`mailto:?subject=Roofing Quote&body=Here is your quote for ${
          customerName || "your project"
        }.`}
      >
        <Button variant="outline">Email</Button>
      </a>
    </div>
  );
}
