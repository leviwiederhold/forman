import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getEntitlements } from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const ent = await getEntitlements();
  if (!ent.user) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-lg font-light tracking-wide">Subscribe</h1>
        <p className="text-sm text-foreground/70">
          Your 7-day free trial has ended. Subscribe to keep creating and sharing quotes.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-3">
        <div className="text-3xl font-semibold">
          $49
          <span className="text-base font-normal text-foreground/70">/mo</span>
        </div>
        <div className="text-sm text-foreground/70">Cancel anytime.</div>

        <form action="/api/billing/checkout" method="post">
          <Button type="submit">Subscribe</Button>
        </form>

        {ent.subActive ? (
          <form action="/api/billing/portal" method="post">
            <Button type="submit" variant="ghost">
              Manage billing
            </Button>
          </form>
        ) : null}

        <div className="text-xs text-foreground/60">
          Need help? Use the “How can we improve” button.
        </div>
      </div>

      <Link className="underline text-sm text-foreground/70" href="/quotes">
        Back to quotes
      </Link>
    </main>
  );
}
