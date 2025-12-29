"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ShareLinkButton } from "@/components/quotes/ShareLinkButton";

export function QuoteActions({ quoteId }: { quoteId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ShareLinkButton quoteId={quoteId} />
      <a href={`/api/quotes/${quoteId}/pdf`}>
        <Button variant="outline">Download PDF</Button>
      </a>
    </div>
  );
}
