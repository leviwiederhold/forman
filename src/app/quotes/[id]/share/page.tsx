import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function QuoteSharePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (!quote) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Quote Preview</h1>

      <pre className="rounded-xl border bg-card p-4 text-sm overflow-x-auto">
        {JSON.stringify(quote, null, 2)}
      </pre>
    </div>
  );
}
