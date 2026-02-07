import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "").trim();
  const redirectTo = String(form.get("redirectTo") ?? "/dashboard");

  if (!email || !password) {
    return NextResponse.redirect(
      new URL(
        `/login?error=auth&message=${encodeURIComponent("Missing email or password")}`,
        req.url
      )
    );
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=auth&message=${encodeURIComponent(error.message)}`,
        req.url
      )
    );
  }

  return NextResponse.redirect(new URL(redirectTo, req.url));
}
