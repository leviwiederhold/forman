import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6">
      <header className="space-y-2">
        <div className="text-sm text-foreground/70">Pricing</div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Simple pricing. Built for contractors.
        </h1>
        <p className="text-foreground/70">
          Create professional roofing quotes, send them instantly, and get accept/reject decisions
          without chasing customers.
        </p>
      </header>

      <section className="rounded-xl border p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-sm text-foreground/70">Roofing v1 (Beta)</div>
            <div className="text-4xl font-semibold">$49</div>
            <div className="text-sm text-foreground/70">per month</div>
            <div className="text-sm text-foreground/70">
              7-day free trial · Cancel anytime
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/signup">
              <Button className="w-full">Start free 7-day trial</Button>
            </Link>
            <div className="text-xs text-foreground/60">
              No credit card required during beta.
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-2 text-sm text-foreground/80">
          <div>✅ Unlimited roofing quotes</div>
          <div>✅ Custom rate cards</div>
          <div>✅ Professional PDFs</div>
          <div>✅ Public share links</div>
          <div>✅ One-click accept / reject</div>
          <div>✅ Quote status tracking</div>
          <div>✅ Duplicate & edit quotes</div>
        </div>

        <div className="mt-6 text-xs text-foreground/60">
          Roofing v1 is currently in beta. We’re actively improving the platform based on user feedback.
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-3 text-sm text-foreground/70">
        <Link className="underline" href="/login">Login</Link>
        <Link className="underline" href="/privacy">Privacy</Link>
        <Link className="underline" href="/terms">Terms</Link>
      </footer>
    </main>
  );
}
