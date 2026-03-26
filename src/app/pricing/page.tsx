import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-10 p-6">
      <header className="border-l-8 border-primary pl-5">
        <div className="forman-kicker">Pricing</div>
        <h1 className="forman-title text-4xl">
          Simple pricing. Built for contractors.
        </h1>
        <p className="forman-subtitle mt-2">
          Create professional roofing quotes, send them instantly, and get accept/reject decisions
          without chasing customers.
        </p>
      </header>

      <section className="paper-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="forman-kicker">Roofing v1 (Beta)</div>
            <div className="font-headline text-5xl font-black">$49</div>
            <div className="text-sm text-muted-foreground">per month</div>
            <div className="text-sm text-muted-foreground">
              7-day free trial · Cancel anytime
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/signup">
              <Button className="w-full">Start free 7-day trial</Button>
            </Link>
            <div className="text-xs text-muted-foreground">
              No credit card required during beta.
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-2 text-sm text-foreground/80">
          <div className="paper-inset p-3">Unlimited roofing quotes</div>
          <div className="paper-inset p-3">Custom rate cards</div>
          <div className="paper-inset p-3">Professional PDFs</div>
          <div className="paper-inset p-3">Public share links</div>
          <div className="paper-inset p-3">One-click accept / reject</div>
          <div className="paper-inset p-3">Quote status tracking</div>
          <div className="paper-inset p-3">Duplicate & edit quotes</div>
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
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
