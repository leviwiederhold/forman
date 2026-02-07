export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin env vars");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!stripeKey) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verify failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const isSubEvent =
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted";

  if (isSubEvent) {
    // Use a tight shape but include the fields we need.
    const sub = event.data.object as unknown as {
      id: string;
      status: string; // "trialing" | "active" | "canceled" | etc.
      customer: string | { id: string };
      metadata?: Record<string, string>;
      current_period_end?: number | null;
      trial_end?: number | null;
    };

    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    // Prefer metadata.user_id (set in checkout subscription_data.metadata)
    let resolvedUserId: string | null = (sub.metadata?.user_id ?? "").trim() || null;

    // Fallback: look up user by stored stripe_customer_id
    if (!resolvedUserId) {
      const { data, error } = await admin
        .from("billing_subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle<{ user_id: string }>();

      if (!error) resolvedUserId = data?.user_id ?? null;
    }

    if (resolvedUserId) {
      const currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;

      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

      const { error } = await admin.from("billing_subscriptions").upsert(
        {
          user_id: resolvedUserId,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          status: sub.status, // store "trialing" or "active"
          current_period_end: currentPeriodEnd,
          trial_end: trialEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.error("billing_subscriptions upsert failed:", error);
        // Still return 200 so Stripe doesn't keep retrying forever.
      }
    } else {
      console.warn("No user resolved for customer:", customerId, "event:", event.type);
    }
  }

  const isDepositEvent = event.type === "checkout.session.completed";

  if (isDepositEvent) {
    const session = event.data.object as unknown as {
      id: string;
      amount_total?: number | null;
      payment_status?: string | null;
      metadata?: Record<string, string>;
      payment_intent?: string | null;
    };

    const kind = (session.metadata?.kind ?? "").toLowerCase();
    const quoteId = (session.metadata?.quote_id ?? "").trim();

    if (kind === "deposit" && quoteId) {
      const paid = (session.payment_status ?? "").toLowerCase() === "paid";
      const amountTotal = typeof session.amount_total === "number" ? session.amount_total : null;

      if (paid && amountTotal && amountTotal > 0) {
        const { error } = await admin
          .from("quotes")
          .update({
            deposit_paid_cents: amountTotal,
            deposit_paid_at: new Date().toISOString(),
            status: "accepted",
          })
          .eq("id", quoteId);

        if (error) {
          console.error("Deposit update failed:", error);
        }
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
