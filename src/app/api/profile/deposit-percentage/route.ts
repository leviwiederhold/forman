import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ depositPercent: null }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("deposit_percent")
    .eq("id", auth.user.id)
    .maybeSingle<{ deposit_percent: number | null }>();

  return NextResponse.json({ depositPercent: data?.deposit_percent ?? null });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const depositPercent = Number(body?.depositPercent);

  if (!Number.isFinite(depositPercent) || depositPercent < 0 || depositPercent > 100) {
    return NextResponse.json({ error: "Invalid deposit percent" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: auth.user.id, deposit_percent: depositPercent }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}