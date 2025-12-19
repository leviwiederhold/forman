import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

type QuoteRow = {
  id: string;
  user_id: string;
  trade: string;
  customer_name: string | null;
  created_at: string;
  pricing: {
    total: number;
    line_items: Array<{
      name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      subtotal: number;
    }>;
  };
};

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="rounded-xl border p-4 text-sm">
          <div className="font-medium">Invalid route param</div>
          <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify({ id }, null, 2)}</pre>
        </div>

        <Link className="underline underline-offset-4" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="rounded-xl border p-4 text-sm">Unauthorized</div>
        <Link className="underline underline-offset-4" href="/login">
          Go to login
        </Link>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("quotes")
    .select("id, user_id, trade, customer_name, created_at, pricing")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle<QuoteRow>();

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="rounded-xl border p-4 text-sm space-y-2">
          <div className="font-medium">Quote not found</div>
          <div className="text-foreground/70">Requested ID: {id}</div>
          <div className="text-foreground/70">Signed-in user: {auth.user.id}</div>
          {error ? (
            <pre className="mt-2 whitespace-pre-wrap text-xs">{safeMessage(error)}</pre>
          ) : null}
        </div>

        <Link className="underline underline-offset-4" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const total = data.pricing?.total ?? 0;
  const items = data.pricing?.line_items ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-foreground/70">Quote</div>
          <div className="text-xl font-semibold">{data.customer_name ?? "Customer"}</div>
          <div className="text-sm text-foreground/70">
            {new Date(data.created_at).toLocaleString()}
          </div>
          <div className="text-xs text-foreground/60 mt-1">ID: {data.id}</div>
        </div>

        <div className="text-right">
          <div className="text-sm text-foreground/70">Total</div>
          <div className="text-2xl font-semibold">${Number(total).toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-medium mb-3">Line items</div>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate">{it.name}</div>
                <div className="text-xs text-foreground/60">
                  {it.quantity} {it.unit} × ${Number(it.unit_price).toFixed(2)}
                </div>
              </div>
              <div className="font-medium">${Number(it.subtotal).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <Link className="underline underline-offset-4" href="/dashboard">
        Back
      </Link>
    </div>
  );
}
