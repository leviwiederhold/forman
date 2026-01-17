"use client";

import * as React from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function resend() {
    setBusy(true);
    setMsg(null);

    // This assumes you already use @supabase/ssr and have env vars set
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: userRes } = await supabase.auth.getUser();
    const email = userRes.user?.email;

    if (!email) {
      setBusy(false);
      setMsg("No user email found. Please log in again.");
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Verification email sent. Check your inbox/spam.");
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-lg font-medium">Verify your email</h1>
      <p className="text-sm text-foreground/70">
        Please verify your email before using Forman. Check your inbox (and spam).
      </p>

      <Button onClick={resend} disabled={busy}>
        {busy ? "Sending..." : "Resend verification email"}
      </Button>

      {msg ? <div className="text-sm text-foreground/70">{msg}</div> : null}
    </main>
  );
}
