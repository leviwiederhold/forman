export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe, mustEnv } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST from the Deposit button." },
    { status: 405 }
  );
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;

  // required envs
  mustEnv("STRIPE_SECRET_KEY");
  mustEnv("NEXT_PUBLIC_SITE_URL");

  const origin =
    req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
      : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const admin = createSupabaseAdminClient();

  // 1) Load quote by share token
  const { data: quote, error } = await admin
    .from("quotes")
    .select("id, total, user_id")
    .eq("share_token", token)
    .single<{ id: string; total: number | null; user_id: string }>();

  if (error || !quote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const total = quote.total ?? 0;
  if (total <= 0) {
    return NextResponse.json({ error: "Invalid quote total" }, { status: 400 });
  }

  // 2) Find roofer’s connected account
  const { data: acct } = await admin
    .from("stripe_connect_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("user_id", quote.user_id)
    .maybeSingle<{ stripe_account_id: string; charges_enabled: boolean | null }>();

  if (!acct?.stripe_account_id) {
    return NextResponse.json({ error: "Roofer not connected to Stripe" }, { status: 409 });
  }
  if (!acct.charges_enabled) {
    return NextResponse.json({ error: "Roofer Stripe not enabled for charges" }, { status: 409 });
  }

  // 3) Create Checkout Session that pays the roofer (destination charge)
  // NOTE: Deposit amount % should come from roofer profile; defaulting to 30% here
  const depositPct = 30;
  const depositAmount = Math.max(1, Math.round((total * (depositPct / 100)) * 100)); // cents

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: depositAmount,
          product_data: { name: "Roof deposit" },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/quotes/share/${token}?deposit=success`,
    cancel_url: `${origin}/quotes/share/${token}?deposit=cancel`,
    metadata: {
      quote_id: quote.id,
      share_token: token,
      deposit_pct: String(depositPct),
    },
    payment_intent_data: {
      transfer_data: {
        destination: acct.stripe_account_id,
      },
    },
  });

  return NextResponse.redirect(session.url!, 303);
}
