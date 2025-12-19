import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/signup?error=invalid", req.url));
  }

const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp(parsed.data);

if (error) {
  return NextResponse.redirect(
    new URL(`/signup?error=${encodeURIComponent(error.message)}`, req.url)
  );
}

  // Profiles table will be created in Step 3. We intentionally don't insert yet.

  // If email confirmations are ON, user may need to confirm before session exists.
  if (!data.session) {
    return NextResponse.redirect(new URL("/login?message=check-email", req.url));
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
