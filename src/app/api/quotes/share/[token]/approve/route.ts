import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function marginPct(subtotal: number, total: number) {
  if (total <= 0) return 0;
  return ((total - subtotal) / total) * 100;
}

// Avoid confusing browser 405 if someone opens the endpoint
export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST from the Approve button." },
    { status: 405 }
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, subtotal, total, low_margin_acknowledged_at")
    .eq("share_token", token)
    .single<{
      id: string;
      subtotal: number | null;
      total: number | null;
      low_margin_acknowledged_at: string | null;
    }>();

  if (error || !quote) {
    return NextResponse.json(
      { error: "Not found", detail: error?.message ?? null },
      { status: 404 }
    );
  }

  // Optional: keep your guardrail
  const TARGET_MARGIN = 30;
  const pct = marginPct(quote.subtotal ?? 0, quote.total ?? 0);

  if (pct < TARGET_MARGIN && !quote.low_margin_acknowledged_at) {
    return NextResponse.json({ error: "Quote not shareable" }, { status: 409 });
  }

  // ✅ Use values your current app already uses: draft/accepted/rejected
  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("quotes")
    .update({ status: "accepted", accepted_at: now })
    .eq("id", quote.id);

  if (updErr) {
    return NextResponse.json(
      { error: "Update failed", detail: updErr.message },
      { status: 500 }
    );
  }

  // Redirect back to the share page (works on Vercel + local)
  const url = new URL(req.url);
  url.pathname = `/quotes/share/${token}`;
  url.search = "approved=1";
  return NextResponse.redirect(url, 303);
}
