"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeRedirectTo(input: unknown) {
  const v = typeof input === "string" ? input : "";
  if (!v) return "/dashboard";
  if (!v.startsWith("/")) return "/dashboard";
  if (v.startsWith("/api/")) return "/dashboard";
  return v;
}

export async function loginAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const redirectTo = safeRedirectTo(formData.get("redirectTo"));

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/login?error=auth&message=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(
        redirectTo
      )}`
    );
  }

  redirect(redirectTo);
}
