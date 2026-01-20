import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getOrigin(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");

  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://forman-u4mc.vercel.app";
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const formData = await req.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // 🔒 Guard: required fields
  if (!email || !password) {
    const accept = req.headers.get("accept") ?? "";
    if (accept.includes("text/html")) {
      const origin = getOrigin(req);
      const url = new URL(`${origin}/signup`);
      url.searchParams.set("error", "Email and password are required.");
      return NextResponse.redirect(url, 303);
    }

    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const origin = getOrigin(req);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // ✅ IMPORTANT: send the email link to the callback that exchanges the code
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    const accept = req.headers.get("accept") ?? "";
    if (accept.includes("text/html")) {
      const url = new URL(`${origin}/signup`);
      url.searchParams.set("error", error.message);
      return NextResponse.redirect(url, 303);
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  /**
   * If this request came from a normal <form>, redirect to a real page instead of JSON.
   * That page should just tell them to check their email.
   */
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    const url = new URL(`${origin}/verify-email`);
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, 303);
  }

  // For fetch() usage
  return NextResponse.json({ ok: true });
}