// src/app/api/quotes/[id]/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = (await req.json()) as { email: string };

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/quotes/${id}/share`;

  // Replace later with Resend / Postmark / SES
  console.log(`Email quote link to ${email}: ${link}`);

  return NextResponse.json({ success: true });
}
