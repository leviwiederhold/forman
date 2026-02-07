export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getOrigin(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null) as null | {
    quoteId: string;
    depositDollars: number;
  };

  if (!body?.quoteId || !Number.isFinite(body.depositDollars) || body.depositDollars <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const depositCents = Math.round(body.depositDollars * 100);

  // Get roofer's connected account id
  const { data: acct } = await supabase
    .from("stripe_connect_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("user_id", auth.user.id)
    .maybeSingle<{ stripe_account_id: string; charges_enabled: boolean }>();

  if (!acct?.stripe_account_id) {
    return NextResponse.json({ error: "Connect not setup" }, { status: 400 });
  }
  if (!acct.charges_enabled) {
    return NextResponse.json({ error: "Connect not enabled yet" }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
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
    success_url: `${origin}/quotes/${body.quoteId}?deposit=success`,
    cancel_url: `${origin}/quotes/${body.quoteId}?deposit=cancel`,
    payment_intent_data: {
      // ✅ money goes to roofer
      transfer_data: { destination: acct.stripe_account_id },
      // optional: platform fee = 0 for now
      // application_fee_amount: 0,
      metadata: {
        quote_id: body.quoteId,
        roofer_user_id: auth.user.id,
        kind: "deposit",
      },
    },
    metadata: {
      quote_id: body.quoteId,
      roofer_user_id: auth.user.id,
      kind: "deposit",
    },
  });

  return NextResponse.json({ url: session.url });
}
