export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeConnectStatus } from "@/lib/billing/stripe-connect-status";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectToBilling = (state: "done" | "retry" | "error" | "missing") => {
    url.pathname = "/settings/billing";
    url.search = `connect=${state}`;
    return NextResponse.redirect(url, 303);
  };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url, 303);
  }

  const { data: connect } = await supabase
    .from("stripe_connect_accounts")
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connect?.stripe_account_id) {
    return redirectToBilling("missing");
  }

  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!stripeKey) {
    console.error("Missing STRIPE_SECRET_KEY");
    return redirectToBilling("error");
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });
    const account = await stripe.accounts.retrieve(connect.stripe_account_id);

    await supabase
      .from("stripe_connect_accounts")
      .update({
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    const status = getStripeConnectStatus({
      stripe_account_id: connect.stripe_account_id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });

    return redirectToBilling(status === "connected" ? "done" : "retry");
  } catch (error) {
    console.error("Stripe connect refresh failed:", error);
    return redirectToBilling("error");
  }
}

export async function POST(req: Request) {
  return GET(req);
}
