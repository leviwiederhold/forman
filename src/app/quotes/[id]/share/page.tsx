import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PublicQuotePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createSupabaseServerClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_name, pricing, created_at")
    .eq("id", params.id)
    .single();

  if (!quote) {
    return <div className="p-8">Quote not found</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Estimate</h1>

      <div className="text-sm text-muted-foreground">
        {quote.customer_name} ·{" "}
        {new Date(quote.created_at).toLocaleDateString()}
      </div>

      <div className="rounded-xl border p-4">
        {quote.pricing.line_items.map((it: any, i: number) => (
          <div key={i} className="flex justify-between py-1">
            <span>{it.name}</span>
            <span>${it.subtotal.toFixed(2)}</span>
          </div>
        ))}

        <div className="mt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span>${quote.pricing.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
