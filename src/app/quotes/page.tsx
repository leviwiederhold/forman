import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import QuotesListClient from "./quotes-list-client";

export const dynamic = "force-dynamic";

type QuoteRow = {
  id: string;
  trade: string | null;
  created_at: string;
  customer_name: string | null;
  status: string | null;
  total: number | null;
};

export default async function QuotesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("id, trade, created_at, customer_name, status, total")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) console.error("Failed to load quotes:", error.message);

  const rows: QuoteRow[] = (quotes ?? []).map((q) => ({
    id: q.id,
    trade: q.trade,
    created_at: q.created_at,
    customer_name: q.customer_name,
    status: q.status,
    total: q.total,
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-foreground/70">Quotes</div>
          <h1 className="text-lg font-light tracking-wide">All quotes</h1>
        </div>

        <Button asChild>
          <Link href="/quotes/new">New Quote</Link>
        </Button>
      </div>

      <QuotesListClient rows={rows} />
    </main>
  );
}
