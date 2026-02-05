import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PaymentsSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled")
    .eq("id", auth.user.id)
    .maybeSingle<{
      stripe_account_id: string | null;
      stripe_charges_enabled: boolean | null;
      stripe_payouts_enabled: boolean | null;
    }>();

  const connected =
    Boolean(profile?.stripe_account_id) &&
    Boolean(profile?.stripe_charges_enabled) &&
    Boolean(profile?.stripe_payouts_enabled);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-foreground/70">Payments</div>
          <h1 className="text-lg font-light tracking-wide">Get paid by customers</h1>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard">Back</Link>
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="text-sm text-foreground/80">Stripe Connect</div>
        <div className="text-xs text-foreground/60">
          Connect Stripe so customers can pay deposits directly to you.
        </div>

        <div className="text-sm">
          Status:{" "}
          <span className={connected ? "text-emerald-500" : "text-foreground/70"}>
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>

        <form action="/api/stripe/connect/onboard" method="post">
          <Button type="submit">
            {connected ? "Update Stripe connection" : "Connect Stripe"}
          </Button>
        </form>

        <div className="text-xs text-foreground/50">
          Your Forman subscription is managed on the Subscribe page.
        </div>

        <Button asChild variant="outline">
          <Link href="/billing">Manage Forman subscription</Link>
        </Button>
      </div>
    </main>
  );
}