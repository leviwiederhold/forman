import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Email verification gate (launch hardening)
  if (!auth.user.email_confirmed_at) {
    return NextResponse.json(
      { error: "Verify your email to continue." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("quotes")
    .update({ low_margin_acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to acknowledge low margin." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
