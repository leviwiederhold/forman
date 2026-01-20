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

export async function GET(req: Request) {
  // If someone visits the API route directly, just send them to the real page.
  const origin = getOrigin(req);
  return NextResponse.redirect(new URL("/signup", origin), 303);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const origin = getOrigin(req);

  if (!email || !password) {
    // If a normal browser form POST, redirect back with a message
    const accept = req.headers.get("accept") ?? "";
    if (accept.includes("text/html")) {
      const to = new URL("/signup", origin);
      to.searchParams.set("error", "auth");
      to.searchParams.set("message", "Email and password are required.");
      return NextResponse.redirect(to, 303);
    }

    // For fetch() usage
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // ✅ IMPORTANT: send them back to YOUR app, not supabase.co/whatever
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    const accept = req.headers.get("accept") ?? "";
    if (accept.includes("text/html")) {
      const to = new URL("/signup", origin);
      to.searchParams.set("error", "auth");
      to.searchParams.set("message", error.message);
      return NextResponse.redirect(to, 303);
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Browser form: go to verify email screen (nice UX)
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    const to = new URL("/verify-email", origin);
    to.searchParams.set("email", email);
    return NextResponse.redirect(to, 303);
  }

  return NextResponse.json({ ok: true });
}