import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import QuoteActions from "@/app/quotes/[id]/quote-actions";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (!quote) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border bg-card p-6 text-sm">
          Quote not found.
        </div>
      </main>
    );
  }

  const inputs = quote.inputs_json as { customer_name?: string } | null;
  const pricing = quote.pricing_json as { total?: number } | null;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/quotes">
          <Button variant="outline">← Back</Button>
        </Link>

        <QuoteActions quoteId={quote.id} />
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div>
          <div className="text-sm text-foreground/70">Customer</div>
          <div className="text-base">{inputs?.customer_name ?? "Customer"}</div>
        </div>

        <div>
          <div className="text-sm text-foreground/70">Total</div>
          <div className="text-xl font-light">
            ${Number(pricing?.total ?? 0).toFixed(2)}
          </div>
        </div>

        <div className="text-sm text-foreground/60">
          Created {new Date(quote.created_at).toLocaleString()}
        </div>
      </div>
    </main>
  );
}
