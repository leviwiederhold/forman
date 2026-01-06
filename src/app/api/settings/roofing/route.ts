import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoofingRateCardSchema } from "@/trades/roofing/schema";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const parsed = RoofingRateCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rate card payload" },
      { status: 400 }
    );
  }

  const rates = parsed.data;

  const { error } = await supabase.from("rate_cards").insert({
    user_id: auth.user.id,
    trade: "roofing",
    rates_json: rates,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save rate card" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
