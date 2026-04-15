import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forman | Roofing Software That Helps You Quote Right and Get Paid",
  description:
    "Forman helps roofing contractors build fast professional quotes, protect margins, collect deposits, and stay organized without bloated contractor software.",
};

const trustPoints = [
  "Built for roofers",
  "Fast estimate creation",
  "Protect your margins",
  "Collect deposits",
  "Professional-looking quotes",
];

const problems = [
  "Slow quote process",
  "Underbidding jobs",
  "Messy paperwork",
  "Weak follow-up",
  "Unprofessional quote presentation",
  "Chasing deposits",
];

const solutions = [
  "Fast quote builder",
  "Pricing control",
  "Clean quote sharing",
  "Approval flow",
  "Deposit collection readiness",
  "Organized workflow",
];

const features = [
  {
    id: "feature-quote",
    title: "Fast quote creation",
    body: "Build and send clear roofing quotes from the field without dragging work back to the office. Rates, scope options, and totals stay structured so your crew can move fast without cutting corners.",
    panelTitle: "Estimate sheet",
    panelItems: ["Customer + address", "Roof size and pitch", "Line items with live totals", "Send-ready quote summary"],
  },
  {
    id: "feature-pricing",
    title: "Pricing control",
    body: "Set your rates once, protect margin floors, and stop guessing on every job. Forman keeps the pricing side practical so your quotes stay tight when material costs move.",
    panelTitle: "Pricing controls",
    panelItems: ["Labor rate card", "Material pricing", "Margin awareness", "Saved extras and defaults"],
  },
  {
    id: "feature-customer",
    title: "Professional customer experience",
    body: "Customers get clean share links, clear quote details, and simple online approvals. It feels organized and trustworthy without looking like bloated contractor software.",
    panelTitle: "Customer approval",
    panelItems: ["Share link status", "Approve / reject actions", "Expiration visibility", "Downloadable PDF"],
  },
  {
    id: "feature-payments",
    title: "Get paid faster",
    body: "Connect Stripe, collect deposits, and stop chasing commitment the hard way. Payment readiness is built into the quote flow instead of living in a separate mess of tools.",
    panelTitle: "Deposit readiness",
    panelItems: ["Stripe connection", "Deposit percentage", "Paid status", "Customer-ready checkout"],
  },
  {
    id: "feature-workflow",
    title: "Simple roofer-friendly workflow",
    body: "Quotes, pricing, follow-up, and reporting stay in one rugged workflow. The product is built to be learned fast and used in the real world, not admired in a demo.",
    panelTitle: "Work board",
    panelItems: ["Dashboard snapshot", "Recent quotes", "Follow-up signals", "Reports without clutter"],
  },
];

const testimonials = [
  {
    quote:
      "We were wasting too much time cleaning up quote paperwork at night. Forman tightened that up fast and made our proposals look more legit.",
    name: "D. Mercer",
    role: "Owner, residential roofing company",
  },
  {
    quote:
      "The pricing side is what sold me. It’s easier to keep margins straight and I’m not missing little costs the way I was in spreadsheets.",
    name: "T. Alvarez",
    role: "Estimator, storm and retail roofing",
  },
  {
    quote:
      "It does the quote job without a bunch of junk we don’t need. My team picked it up quicker than the big contractor platforms we tried.",
    name: "J. Rollins",
    role: "Operations lead, small roofing crew",
  },
];

const faqs = [
  {
    question: "Is Forman made specifically for roofers?",
    answer:
      "Yes. The product and messaging are built around roofing quotes, pricing, approvals, and deposits instead of trying to be generic contractor software for every trade.",
  },
  {
    question: "How fast can I start using it?",
    answer:
      "Most crews can get started as soon as rates are entered. The workflow is built to stay simple: set pricing, build quotes, send them, and track approvals.",
  },
  {
    question: "Can I customize my pricing?",
    answer:
      "Yes. Forman supports roofing rate cards, saved items, default settings, and quote-specific scope selections so pricing stays under your control.",
  },
  {
    question: "Can customers approve quotes online?",
    answer:
      "Yes. Shared quotes support online approve and reject actions with the real share-link flow already built into the app.",
  },
  {
    question: "Can I collect deposits?",
    answer:
      "Yes. If Stripe is connected and deposits are enabled in your settings, customers can pay deposits through the quote share flow.",
  },
  {
    question: "Do I need to be tech-savvy?",
    answer:
      "No. Forman is designed to be practical, direct, and easy to learn so crews can use it without fighting a bloated system.",
  },
];

