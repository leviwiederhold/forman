// src/app/api/stripe/connect/onboard/route.ts
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getOrigin(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function handler(req: NextRequest) {
  const origin = getOrigin(req);

  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!stripeKey) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/login", origin), 303);

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });

  // fetch existing connect account
  const { data: existing, error: selErr } = await supabase
    .from("stripe_connect_accounts")
    .select("stripe_account_id")
    .eq("user_id", auth.user.id)
    .maybeSingle<{ stripe_account_id: string }>();

  if (selErr) {
    return NextResponse.json({ error: "DB read failed", detail: selErr.message }, { status: 500 });
  }

  let accountId = existing?.stripe_account_id ?? null;

  if (!accountId) {
    const acct = await stripe.accounts.create({
      type: "express",
      email: auth.user.email ?? undefined,
      metadata: { user_id: auth.user.id },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    accountId = acct.id;

    const { error: insErr } = await supabase.from("stripe_connect_accounts").insert({
      user_id: auth.user.id,
      stripe_account_id: accountId,
      charges_enabled: acct.charges_enabled,
      payouts_enabled: acct.payouts_enabled,
      details_submitted: acct.details_submitted,
      updated_at: new Date().toISOString(),
    });

    if (insErr) {
      return NextResponse.json({ error: "DB insert failed", detail: insErr.message }, { status: 500 });
    }
  }

  const refreshUrl = new URL("/settings/billing?connect=retry", origin).toString();
  const returnUrl = new URL("/api/stripe/connect/return", origin).toString();

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: refreshUrl,
    return_url: returnUrl,
  });

  return NextResponse.redirect(link.url, 303);
}

export async function GET(req: NextRequest) {
  return handler(req);
}

// ✅ prevents 405 if your UI accidentally posts
export async function POST(req: NextRequest) {
  return handler(req);
}