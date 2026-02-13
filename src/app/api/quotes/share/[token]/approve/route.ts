import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getQuoteExpirationStatus } from "@/lib/quotes/expiration";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { token } = await ctx.params;

    const admin = createSupabaseAdminClient();

    const { data: quote, error: qErr } = await admin
      .from("quotes")
      .select("id, status, expires_at")
      .eq("share_token", token)
      .maybeSingle<{ id: string; status: string | null; expires_at: string | null }>();

    if (qErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (getQuoteExpirationStatus(quote.expires_at).isExpired) {
      return NextResponse.json({ error: "Quote expired" }, { status: 410 });
    }

    const currentStatus = (quote.status ?? "").toLowerCase();
    if (currentStatus === "accepted") {
      return NextResponse.json({ ok: true, approved: true }, { status: 200 });
    }

    const { error: uErr } = await admin
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", quote.id);

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        approved: true,
        redirectTo: `/quotes/share/${token}?approved=1`,
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Approve failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
