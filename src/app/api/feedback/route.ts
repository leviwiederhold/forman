import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { message?: string; page?: string };
  const message = (body.message ?? "").trim();
  const page = (body.page ?? "").trim();

  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userEmail = auth.user?.email ?? "unknown";

  // Save to DB (optional but recommended)
  await supabase.from("feedback").insert({
    message,
    page: page || null,
    user_email: userEmail,
  });

  // Email
  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.FEEDBACK_TO_EMAIL ?? "levi.wiederhold@gmail.com";
  const from = process.env.FEEDBACK_FROM_EMAIL ?? "feedback@forman-u4mc.vercel.app";

  await resend.emails.send({
    from,
    to,
    subject: `Forman feedback (${userEmail})`,
    text: `User: ${userEmail}\nPage: ${page || "unknown"}\n\n${message}`,
  });

  return NextResponse.json({ ok: true });
}
