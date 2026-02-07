import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
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
        {!isConnected && (
          <>
            <p className="text-sm text-foreground/70">
              Stripe is not connected yet.
            </p>
            <Button asChild>
              <Link href="/api/stripe/connect">Connect Stripe</Link>
            </Button>
          </>
        )}

        {isConnected && !isEnabled && (
          <>
            <p className="text-sm text-foreground/70">
              Connected ✅ — setup in progress. Finish Stripe onboarding to
              accept payments.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/api/stripe/connect">Continue setup</Link>
              </Button>
              <form action="/api/stripe/connect/sync" method="post">
                <Button type="submit" variant="outline">
                  Refresh status
                </Button>
              </form>
            </div>
          </>
        )}

        {isConnected && isEnabled && (
          <>
            <p className="text-sm text-foreground/70">
              Connected ✅ Customers can now pay deposits.
            </p>
            <form action="/api/stripe/connect/sync" method="post">
              <Button type="submit" variant="outline">
                Refresh status
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}