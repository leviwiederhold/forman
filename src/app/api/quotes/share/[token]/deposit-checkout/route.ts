export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getQuoteExpirationStatus } from "@/lib/quotes/expiration";

type DepositBody = { quoteId?: string };
type QuoteLookupRow = {
  id: string;
  user_id: string;
  subtotal: number | null;
  total: number | null;
  status: string | null;
  expires_at: string | null;
  share_token: string | null;
  low_margin_acknowledged_at: string | null;
  deposit_paid_at: string | null;
  deposit_paid_cents: number | null;
};

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toQuoteLookupRow(row: Record<string, unknown> | null): QuoteLookupRow | null {
  if (!row) return null;
  const id = asString(row.id);
  const userId = asString(row.user_id);
  if (!id || !userId) return null;

  return {
    id,
    user_id: userId,
    subtotal: asNumber(row.subtotal),
    total: asNumber(row.total),
    status: asString(row.status),
    expires_at: asString(row.expires_at),
    share_token: asString(row.share_token),
    low_margin_acknowledged_at: asString(row.low_margin_acknowledged_at),
    deposit_paid_at: asString(row.deposit_paid_at),
    deposit_paid_cents: asNumber(row.deposit_paid_cents),
  };
}

function getOrigin(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function moneyCentsFromPercent(totalDollars: number, percent: number) {
  const totalCents = Math.round(totalDollars * 100);
  const pct = Math.min(100, Math.max(0, percent));
  return Math.round((totalCents * pct) / 100);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const origin = getOrigin(req);

  const { token } = await ctx.params;
  const normalizedToken = token.trim();
  const quoteIdFromQuery = req.nextUrl.searchParams.get("quoteId");
  const body = (await req.json().catch(() => ({}))) as DepositBody;
  const bodyQuoteId =
    typeof body.quoteId === "string" && body.quoteId.trim().length > 0
      ? body.quoteId.trim()
      : typeof quoteIdFromQuery === "string" && quoteIdFromQuery.trim().length > 0
      ? quoteIdFromQuery.trim()
      : null;

  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!stripeKey) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  const supabase = await createSupabaseServerClient();

  let admin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  let adminInitError: string | null = null;
  try {
    admin = createSupabaseAdminClient();
  } catch (e) {
    adminInitError = e instanceof Error ? e.message : "admin unavailable";
    admin = null;
  }

  if (!admin) {
    return NextResponse.json({ error: "Payments service unavailable", adminInitError }, { status: 500 });
  }

  let quote: QuoteLookupRow | null = null;

  if (bodyQuoteId) {
    const { data: byId } = await admin
      .from("quotes")
      .select("*")
      .eq("id", bodyQuoteId)
      .maybeSingle<Record<string, unknown>>();
    quote = toQuoteLookupRow(byId ?? null);
  }

  if (!quote && bodyQuoteId) {
    const { data: byId } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", bodyQuoteId)
      .maybeSingle<Record<string, unknown>>();
    quote = toQuoteLookupRow(byId ?? null);
  }

  if (!quote) {
    const { data: byTokenRows } = await admin
      .from("quotes")
      .select("*")
      .eq("share_token", normalizedToken)
      .order("created_at", { ascending: false })
      .limit(1);
    quote = toQuoteLookupRow((byTokenRows?.[0] as Record<string, unknown> | undefined) ?? null);
  }

  if (!quote) {
    const { data: byTokenRows } = await supabase
      .from("quotes")
      .select("*")
      .eq("share_token", normalizedToken)
      .order("created_at", { ascending: false })
      .limit(1);
    quote = toQuoteLookupRow((byTokenRows?.[0] as Record<string, unknown> | undefined) ?? null);
  }

  if (!quote) {
    return NextResponse.json({ error: "Quote not found", token: normalizedToken, quoteId: bodyQuoteId }, { status: 404 });
  }

  const effectiveShareToken = (quote.share_token ?? "").trim() || normalizedToken;

  if (getQuoteExpirationStatus(quote.expires_at).isExpired) {
    return NextResponse.json({ error: "Quote expired" }, { status: 410 });
  }

  const status = (quote.status ?? "").toLowerCase();
  if (status !== "accepted") {
    return NextResponse.json({ error: "Approve quote first" }, { status: 409 });
  }

  // If already paid, don't create another session
  if (quote.deposit_paid_at || (quote.deposit_paid_cents ?? 0) > 0) {
    return NextResponse.json({ error: "Deposit already paid" }, { status: 409 });
  }

  // Keep the same guardrail as the share page
  const subtotal = typeof quote.subtotal === "number" ? quote.subtotal : 0;
  const total = typeof quote.total === "number" ? quote.total : 0;
  const marginPct = total > 0 ? ((total - subtotal) / total) * 100 : 0;
  const TARGET_MARGIN = 30;

  if (marginPct < TARGET_MARGIN && !quote.low_margin_acknowledged_at) {
    return NextResponse.json({ error: "Quote unavailable" }, { status: 403 });
  }

  // 2) Load roofer deposit settings (preference)
  const { data: prof, error: pErr } = await admin
    .from("profiles")
    .select("deposit_percent, accept_deposits_on_share")
    .eq("id", quote.user_id)
    .maybeSingle<{ deposit_percent: number | null; accept_deposits_on_share: boolean | null }>();

  if (pErr) return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 });

  const accept = Boolean(prof?.accept_deposits_on_share);
  const percent = typeof prof?.deposit_percent === "number" ? prof?.deposit_percent : 0;

  if (!accept || percent <= 0) {
    return NextResponse.json({ error: "Deposits disabled" }, { status: 400 });
  }

  // 3) Ensure roofer has Stripe Connect ready
  const { data: acct, error: aErr } = await admin
    .from("stripe_connect_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("user_id", quote.user_id)
    .maybeSingle<{ stripe_account_id: string; charges_enabled: boolean }>();

  if (aErr) return NextResponse.json({ error: "Payments lookup failed" }, { status: 500 });
  if (!acct?.stripe_account_id) return NextResponse.json({ error: "Payments not setup" }, { status: 400 });
  if (!acct.charges_enabled) return NextResponse.json({ error: "Payments not enabled yet" }, { status: 400 });

  const depositCents = moneyCentsFromPercent(total, percent);
  if (!Number.isFinite(depositCents) || depositCents < 50) {
    return NextResponse.json({ error: "Deposit amount too small" }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "hosted",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: depositCents,
          product_data: { name: "Roofing deposit" },
        },
      },
    ],
    success_url: `${origin}/quotes/share/${effectiveShareToken}?deposit=success`,
    cancel_url: `${origin}/quotes/share/${effectiveShareToken}?deposit=cancel`,
    payment_intent_data: {
      transfer_data: { destination: acct.stripe_account_id },
      metadata: {
        quote_id: quote.id,
        share_token: effectiveShareToken,
        roofer_user_id: quote.user_id,
        kind: "deposit",
      },
    },
    metadata: {
      quote_id: quote.id,
      share_token: effectiveShareToken,
      roofer_user_id: quote.user_id,
      kind: "deposit",
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Payment link unavailable" }, { status: 500 });
  }

  // Store session id for debugging (optional; don't fail if update fails)
  await admin
    .from("quotes")
    .update({ deposit_checkout_session_id: session.id })
    .eq("id", quote.id);

  return NextResponse.json({ url: session.url }, { status: 200 });
}
