import type { JsonObject, JsonValue } from "@/lib/types/json";
import type { AnalyticsEventName } from "./events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type TrackServerEventInput = {
  eventName: AnalyticsEventName;
  userId?: string | null;
  trade?: string | null;
  sourcePage?: string | null;
  metadata?: Record<string, unknown>;
};

function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => toJsonValue(item))
      .filter((item): item is JsonValue => item !== undefined);
    return items;
  }

  if (value && typeof value === "object") {
    const out: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      const next = toJsonValue(item);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }

  return undefined;
}

export async function trackServerEvent({
  eventName,
  userId = null,
  trade = null,
  sourcePage = null,
  metadata = {},
}: TrackServerEventInput) {
  try {
    const admin = createSupabaseAdminClient();
    const jsonMetadata = toJsonValue(metadata);

    await admin.from("analytics_events").insert({
      event_name: eventName,
      user_id: userId,
      trade,
      source_page: sourcePage,
      metadata:
        jsonMetadata && typeof jsonMetadata === "object" && !Array.isArray(jsonMetadata)
          ? jsonMetadata
          : {},
    });
  } catch {
    // Analytics should never break the user flow.
  }
}
