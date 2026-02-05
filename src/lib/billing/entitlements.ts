import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isTrialActive } from "./trial";

type ProfileRow = { trial_started_at: string | null };

type SubRow = { status: string | null; current_period_end: string | null };

export async function getEntitlements() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { user: null, canCreateQuotes: false, reason: "not_logged_in" as const };

  // Ensure trial is set once
  await supabase
    .from("profiles")
    .update({ trial_started_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("trial_started_at", null);

  const { data: profile } = await supabase
    .from("profiles")
    .select("trial_started_at")
    .eq("id", user.id)
    .single<ProfileRow>();

  const trialActive = isTrialActive(profile?.trial_started_at ?? null);

  // If Stripe isn’t set up yet, trial alone controls access.
  const { data: sub } = await supabase
    .from("billing_subscriptions")
    .select("status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle<SubRow>();

  const subActive = (sub?.status ?? "").toLowerCase() === "active";

  const canCreateQuotes = trialActive || subActive;

  return {
    user,
    canCreateQuotes,
    trialActive,
    subActive,
    trialStartedAt: profile?.trial_started_at ?? null,
    reason: canCreateQuotes ? null : ("trial_ended" as const),
  };
}
