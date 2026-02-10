import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getQuoteExpirationStatus } from "@/lib/quotes/expiration";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { token } = await ctx.params;

    const supabase = await createSupabaseServerClient();

    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .select("id, status, expires_at")
      .eq("share_token", token)
      .single();

    if (qErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (getQuoteExpirationStatus(quote.expires_at).isExpired) {
      return NextResponse.json({ error: "Quote expired" }, { status: 410 });
    }

    const { error: uErr } = await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", quote.id);

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    return NextResponse.redirect(
      new URL(`/quotes/share/${token}?approved=1`, req.url),
      { status: 303 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Approve failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
