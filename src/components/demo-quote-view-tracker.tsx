"use client";

import * as React from "react";
import { trackClientEvent } from "@/lib/analytics/client";

export function DemoQuoteViewTracker() {
  React.useEffect(() => {
    void trackClientEvent({
      eventName: "demo_quote_viewed",
      trade: "roofing",
      sourcePage: "/demo/quote",
      metadata: {
        demo_quote_id: "demo-roofing-quote",
        user_role: "roofing_owner",
      },
    });
  }, []);

  return null;
}
