import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const formData = await req.formData();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(new URL("/signup?error=invalid", req.url));
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    const url = new URL("/signup", req.url);
    url.searchParams.set("error", "auth");
    url.searchParams.set("message", error.message);
    return NextResponse.redirect(url);
  }

  // Supabase v2 sets cookies automatically
  return NextResponse.redirect(new URL("/dashboard", req.url));
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/signup", req.url));
}
