import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Body = { action?: unknown };

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {}

  const action = body.action === "accept" || body.action === "reject" ? body.action : null;
  if (!action) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const update =
    action === "accept"
      ? { status: "accepted", accepted_at: now, rejected_at: null }
      : { status: "rejected", rejected_at: now, accepted_at: null };

  // Only allow first response
  const { data, error } = await supabase
    .from("quotes")
    .update(update)
    .eq("share_token", token)
    .not("status", "in", "(accepted,rejected)")
    .select("id,status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to respond", supabase: { message: error.message } }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Already responded or not found" }, { status: 409 });

  return NextResponse.json({ ok: true, id: data.id, status: data.status }, { status: 200 });
}
