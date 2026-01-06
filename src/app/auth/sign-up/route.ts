// src/app/auth/sign-up/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(new URL("/signup?error=invalid", req.url));
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.redirect(new URL("/signup?error=auth", req.url));
  }

  // If email confirmation is ON, session will be null (normal)
  if (!data.session) {
    return NextResponse.redirect(new URL("/login?checkEmail=1", req.url));
  }

  const res = NextResponse.redirect(new URL("/dashboard", req.url));

  res.cookies.set("sb-access-token", data.session.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
  res.cookies.set("sb-refresh-token", data.session.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return res;
}

// Safety net: never 405 on GET
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/signup", req.url));
}
