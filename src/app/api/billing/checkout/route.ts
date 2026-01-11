import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function POST() {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!secret) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    if (!priceId) return NextResponse.json({ error: "Missing STRIPE_PRICE_ID" }, { status: 500 });
    if (!siteUrl) return NextResponse.json({ error: "Missing NEXT_PUBLIC_SITE_URL" }, { status: 500 });

    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Look for existing Stripe customer
    const { data: existing, error: fetchErr } = await supabase
      .from("billing_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", auth.user.id)
      .maybeSingle<{ stripe_customer_id: string | null }>();

    if (fetchErr) {
      return NextResponse.json({ error: "DB error", details: fetchErr.message }, { status: 500 });
    }

    let customerId = existing?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.user.email ?? undefined,
        metadata: { user_id: auth.user.id },
      });
      customerId = customer.id;

      const { error: upsertErr } = await supabase
        .from("billing_subscriptions")
        .upsert(
          { user_id: auth.user.id, stripe_customer_id: customerId },
          { onConflict: "user_id" }
        );

      if (upsertErr) {
        return NextResponse.json(
          { error: "Failed to save customer", details: upsertErr.message },
          { status: 500 }
        );
      }
    }

    // No-card trial model: subscription starts when they complete Checkout (no Stripe trial)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { user_id: auth.user.id },
      },
      success_url: `${siteUrl}/quotes?checkout=success`,
      cancel_url: `${siteUrl}/billing?checkout=cancel`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe session missing URL" }, { status: 500 });
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (e) {
    // This will show you the real error in Vercel Logs
    console.error("Checkout error:", e);
    return NextResponse.json(
      { error: "Checkout failed", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
