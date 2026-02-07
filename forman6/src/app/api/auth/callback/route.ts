import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirectTo") || "/dashboard";

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errUrl = new URL("/login", url.origin);
      errUrl.searchParams.set("error", "auth");
      errUrl.searchParams.set("message", "Verification failed. Please log in.");
      return NextResponse.redirect(errUrl);
    }
  }

  // Never redirect to API paths
  const safe =
    redirectTo.startsWith("/api/") || !redirectTo.startsWith("/")
      ? "/dashboard"
      : redirectTo;

  return NextResponse.redirect(new URL(safe, url.origin));
}
