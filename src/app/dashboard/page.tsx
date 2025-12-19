// src/app/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type QuoteRow = {
  id: string;
  created_at: string;
  total: number | null;
  customer_name: string | null;
};

function money(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return `$${v.toFixed(2)}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/login");

  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("id, created_at, total, customer_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-sm text-destructive">Failed to load quotes</div>
        <pre className="mt-3 rounded-xl border p-3 text-xs whitespace-pre-wrap">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  const rows = (quotes ?? []) as QuoteRow[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-medium">Dashboard</div>
          <div className="text-sm text-foreground/60">
            Your most recent quotes
          </div>
        </div>

        <Link
          href="/quotes/new"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-accent"
        >
          New quote
        </Link>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs text-foreground/60 border-b">
          <div className="col-span-5">Customer</div>
          <div className="col-span-3">Total</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {rows.length === 0 ? (
          <div className="p-6 text-sm text-foreground/60">
            No quotes yet. Click <span className="font-medium">New quote</span>.
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((q) => (
              <div
                key={q.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center"
              >
                <div className="col-span-5 min-w-0">
                  <Link
                    href={`/quotes/${q.id}`}
                    className="text-sm truncate hover:underline underline-offset-4"
                  >
                    {q.customer_name?.trim() || "Unnamed customer"}
                  </Link>
                  <div className="text-xs text-foreground/60 truncate">
                    ID: {q.id}
                  </div>
                </div>

                <div className="col-span-3 text-sm">{money(q.total)}</div>

                <div className="col-span-2 text-xs text-foreground/60">
                  {new Date(q.created_at).toLocaleString()}
                </div>

                <div className="col-span-2 flex justify-end gap-2">
                  <Link
                    href={`/quotes/${q.id}`}
                    className="rounded-xl border px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    View
                  </Link>
                  <a
                    href={`/api/quotes/${q.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
