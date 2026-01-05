import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function randomToken(len = 22): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let out = "";
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// POST /api/quotes/:id/share
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Read existing token (RLS ensures it's theirs)
  const { data: existing, error: readErr } = await supabase
    .from("quotes")
    .select("id, share_token")
    .eq("id", id)
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
      .eq("id", id);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // Client will build absolute URL; still return helpful pieces
  return NextResponse.json({
    token,
    url: `/quotes/share/${token}`,
  });
}
