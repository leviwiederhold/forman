import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const loginUrl = new URL("/login", _req.url);
  loginUrl.searchParams.set("signed_out", "1");
  return NextResponse.redirect(loginUrl, { status: 303 });
}
