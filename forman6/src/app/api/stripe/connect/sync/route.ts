import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: connect } = await admin
    .from("stripe_connect_accounts")
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connect?.stripe_account_id) {
    return NextResponse.json({ ok: true });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
  });

  const account = await stripe.accounts.retrieve(
    connect.stripe_account_id
  );

  await admin
    .from("stripe_connect_accounts")
    .update({
      charges_enabled: account.charges_enabled,
    })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}