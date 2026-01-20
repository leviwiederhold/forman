import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getOrigin(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");

  let origin =
    host
      ? `${proto}://${host}`
      : process.env.NEXT_PUBLIC_SITE_URL ?? "https://forman-u4mc.vercel.app";

  // ✅ Normalize in case env var is missing https://
  if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
    origin = `https://${origin}`;
  }

  return origin;
}

export async function GET(req: Request) {
  // If someone visits the API route directly, send them to the real page.
  const origin = getOrigin(req);
  return NextResponse.redirect(new URL("/signup", origin), 303);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const origin = getOrigin(req);

  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");

  if (!email || !password) {
    if (wantsHtml) {
      const to = new URL("/signup", origin);
      to.searchParams.set("error", "auth");
      to.searchParams.set("message", "Email and password are required.");
      return NextResponse.redirect(to, 303);
    }

    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // ✅ IMPORTANT: this must be your app origin + route
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    if (wantsHtml) {
      const to = new URL("/signup", origin);
      to.searchParams.set("error", "auth");
      to.searchParams.set("message", error.message);
      return NextResponse.redirect(to, 303);
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Browser form: go to verify-email screen (nice UX)
  if (wantsHtml) {
    const to = new URL("/verify-email", origin);
    to.searchParams.set("email", email);
    return NextResponse.redirect(to, 303);
  }

  return NextResponse.json({ ok: true });
}