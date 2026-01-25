// src/app/api/quotes/share/[token]/deposit/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = {
  params: {
    token: string;
  };
};

export async function POST(req: Request, { params }: Params) {
  const { token } = params;

  const supabase = createSupabaseAdminClient();

  // 1️⃣ Load quote by share token
  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      `
      id,
      total,
      deposit_amount,
      customer_email,
      user_id
    `
    )
    .eq("share_token", token)
    .single();

  if (error || !quote) {
    return NextResponse.json(
      { error: "Quote not found" },
      { status: 404 }
    );
  }

  const depositCents = Math.round(
    (quote.deposit_amount ?? quote.total) * 100
  );

  // 2️⃣ Create Stripe Checkout (deposit only)
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: quote.customer_email ?? undefined,

    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Roofing Project Deposit",
          },
          unit_amount: depositCents,
        },
        quantity: 1,
      },
    ],

    metadata: {
      quote_id: quote.id,
      user_id: quote.user_id,
      type: "deposit",
    },

    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/quotes/${quote.id}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/quotes/${quote.id}`,
  });

  // 3️⃣ Redirect browser to Stripe Checkout
  return NextResponse.redirect(session.url!, 303);
}