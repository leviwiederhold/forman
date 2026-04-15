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
  if (!resendKey) {
    return NextResponse.json({
      ok: true,
      emailSent: false,
      warning: "Feedback saved, but RESEND_API_KEY is not configured.",
    });
  }

  try {
    const resend = new Resend(resendKey);
    const to = process.env.FEEDBACK_TO_EMAIL ?? "info@formanusa.com";
    // Use a safe default sender that works on Resend even without a custom domain.
    const from =
      process.env.FEEDBACK_FROM_EMAIL ?? "Forman Feedback <onboarding@resend.dev>";

    const result = await resend.emails.send({
      from,
      to,
      subject: `Forman feedback (${contactEmail})`,
      text: `User: ${userEmail}\nContact: ${contactEmail}\nPage: ${page || "unknown"}\n\n${message}`,
    });

    if ((result as { error?: { message?: string } })?.error) {
      const msg = (result as { error?: { message?: string } }).error?.message ?? "Unknown email provider error";
      return NextResponse.json(
        {
          ok: true,
          emailSent: false,
          warning: `Feedback saved, but email failed: ${msg}`,
        },
        { status: 200 }
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown email send error";
    return NextResponse.json(
      {
        ok: true,
        emailSent: false,
        warning: `Feedback saved, but email failed: ${msg}`,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, emailSent: true });
}
