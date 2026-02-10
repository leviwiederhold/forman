import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectStripeButton } from "@/components/connect-stripe-button";
import { StripeRefreshButton } from "@/components/stripe-refresh-button";
import { getStripeConnectStatus } from "@/lib/billing/stripe-connect-status";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BillingPageProps = {
  searchParams?: Promise<{
    connect?: string;
  }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const connectState = params?.connect;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: connect } = await supabase
    .from("stripe_connect_accounts")
    .select("stripe_account_id, charges_enabled, payouts_enabled, details_submitted")
    .eq("user_id", user.id)
    .maybeSingle();

  const status = getStripeConnectStatus(connect);
  const isConnected = status !== "not_connected";

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <div>
        <h1 className="text-xl font-medium">Get Paid</h1>
        <p className="text-sm text-foreground/70 mt-1">
          Connect Stripe so customers can pay deposits.
        </p>
      </div>

      {connectState === "retry" ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Stripe onboarding is still incomplete. Continue setup and refresh status when done.
        </div>
      ) : null}
      {connectState === "error" ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          We couldn&apos;t update Stripe status right now. Please try again.
        </div>
      ) : null}

      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Connection</div>
          {status === "not_connected" ? (
            <Badge variant="secondary">Not connected</Badge>
          ) : status === "connected" ? (
            <Badge>Connected</Badge>
          ) : (
            <Badge variant="outline">Setup in progress</Badge>
          )}
        </div>

        {status === "not_connected" ? (
          <p className="text-sm text-foreground/70">
            Connect Stripe to accept deposits from customers.
          </p>
        ) : status === "connected" ? (
          <p className="text-sm text-foreground/70">
            Deposits are enabled and ready to collect.
          </p>
        ) : (
          <p className="text-sm text-foreground/70">
            Stripe is connected, but onboarding isn’t complete yet.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {!isConnected ? (
            <ConnectStripeButton className="w-full sm:w-auto" />
          ) : (
            <>
              <ConnectStripeButton className="w-full sm:w-auto" label="Continue setup" />
              <StripeRefreshButton className="w-full sm:w-auto" />
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a target="_blank" rel="noreferrer" href="https://dashboard.stripe.com">
                  Open Stripe
                </a>
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
