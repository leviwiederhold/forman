import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ code?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { code } = await searchParams;

  if (!code) {
    redirect("/login?error=missing_code");
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect("/login?error=verification_failed");
  }

  // ✅ Email verified + session created
  redirect("/dashboard");
}