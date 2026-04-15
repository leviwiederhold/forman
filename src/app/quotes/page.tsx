import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import QuotesListClient from "./quotes-list-client";
import { NewQuoteButton } from "@/components/new-quote-button";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: rows } = await supabase
    .from("quotes")
    .select("id, trade, customer_name, status, subtotal, tax, total, created_at, pricing_json, inputs_json")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="forman-page">
      <div className="status-strip flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>Quote work orders</span>
        <span>Newest quotes at the top when available from the backend</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="border-l-8 border-primary pl-5">
          <div className="forman-kicker">Quotes</div>
          <h1 className="forman-title text-4xl">All quotes</h1>
          <div className="forman-subtitle mt-2">Live records, share status, duplication, and delete actions preserved.</div>
        </div>

        <div className="flex gap-2">
          <NewQuoteButton />

          <Button asChild variant="outline">
            <Link href="/settings/roofing">Pricing</Link>
          </Button>
        </div>
      </div>

      <QuotesListClient rows={rows ?? []} />
    </main>
  );
}
