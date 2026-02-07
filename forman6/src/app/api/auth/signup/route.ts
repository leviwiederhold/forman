import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getOrigin(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://forman-u4mc.vercel.app";
}

export async function GET(req: Request) {
  const origin = getOrigin(req);
  return NextResponse.redirect(new URL("/signup", origin), 303);
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // keep this for when you turn confirmation back on
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    const to = new URL("/signup", origin);
    to.searchParams.set("error", "auth");
    to.searchParams.set("message", error.message);
    return NextResponse.redirect(to, 303);
  }

  /**
   * ✅ If email confirmations are OFF, Supabase returns a session immediately.
   * That means we can send them straight into the app.
   */
  if (data?.session) {
    return NextResponse.redirect(new URL("/dashboard", origin), 303);
  }

  /**
   * ✅ If confirmations are ON, no session yet → show verify screen.
   */
  const to = new URL("/verify-email", origin);
  to.searchParams.set("email", email);
  return NextResponse.redirect(to, 303);
}