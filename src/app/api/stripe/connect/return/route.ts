// src/app/api/stripe/connect/return/route.ts
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
  const errorUrl = new URL("/settings/billing?connect=error", origin);

  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!stripeKey) {
    console.error("Missing STRIPE_SECRET_KEY");
    return NextResponse.redirect(errorUrl, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return NextResponse.redirect(new URL("/login", origin), 303);

  const { data: row } = await supabase
    .from("stripe_connect_accounts")
    .select("stripe_account_id")
    .eq("user_id", auth.user.id)
    .maybeSingle<{ stripe_account_id: string }>();

  if (!row?.stripe_account_id) {
    return NextResponse.redirect(new URL("/settings/billing?connect=missing", origin), 303);
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });
    const acct = await stripe.accounts.retrieve(row.stripe_account_id);

    await supabase
      .from("stripe_connect_accounts")
      .update({
        charges_enabled: acct.charges_enabled,
        payouts_enabled: acct.payouts_enabled,
        details_submitted: acct.details_submitted,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", auth.user.id);
  } catch (error) {
    console.error("Stripe connect return sync failed:", error);
    return NextResponse.redirect(errorUrl, 303);
  }

  return NextResponse.redirect(new URL("/settings/billing?connect=done", origin), 303);
}

export async function GET(req: NextRequest) {
  return handler(req);
}

// ✅ prevents 405 if something hits POST
export async function POST(req: NextRequest) {
  return handler(req);
}
