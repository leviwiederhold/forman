"use client";

import type { AnalyticsEventName } from "./events";

type TrackClientEventInput = {
  eventName: AnalyticsEventName;
  trade?: string;
  sourcePage?: string;
  metadata?: Record<string, unknown>;
};

export async function trackClientEvent({
  eventName,
  trade,
  sourcePage,
  metadata,
}: TrackClientEventInput) {
  const body = JSON.stringify({
    eventName,
    trade,
    sourcePage,
    metadata,
  });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }

  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Analytics should never block product flows.
  }
}
