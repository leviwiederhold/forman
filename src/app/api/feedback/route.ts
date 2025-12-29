import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const body = await req.json().catch(() => null);
  if (!body?.message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const { error } = await supabase.from("feedback").insert({
    message: String(body.message),
    email: body.email ? String(body.email) : null,
    user_id: auth.user?.id ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
