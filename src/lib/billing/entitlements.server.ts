import { createSupabaseServerClient } from "@/lib/supabase/server";

const TRIAL_DAYS = 7;

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function daysRemaining(endsAtIso: string | null): number | null {
  if (!endsAtIso) return null;
  const end = new Date(endsAtIso).getTime();
  if (!Number.isFinite(end)) return null;

  const diffMs = end - Date.now();
  if (diffMs <= 0) return 0;

  const d = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return clampInt(d, 0, 3650);
}

export type BillingAccess =
  | "active"
  | "trial"
  | "expired"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unknown";

export type Entitlements = {
  status: string | null; // stripe status if subscribed (raw)
  access: BillingAccess;

  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;

  inTrial: boolean;
  isPaid: boolean; // active/trialing in Stripe
  canCreateQuotes: boolean; // trial OR paid
};

function normalizeAccess(status: string | null, inTrial: boolean): BillingAccess {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled") return "canceled";
  if (status === "incomplete" || status === "incomplete_expired") return "incomplete";
  if (inTrial) return "trial";
  if (status === null) return "expired";
  return "unknown";
}

export async function getEntitlements(): Promise<Entitlements> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return {
      status: null,
      access: "expired",
      trialStartedAt: null,
      trialEndsAt: null,
      trialDaysRemaining: null,
      inTrial: false,
      isPaid: false,
      canCreateQuotes: false,
    };
  }

  const userId = auth.user.id;

  // 1) Stripe status (if they ever paid)
  const { data: billing } = await supabase
    .from("billing_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle<{ status: string | null }>();

  const status = billing?.status ?? null;
  const isPaid = status === "active" || status === "trialing";

  // 2) Trial start/end from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("trial_started_at, trial_ends_at")
    .eq("id", userId)
    .maybeSingle<{ trial_started_at: string | null; trial_ends_at: string | null }>();

  let trialStartedAt = profile?.trial_started_at ?? null;
  let trialEndsAt = profile?.trial_ends_at ?? null;

  // ✅ If no trial start exists, start it now
  if (!trialStartedAt) {
    const now = new Date();
    const ends = addDays(now, TRIAL_DAYS);
    trialStartedAt = now.toISOString();
    trialEndsAt = ends.toISOString();

    await supabase
      .from("profiles")
      .upsert(
        { id: userId, trial_started_at: trialStartedAt, trial_ends_at: trialEndsAt },
        { onConflict: "id" }
      );
  }

  // ✅ If trial has started but end is missing, derive it from start
  if (trialStartedAt && !trialEndsAt) {
    const start = new Date(trialStartedAt);
    const ends = addDays(start, TRIAL_DAYS);
    trialEndsAt = ends.toISOString();

    await supabase
      .from("profiles")
      .upsert(
        { id: userId, trial_started_at: trialStartedAt, trial_ends_at: trialEndsAt },
        { onConflict: "id" }
      );
  }

  const inTrial = !!trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();
  const trialDaysRemaining = daysRemaining(trialEndsAt);

  const canCreateQuotes = isPaid || inTrial;
  const access = normalizeAccess(status, inTrial);

  return {
    status,
    access,
    trialStartedAt,
    trialEndsAt,
    trialDaysRemaining,
    inTrial,
    isPaid,
    canCreateQuotes,
  };
}
