import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function randomToken(len = 22): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let out = "";
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: existing, error: readErr } = await supabase
    .from("quotes")
    .select("id, share_token")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single<{ id: string; share_token: string | null }>();

  if (readErr || !existing) {
    return NextResponse.json({ error: "quote_not_found" }, { status: 404 });
  }

  let token = existing.share_token;

  if (!token) {
    token = randomToken();

    const { error: upErr } = await supabase
      .from("quotes")
      .update({ share_token: token })
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    token,
    url: `/quotes/share/${token}`,
  });
}
