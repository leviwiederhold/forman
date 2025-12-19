// src/app/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  // If logged in, go to the real app
  if (data.user) {
    redirect("/dashboard");
  }

  // If not logged in, go to login
  redirect("/login");
}
