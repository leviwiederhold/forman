import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function marginPct(subtotal: number, total: number) {
  if (total <= 0) return 0;
  return ((total - subtotal) / total) * 100;
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  const supabase = await createSupabaseServerClient();

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, subtotal, total, low_margin_acknowledged_at")
    .eq("share_token", token)
    .single<{ id: string; subtotal: number | null; total: number | null; low_margin_acknowledged_at: string | null }>();

  if (error || !quote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ✅ Enforce guardrail again (server authoritative)
  const TARGET_MARGIN = 30;
  const pct = marginPct(quote.subtotal ?? 0, quote.total ?? 0);

  if (pct < TARGET_MARGIN && !quote.low_margin_acknowledged_at) {
    return NextResponse.json({ error: "Quote not shareable" }, { status: 409 });
  }

  const { error: updErr } = await supabase
    .from("quotes")
    .update({ status: "approved" })
    .eq("id", quote.id);

  if (updErr) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.redirect(new URL(`/quotes/share/${token}?approved=1`, "http://localhost"));
}
