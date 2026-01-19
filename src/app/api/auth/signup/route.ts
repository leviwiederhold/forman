import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "").trim();

  if (!email || !password) {
    return NextResponse.redirect(
      new URL(
        `/signup?error=auth&message=${encodeURIComponent("Missing email or password")}`,
        req.url
      )
    );
  }

  const url = new URL(req.url);
  const origin = url.origin;

  // ✅ confirmation link will return to our callback
  const emailRedirectTo = `${origin}/api/auth/callback?redirectTo=/dashboard`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/signup?error=auth&message=${encodeURIComponent(error.message)}`,
        req.url
      )
    );
  }

  return NextResponse.redirect(new URL("/verify-email", req.url));
}
