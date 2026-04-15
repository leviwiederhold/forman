import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roofingDemoQuote } from "@/lib/demo/roofing-demo-quote";
import { DemoQuoteViewTracker } from "@/components/demo-quote-view-tracker";
import { DemoQuoteDuplicateButton } from "@/components/demo-quote-duplicate-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default async function DemoQuotePage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const demo = roofingDemoQuote;

  return (
    <main className="forman-page">
      <DemoQuoteViewTracker />

      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/demo">← Back</Link>
        </Button>
        <div className="forman-kicker">Roofing demo</div>
      </div>

      <section className="paper-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Demo quote</Badge>
              <Badge variant="outline">Roofing only</Badge>
            </div>
            <div className="mt-3 font-headline text-4xl font-black uppercase tracking-[-0.04em]">
              {demo.customerName}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{demo.customerAddress}</div>
            <div className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {demo.status} · built to show the real roofing quote workflow without touching live customer data
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Issued {demo.createdAtLabel} · valid {demo.expiresAtLabel}
            </div>
          </div>

          <div className="min-w-[220px] paper-inset p-3">
            <div className="forman-kicker">Profitability</div>
            <div className="mt-2 grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{money(demo.profitability.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{money(demo.profitability.tax)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{money(demo.profitability.total)}</span>
              </div>
              <div className="flex justify-between border-t border-[#dfbfbc] pt-2">
                <span className="text-muted-foreground">Gross profit</span>
                <span>{money(demo.profitability.profit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margin</span>
                <span>{demo.profitability.marginPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <DemoQuoteDuplicateButton isLoggedIn={Boolean(auth.user)} />
          <Button asChild size="lg" variant="outline">
            <Link href="/signup?redirectTo=%2Fdemo%2Fquote">Use this example during signup</Link>
          </Button>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          This is seeded example data. Duplicating it creates a separate draft inside your own quotes so the demo never overwrites real customer records.
        </div>
      </section>

      <section className="paper-panel p-5">
        <div className="forman-kicker">Customer and job info</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="paper-inset p-3">
            <div className="field-label">Roof size</div>
            <div>{demo.payload.inputs.roof_size_value} {demo.payload.inputs.roof_size_unit}</div>
          </div>
          <div className="paper-inset p-3">
            <div className="field-label">Pitch</div>
            <div>{demo.payload.inputs.pitch}</div>
          </div>
          <div className="paper-inset p-3">
            <div className="field-label">Stories</div>
            <div>{demo.payload.inputs.stories}</div>
          </div>
          <div className="paper-inset p-3">
            <div className="field-label">Tear-off</div>
            <div>{demo.payload.inputs.tearoff ? `Yes · ${demo.payload.inputs.layers} layer` : "No"}</div>
          </div>
        </div>
      </section>

      <section className="paper-panel p-5">
        <div className="forman-kicker">Line items</div>
        <div className="mt-3 space-y-2">
          {demo.lineItems.map((item) => (
            <div key={`${item.name}-${item.category}`} className="paper-inset flex items-start justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <div className="text-foreground">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.quantity} {item.unit} × {money(item.unit_price)}
                </div>
              </div>
              <div className="shrink-0 font-medium">{money(item.subtotal)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="paper-panel p-5">
          <div className="forman-kicker">Quote status flow</div>
          <div className="mt-3 space-y-2">
            {demo.statusSteps.map((step) => (
              <div key={step.label} className="paper-inset flex items-center justify-between gap-3 p-3 text-sm">
                <span>{step.label}</span>
                <Badge variant={step.state === "pending" ? "outline" : step.state === "active" ? "default" : "secondary"}>
                  {step.state}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="paper-panel p-5">
            <div className="forman-kicker">Share and approval path</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="paper-inset p-3">
                <div className="field-label">Share URL preview</div>
                <div className="break-all">{demo.shareFlow.shareUrlLabel}</div>
              </div>
              <div className="paper-inset p-3">{demo.shareFlow.approval}</div>
              <div className="paper-inset p-3">{demo.shareFlow.followUp}</div>
            </div>
          </div>

          <div className="paper-panel p-5">
            <div className="forman-kicker">Deposit option</div>
            <div className="mt-3 paper-inset p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>{demo.deposit.percent}% deposit available after approval</span>
                <Badge>{money(demo.deposit.amount)}</Badge>
              </div>
              <div className="mt-2 text-muted-foreground">{demo.deposit.note}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
