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
    return NextResponse.redirect(new URL("/login?error=invalid", req.url));
  }

const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
  );
}

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
