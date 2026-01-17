import { createSupabaseServerClient } from "@/lib/supabase/server";

const TRIAL_DAYS = 7;

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

export type Entitlements = {
  status: string | null;          // stripe status if subscribed
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  inTrial: boolean;
  isPaid: boolean;                // active/trialing in Stripe
  canCreateQuotes: boolean;        // trial OR paid
};

export async function getEntitlements(): Promise<Entitlements> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return {
      status: null,
      trialStartedAt: null,
      trialEndsAt: null,
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

  // If no trial start exists, start it now (first real use)
  if (!trialStartedAt) {
    const now = new Date();
    const ends = addDays(now, TRIAL_DAYS);

    trialStartedAt = now.toISOString();
    trialEndsAt = ends.toISOString();

    // Best-effort update (don’t block user if this fails)
    await supabase
      .from("profiles")
      .upsert(
        { id: userId, trial_started_at: trialStartedAt, trial_ends_at: trialEndsAt },
        { onConflict: "id" }
      );
  }

  const inTrial =
    !!trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();

  const canCreateQuotes = isPaid || inTrial;

  return {
    status,
    trialStartedAt,
    trialEndsAt,
    inTrial,
    isPaid,
    canCreateQuotes,
  };
}
