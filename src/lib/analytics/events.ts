export const ANALYTICS_EVENT_NAMES = [
  "demo_quote_started",
  "demo_quote_viewed",
  "demo_quote_duplicated",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
