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
    <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-foreground/70">Quotes</div>
          <h1 className="text-lg font-light tracking-wide">All quotes</h1>
        </div>

        <div className="flex gap-2">
          {/* ✅ popup gate */}
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
