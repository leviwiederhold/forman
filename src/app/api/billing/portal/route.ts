import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
  .from("billing_subscriptions")
  .select("stripe_customer_id")
  .eq("user_id", auth.user.id)
  .maybeSingle<{ stripe_customer_id: string | null }>();

if (error || !data?.stripe_customer_id) {
  return NextResponse.json({ error: "No billing customer found" }, { status: 400 });
}


  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const portal = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${siteUrl}/billing`,
  });

  return NextResponse.redirect(portal.url, { status: 303 });
}
