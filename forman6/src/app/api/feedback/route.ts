import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    message?: string;
    page?: string | null;
    email?: string | null;
  };
  const message = (body.message ?? "").trim();
  const page = (body.page ?? "").trim();
  const providedEmail = (body.email ?? "").trim();

  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userEmail = auth.user?.email ?? "unknown";
  const contactEmail = providedEmail || userEmail;

  // Save to DB (optional but recommended)
  await supabase.from("feedback").insert({
    message,
    page: page || null,
    user_email: contactEmail,
  });

  // Email
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const to = process.env.FEEDBACK_TO_EMAIL ?? "levi.wiederhold@gmail.com";
    // Use a safe default sender that works on Resend even without a custom domain.
    const from =
      process.env.FEEDBACK_FROM_EMAIL ?? "Forman Feedback <onboarding@resend.dev>";

    await resend.emails.send({
      from,
      to,
      subject: `Forman feedback (${contactEmail})`,
      text: `User: ${userEmail}\nContact: ${contactEmail}\nPage: ${page || "unknown"}\n\n${message}`,
    });
  }

  return NextResponse.json({ ok: true });
}