function MockPanel({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="paper-panel bg-white">
      <div className="border-b-2 border-[#dfbfbc] px-4 py-3">
        <div className="forman-kicker">{title}</div>
      </div>
      <div className="grid gap-3 p-4">
        {lines.map((line) => (
          <div key={line} className="paper-inset px-3 py-3 text-sm text-foreground">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) redirect("/dashboard");

  return (
    <main className="bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b-2 border-[#dfbfbc] bg-background">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-primary font-headline text-xl font-black text-white">
              F
            </div>
            <div>
              <div className="font-headline text-2xl font-black uppercase tracking-[-0.08em]">Forman</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Roofing utility</div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="nav-label text-foreground/80 hover:text-primary">How It Works</a>
            <a href="#pricing" className="nav-label text-foreground/80 hover:text-primary">Pricing</a>
            <a href="#reviews" className="nav-label text-foreground/80 hover:text-primary">Reviews</a>
            <a href="#faq" className="nav-label text-foreground/80 hover:text-primary">FAQ</a>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost">
              <Link href="/login?redirectTo=%2Fdashboard">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>

          <details className="md:hidden">
            <summary className="list-none border-2 border-border bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em]">
              Menu
            </summary>
            <div className="absolute right-4 top-[calc(100%+8px)] grid min-w-[220px] gap-2 border-2 border-border bg-background p-3 shadow-none sm:right-6">
              <a href="#how-it-works" className="nav-label text-foreground/80">How It Works</a>
              <a href="#pricing" className="nav-label text-foreground/80">Pricing</a>
              <a href="#reviews" className="nav-label text-foreground/80">Reviews</a>
              <a href="#faq" className="nav-label text-foreground/80">FAQ</a>
              <Link href="/login?redirectTo=%2Fdashboard" className="nav-label text-foreground/80">Log In</Link>
              <Link href="/signup" className="nav-label text-primary">Start Free Trial</Link>
            </div>
          </details>
        </div>
      </nav>

      <header className="border-b-2 border-[#dfbfbc]">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,520px)] lg:items-center lg:py-20">
          <div>
            <div className="status-strip inline-flex w-auto items-center gap-2 px-3 py-2">Built for roofing contractors</div>
            <h1 className="mt-6 font-headline text-5xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-foreground sm:text-7xl">
              Quotes faster.
              <br />
              Prices tighter.
              <br />
              <span className="text-primary">More jobs won.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Forman helps roofers create fast professional quotes, protect margins, collect deposits, and stay organized without bloated software.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">Start Free Trial</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/demo">Book Demo</Link>
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <span>7-day free trial</span>
              <span>$49/month core plan</span>
              <span>No bloated setup</span>
            </div>
          </div>

          <div className="paper-panel bg-muted p-2">
            <div className="grid gap-2 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="paper-panel bg-white">
                <div className="border-b-2 border-[#dfbfbc] px-4 py-3">
                  <div className="forman-kicker">Quote builder</div>
                  <div className="mt-1 font-headline text-2xl font-bold uppercase tracking-[-0.04em]">Estimate sheet</div>
                </div>
                <div className="grid gap-3 p-4">
                  <div>
                    <div className="field-label">Customer</div>
                    <div className="border border-border bg-background px-3 py-2 text-sm">Anderson Residence</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="field-label">Squares</div>
                      <div className="border border-border bg-background px-3 py-2 text-sm">24.0</div>
                    </div>
                    <div>
                      <div className="field-label">Pitch</div>
                      <div className="border border-border bg-background px-3 py-2 text-sm">7/12</div>
                    </div>
                    <div>
                      <div className="field-label">Status</div>
                      <div className="border border-border bg-background px-3 py-2 text-sm">Ready to send</div>
                    </div>
                  </div>
                  <div className="paper-inset p-3">
                    <div className="forman-kicker">Totals</div>
                    <div className="mt-2 flex items-end justify-between">
                      <div className="font-headline text-3xl font-black">$12,480</div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Margin protected</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <MockPanel
                  title="Quotes board"
                  lines={[
                    "Newest quotes on top",
                    "Share status and follow-up",
                    "Duplicate or edit fast",
                  ]}
                />
                <MockPanel
                  title="Dashboard board"
                  lines={[
                    "Quoted this month",
                    "Win rate snapshot",
                    "Low-margin quotes flagged",
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b-2 border-[#dfbfbc] bg-muted">
        <div className="mx-auto grid max-w-[1400px] gap-0 px-4 sm:px-6 md:grid-cols-5">
          {trustPoints.map((item, index) => (
            <div
              key={item}
              className={`px-4 py-5 text-center text-[11px] font-bold uppercase tracking-[0.14em] ${index < trustPoints.length - 1 ? "md:border-r-2 md:border-[#dfbfbc]" : ""}`}
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="grid gap-0 border-2 border-border lg:grid-cols-2">
          <div className="bg-[#e4e2df] p-6 lg:border-r-2 lg:border-border lg:p-10">
            <div className="forman-kicker">The old way</div>
            <h2 className="mt-3 font-headline text-4xl font-black uppercase tracking-[-0.05em]">Roofing admin drags the work down</h2>
            <div className="mt-8 grid gap-4">
              {problems.map((item) => (
                <div key={item} className="paper-panel bg-background px-4 py-3">
                  <div className="nav-label text-destructive">{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-background p-6 lg:p-10">
            <div className="forman-kicker">The Forman way</div>
            <h2 className="mt-3 font-headline text-4xl font-black uppercase tracking-[-0.05em]">A tighter quoting workflow built for roofers</h2>
            <div className="mt-8 grid gap-4">
              {solutions.map((item) => (
                <div key={item} className="paper-inset px-4 py-3">
                  <div className="nav-label text-primary">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-[#dfbfbc] bg-[#f5f3f0]">
        <div className="mx-auto max-w-[1400px] space-y-16 px-4 py-16 sm:px-6">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className={`grid gap-8 lg:grid-cols-2 lg:items-center ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
            >
              <div>
                <div className="forman-kicker">Feature {index + 1}</div>
                <h2 className="mt-3 font-headline text-4xl font-black uppercase tracking-[-0.05em]">{feature.title}</h2>
                <p className="mt-4 text-lg text-muted-foreground">{feature.body}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/signup">Start Free Trial</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/demo">Book Demo</Link>
                  </Button>
                </div>
              </div>
              <MockPanel title={feature.panelTitle} lines={feature.panelItems} />
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-[#2b2b2b] text-white">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
          <div className="text-center">
            <div className="forman-kicker text-white/60">How it works</div>
            <h2 className="mt-3 font-headline text-4xl font-black uppercase tracking-[-0.05em] sm:text-5xl">Three steps. No bloated setup.</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { step: "01", title: "Set your rates", body: "Enter labor, material pricing, and saved extras so every quote starts from solid numbers." },
              { step: "02", title: "Build and send quotes", body: "Create a professional quote fast, share it cleanly, and keep your scope easy to understand." },
              { step: "03", title: "Win jobs and collect deposits", body: "Track approvals, keep follow-up organized, and take deposits when Stripe is connected." },
            ].map((item) => (
              <div key={item.step} className="border-2 border-white/20 bg-[#3d3d3d] p-5">
                <div className="font-headline text-6xl font-black text-white/20">{item.step}</div>
                <div className="mt-3 font-headline text-2xl font-bold uppercase tracking-[-0.03em]">{item.title}</div>
                <p className="mt-3 text-sm text-white/70">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reviews" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="border-l-8 border-primary pl-5">
          <div className="forman-kicker">Reviews</div>
          <h2 className="forman-title text-4xl">Roofers want practical tools, not more software to babysit.</h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {testimonials.map((item) => (
            <blockquote key={item.name} className="paper-panel p-5">
              <p className="text-base text-foreground">“{item.quote}”</p>
              <footer className="mt-5 border-t-2 border-[#dfbfbc] pt-4">
                <div className="nav-label text-foreground">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.role}</div>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="border-y-2 border-[#dfbfbc] bg-muted">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_420px]">
          <div>
            <div className="forman-kicker">Why Forman</div>
            <h2 className="mt-3 font-headline text-4xl font-black uppercase tracking-[-0.05em]">Less bloated. Faster to learn. Better for quoting.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Built around roofing quotes",
                "Faster for crews to learn",
                "Clearer pricing discipline",
                "Cleaner customer approvals",
                "Deposit-ready without extra clutter",
                "Rugged workflow that matches the product UI",
              ].map((item) => (
                <div key={item} className="paper-panel bg-white px-4 py-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="paper-panel bg-white p-5">
            <div className="forman-kicker">Field note</div>
            <div className="mt-3 font-headline text-3xl font-black uppercase tracking-[-0.05em]">
              Forman is for roofers who want tighter quoting without heavyweight contractor software.
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The point is not to look flashy. The point is to make quoting, approvals, and deposits easier to run in the real world.
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div>
            <div className="forman-kicker">Pricing</div>
            <h2 className="mt-3 font-headline text-4xl font-black uppercase tracking-[-0.05em]">Simple pricing for crews that need to move.</h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Start with a 7-day free trial, set your rates, and start sending roofing quotes without dragging in a bloated platform.
            </p>
          </div>
          <div className="paper-panel bg-white p-6">
            <div className="forman-kicker">Core plan</div>
            <div className="mt-3 font-headline text-6xl font-black tracking-[-0.06em]">$49</div>
            <div className="text-sm text-muted-foreground">per month</div>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="paper-inset p-3">7-day free trial</div>
              <div className="paper-inset p-3">Roofing quote builder</div>
              <div className="paper-inset p-3">Pricing control and saved items</div>
              <div className="paper-inset p-3">Share links, approvals, and PDF output</div>
              <div className="paper-inset p-3">Deposit collection when Stripe is connected</div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/signup">Start Free Trial</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-y-2 border-[#dfbfbc] bg-[#f5f3f0]">
        <div className="mx-auto max-w-[1000px] px-4 py-16 sm:px-6">
          <div className="text-center">
            <div className="forman-kicker">FAQ</div>
            <h2 className="mt-3 font-headline text-4xl font-black uppercase tracking-[-0.05em]">Straight answers for roofing crews.</h2>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map((item, index) => (
              <details key={item.question} className="paper-panel bg-white" open={index === 0}>
                <summary className="cursor-pointer list-none px-5 py-4 font-headline text-xl font-bold uppercase tracking-[-0.03em]">
                  {item.question}
                </summary>
                <div className="border-t-2 border-[#dfbfbc] px-5 py-4 text-sm text-muted-foreground">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="paper-panel bg-white p-8 text-center">
          <div className="forman-kicker">Final call</div>
          <h2 className="mt-3 font-headline text-4xl font-black uppercase tracking-[-0.05em] sm:text-5xl">
            Stop guessing. Start quoting like a pro.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Run tighter quotes, protect margins, and give customers a cleaner approval experience with software built for roofers.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/demo">Book Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-[#dfbfbc] bg-background">
        <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="font-headline text-2xl font-black uppercase tracking-[-0.08em]">Forman</div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              © {new Date().getFullYear()} Forman
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Link href="/pricing">Pricing</Link>
            <Link href="/login?redirectTo=%2Fdashboard">Login</Link>
            <Link href="/signup">Sign Up</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
