import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectStripeButton } from "@/components/connect-stripe-button";
import { StripeRefreshButton } from "@/components/stripe-refresh-button";
import { getStripeConnectStatus } from "@/lib/billing/stripe-connect-status";

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
    <main className="forman-page max-w-4xl">
      <div className="border-l-8 border-primary pl-5">
        <div className="forman-kicker">Get Paid</div>
        <h1 className="forman-title text-4xl">Stripe connection</h1>
        <p className="forman-subtitle mt-2">
          Connect Stripe so customers can pay deposits.
        </p>
      </div>

      {connectState === "retry" ? (
        <div className="paper-panel border-amber-500 p-3 text-sm text-foreground">
          Stripe onboarding is still incomplete. Continue setup and refresh status when done.
        </div>
      ) : null}
      {connectState === "error" ? (
        <div className="paper-panel border-destructive p-3 text-sm text-destructive">
          We couldn&apos;t update Stripe status right now. Please try again.
        </div>
      ) : null}

      <div className="paper-panel p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-headline text-2xl font-bold uppercase tracking-[-0.04em]">Connection</div>
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
