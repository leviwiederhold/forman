export const runtime = "nodejs";

import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://forman-u4mc.vercel.app").replace(/\/$/, "");
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) Create connected account (Express)
  const account = await stripe.accounts.create({
    type: "express",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  // 2) Create onboarding link
  const urlBase = siteUrl();
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${urlBase}/settings/billing?connect=retry`,
    return_url: `${urlBase}/settings/billing?connect=done`,
    type: "account_onboarding",
  });

  // 3) Save account id to user profile (YOU NEED THIS TABLE/COLUMN)
  // If your table is different, change "profiles" + "stripe_account_id".
  await supabase
    .from("profiles")
    .update({ stripe_account_id: account.id })
    .eq("id", data.user.id);

  return NextResponse.json({ url: accountLink.url });
}