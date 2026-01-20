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
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const origin = getOrigin(req);

  if (!code) {
    const to = new URL("/login", origin);
    to.searchParams.set("error", "missing_code");
    return NextResponse.redirect(to, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const to = new URL("/login", origin);
    to.searchParams.set("error", "verification_failed");
    to.searchParams.set("message", error.message);
    return NextResponse.redirect(to, 303);
  }

  return NextResponse.redirect(new URL("/dashboard", origin), 303);
}