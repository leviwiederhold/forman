import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StripeRefreshButton } from "@/components/stripe-refresh-button";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: connect } = await supabase
    .from("stripe_connect_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  const isConnected = Boolean(connect?.stripe_account_id);
  const isEnabled = Boolean(connect?.charges_enabled);

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <div>
        <h1 className="text-xl font-medium">Get Paid</h1>
        <p className="text-sm text-foreground/70 mt-1">
          Connect Stripe so customers can pay deposits.
        </p>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Connection</div>
          {!isConnected ? (
            <Badge variant="secondary">Not connected</Badge>
          ) : isEnabled ? (
            <Badge>Connected</Badge>
          ) : (
            <Badge variant="outline">Setup in progress</Badge>
          )}
        </div>

        {!isConnected ? (
          <p className="text-sm text-foreground/70">
            Connect Stripe to accept deposits from customers.
          </p>
        ) : isEnabled ? (
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
            <Button asChild className="w-full sm:w-auto">
              <Link href="/api/stripe/connect/onboard">Connect Stripe</Link>
            </Button>
          ) : (
            <>
              <Button asChild className="w-full sm:w-auto">
                <Link href="/api/stripe/connect/onboard">Continue setup</Link>
              </Button>
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