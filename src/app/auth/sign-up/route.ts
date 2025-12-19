import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const formData = await req.formData();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(new URL("/signup?error=invalid", req.url));
  }

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.redirect(new URL("/signup?error=auth", req.url));
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}

// Safety net: never 405 on GET
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/signup", req.url));
}
