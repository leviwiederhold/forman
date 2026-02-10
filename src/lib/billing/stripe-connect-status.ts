export type StripeConnectSnapshot = {
  stripe_account_id?: string | null;
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  details_submitted?: boolean | null;
};

export type StripeConnectStatus = "not_connected" | "in_progress" | "connected";

export function getStripeConnectStatus(
  snapshot: StripeConnectSnapshot | null | undefined
): StripeConnectStatus {
  if (!snapshot?.stripe_account_id) {
    return "not_connected";
  }

  const chargesEnabled = Boolean(snapshot.charges_enabled);
  const payoutsEnabled = Boolean(snapshot.payouts_enabled);
  const detailsSubmitted = Boolean(snapshot.details_submitted);

  if (chargesEnabled && payoutsEnabled && detailsSubmitted) {
    return "connected";
  }

  return "in_progress";
}
