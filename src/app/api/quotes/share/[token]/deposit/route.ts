import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe, mustEnv } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

function getOrigin(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let origin =
    host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "https://forman-u4mc.vercel.app";

  if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
    origin = `https://${origin}`;
  }
  return origin;
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed. Use POST." }, { status: 405 });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  mustEnv("STRIPE_SECRET_KEY");

  const { token } = await ctx.params;
  const origin = getOrigin(req);

  const supabase = createSupabaseAdminClient();

  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select("id, user_id, customer_name, total, payment_status")
    .eq("share_token", token)
    .single<{
      id: string;
      user_id: string;
      customer_name: string | null;
      total: number | null;
      payment_status: string;
    }>();

  if (qErr || !quote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (quote.payment_status === "paid") {
    const to = new URL(`/quotes/share/${token}`, origin);
    to.searchParams.set("paid", "1");
    return NextResponse.redirect(to, 303);
  }

  const total = typeof quote.total === "number" ? quote.total : 0;
  if (total <= 0) {
    return NextResponse.json({ error: "Invalid quote total" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("deposit_percent")
    .eq("id", quote.user_id)
    .maybeSingle<{ deposit_percent: number | null }>();

  const depositPercent =
    typeof profile?.deposit_percent === "number" && profile.deposit_percent > 0
      ? profile.deposit_percent
      : 25;

  const depositAmount = Math.round(total * (depositPercent / 100) * 100) / 100;
  const amountCents = Math.max(50, Math.round(depositAmount * 100));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Roofing deposit",
            description: `Deposit for ${quote.customer_name ?? "customer"} (Quote ${quote.id.slice(
              0,
              8
            )})`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/quotes/share/${token}?paid=1`,
    cancel_url: `${origin}/quotes/share/${token}?canceled=1`,
    metadata: {
      kind: "deposit",
      quote_id: quote.id,
      share_token: token,
    },
  });

  await supabase
    .from("quotes")
    .update({
      deposit_percent: depositPercent,
      deposit_amount: depositAmount,
      payment_status: "pending",
      stripe_checkout_session_id: session.id,
    })
    .eq("id", quote.id);

  return NextResponse.redirect(session.url!, 303);
}