import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getQuoteExpirationStatus } from "@/lib/quotes/expiration";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

type ApproveBody = { quoteId?: string };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const normalizedToken = decodeURIComponent(token).trim();
    const body = (await req.json().catch(() => ({}))) as ApproveBody;
    const bodyQuoteId = typeof body.quoteId === "string" && body.quoteId.trim().length > 0
      ? body.quoteId.trim()
      : null;

    const supabase = await createSupabaseServerClient();
    let admin: ReturnType<typeof createSupabaseAdminClient> | null = null;
    let adminInitError: string | null = null;
    try {
      admin = createSupabaseAdminClient();
    } catch (e) {
      adminInitError = e instanceof Error ? e.message : "admin unavailable";
      admin = null;
    }

    let quote: { id: string; status: string | null; expires_at: string | null; share_token?: string | null } | null = null;

    if (bodyQuoteId) {
      let byId:
        | { id: string; status: string | null; expires_at: string | null; share_token: string | null }
        | null = null;

      if (admin) {
        const { data } = await admin
          .from("quotes")
          .select("id, status, expires_at, share_token")
          .eq("id", bodyQuoteId)
          .maybeSingle<{
            id: string;
            status: string | null;
            expires_at: string | null;
            share_token: string | null;
          }>();
        byId = data ?? null;
      }

      if (!byId) {
        const { data } = await supabase
          .from("quotes")
          .select("id, status, expires_at, share_token")
          .eq("id", bodyQuoteId)
          .maybeSingle<{
            id: string;
            status: string | null;
            expires_at: string | null;
            share_token: string | null;
          }>();
        byId = data ?? null;
      }

      if (byId) {
        // Prefer quoteId from the already-rendered share page to avoid token lookup drift.
        quote = byId;
      }
    }

    if (admin && bodyQuoteId && !quote) {
      const { data: adminById } = await admin
        .from("quotes")
        .select("id, status, expires_at")
        .eq("id", bodyQuoteId)
        .eq("share_token", normalizedToken)
        .maybeSingle<{ id: string; status: string | null; expires_at: string | null }>();
      quote = adminById ?? null;
    }

    if (admin && !quote) {
      const { data: adminQuote } = await admin
        .from("quotes")
        .select("id, status, expires_at, share_token")
        .eq("share_token", normalizedToken)
        .maybeSingle<{ id: string; status: string | null; expires_at: string | null; share_token: string | null }>();
      quote = adminQuote ?? null;
    }

    if (!quote && bodyQuoteId) {
      const { data: fallbackById } = await supabase
        .from("quotes")
        .select("id, status, expires_at")
        .eq("id", bodyQuoteId)
        .eq("share_token", normalizedToken)
        .maybeSingle<{ id: string; status: string | null; expires_at: string | null }>();
      quote = fallbackById ?? null;
    }

    if (!quote) {
      if (bodyQuoteId) {
        const { data: updatedDirect, error: updateDirectErr } = await supabase
          .from("quotes")
          .update({ status: "accepted" })
          .eq("id", bodyQuoteId)
          .eq("share_token", normalizedToken)
          .select("id, status")
          .maybeSingle<{ id: string; status: string | null }>();

        if (updatedDirect && !updateDirectErr) {
          return NextResponse.json(
            {
              ok: true,
              approved: true,
              redirectTo: `/quotes/share/${normalizedToken}?approved=1`,
            },
            { status: 200 }
          );
        }
      }

      const { data: fallbackQuote, error: fallbackErr } = await supabase
        .from("quotes")
        .select("id, status, expires_at, share_token")
        .eq("share_token", normalizedToken)
        .maybeSingle<{ id: string; status: string | null; expires_at: string | null; share_token: string | null }>();
      if (fallbackErr) {
        return NextResponse.json(
          {
            error: `Approve lookup failed: ${fallbackErr.message}`,
            adminInitError,
          },
          { status: 500 }
        );
      }
      if (!fallbackQuote) {
        return NextResponse.json(
          {
            error: "Quote not found",
            adminInitError,
          },
          { status: 404 }
        );
      }
      quote = fallbackQuote;
    }

    if (getQuoteExpirationStatus(quote.expires_at).isExpired) {
      return NextResponse.json({ error: "Quote expired" }, { status: 410 });
    }

    const currentStatus = (quote.status ?? "").toLowerCase();
    if (currentStatus === "accepted") {
      return NextResponse.json({ ok: true, approved: true }, { status: 200 });
    }

    let updateErr: { message?: string } | null = null;
    if (admin) {
      const { error } = await admin
        .from("quotes")
        .update({ status: "accepted" })
        .eq("id", quote.id);
      updateErr = error;
    }

    if (!admin || updateErr) {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "accepted" })
        .eq("id", quote.id);
      updateErr = error;
    }

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message ?? "Approve failed" }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        approved: true,
        redirectTo: `/quotes/share/${normalizedToken}?approved=1`,
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Approve failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
