import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getOrigin(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host");

  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://forman-u4mc.vercel.app";
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const origin = getOrigin(req);

  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    const to = new URL("/signup", origin);
    to.searchParams.set("error", "auth");
    to.searchParams.set("message", "Email and password are required.");
    return NextResponse.redirect(to, 303);
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    const to = new URL("/signup", origin);
    to.searchParams.set("error", "auth");
    to.searchParams.set("message", error.message);
    return NextResponse.redirect(to, 303);
  }

  const to = new URL("/verify-email", origin);
  to.searchParams.set("email", email);
  return NextResponse.redirect(to, 303);
}