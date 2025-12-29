import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function originFromReq(req: Request) {
  const u = new URL(req.url);
  return u.origin;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch existing token (RLS ensures ownership)
  const { data: existing, error: readErr } = await supabase
    .from("quotes")
    .select("id, share_token")
    .eq("id", id)
    .single();

  if (readErr || !existing) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  let token = (existing as any).share_token as string | null;

  // If missing, create one
  if (!token) {
    const { data: updated, error: upErr } = await supabase
      .from("quotes")
      .update({ share_token: crypto.randomUUID() })
      .eq("id", id)
      .select("share_token")
      .single();

    if (upErr || !updated) {
      return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
    }

    token = (updated as any).share_token as string;
  }

  const origin = originFromReq(req);
  const share_url = `${origin}/quotes/share/${token}`;

  return NextResponse.json({ ok: true, share_token: token, share_url });
}
