export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://forman-u4mc.vercel.app";
  return NextResponse.redirect(new URL("/billing", siteUrl), { status: 303 });
}

export async function POST() {
  const secret = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  const priceId = (process.env.STRIPE_PRICE_ID ?? "").trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();

  if (!secret) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  if (!priceId) return NextResponse.json({ error: "Missing STRIPE_PRICE_ID" }, { status: 500 });
  if (!siteUrl) return NextResponse.json({ error: "Missing NEXT_PUBLIC_SITE_URL" }, { status: 500 });

  // Create Stripe inside the handler
  const stripe = new Stripe(secret);

  try {
    // ✅ If this fails, Vercel/Edge/runtime/env is the issue — not your code.
    await stripe.accounts.retrieve();

    // ✅ If this fails, your STRIPE_PRICE_ID in PROD is wrong.
    await stripe.prices.retrieve(priceId);

    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        .upsert({ user_id: auth.user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });

      if (upsertErr) {
        return NextResponse.json(
          { error: "Failed to save customer", details: upsertErr.message },
          { status: 500 }
        );
      }
    }

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
    const err = e as any;
    console.error("Checkout error:", err);

    return NextResponse.json(
      {
        error: "Checkout failed",
        details: err?.message ?? String(e),
        // ✅ SAFE debug (no secrets):
        debug: {
          priceId_prefix: priceId.slice(0, 12),
          siteUrl,
        },
      },
      { status: 500 }
    );
  }
}
