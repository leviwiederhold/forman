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
  const supabase = await createSupabaseServerClient();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  const origin = getOrigin(req);

  if (!code) {
    const to = new URL("/login", origin);
    to.searchParams.set("error", "missing_code");
    return NextResponse.redirect(to, 303);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const to = new URL("/login", origin);
    to.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(to, 303);
  }

  // ✅ success: session cookies set -> go to app
  return NextResponse.redirect(new URL("/dashboard", origin), 303);
}