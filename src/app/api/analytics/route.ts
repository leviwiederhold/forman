import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ANALYTICS_EVENT_NAMES, type AnalyticsEventName } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";

function isEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && ANALYTICS_EVENT_NAMES.includes(value as AnalyticsEventName);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        eventName?: unknown;
        trade?: unknown;
        sourcePage?: unknown;
        metadata?: Record<string, unknown>;
      }
    | null;

  if (!body || !isEventName(body.eventName)) {
    return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  await trackServerEvent({
    eventName: body.eventName,
    userId: auth.user?.id ?? null,
    trade: typeof body.trade === "string" ? body.trade : null,
    sourcePage: typeof body.sourcePage === "string" ? body.sourcePage : null,
    metadata: body.metadata ?? {},
  });

  return NextResponse.json({ ok: true });
}
