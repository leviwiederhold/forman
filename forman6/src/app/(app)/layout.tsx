import QuoteStatusToastListener from "@/components/quote-status-toast-listener";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <>
      <QuoteStatusToastListener userId={data.user.id} />
      {children}
    </>
  );
}
