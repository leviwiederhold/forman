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

  const formData = await req.formData();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // 🔒 Guard: required fields
  if (!email || !password) {
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
      // ✅ FORCE correct verification redirect
      emailRedirectTo: `${origin}/verify-email`,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  /**
   * ✅ IMPORTANT:
   * If this request came from a normal <form>,
   * redirect to a real page instead of showing JSON.
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