"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function FeedbackPage() {
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        email: email || null,
        page: typeof window !== "undefined" ? window.location.pathname : null,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      emailSent?: boolean;
      warning?: string;
      error?: string;
    };
    setLoading(false);
    if (!res.ok || !body.ok) {
      setNotice(body.error ?? "Could not submit feedback. Please try again.");
      return;
    }
    setDone(true);
    setNotice(body.warning ?? null);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <div className="rounded-2xl border bg-card p-6">
          Thanks — feedback received 🙌
          {notice ? <div className="mt-2 text-sm text-amber-300">{notice}</div> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-lg">Feedback</h1>
      <Textarea
        placeholder="What’s confusing or could be better?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Input
        placeholder="Email (optional)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button onClick={submit} disabled={loading || !message}>
        {loading ? "Sending…" : "Submit"}
      </Button>
      {notice ? <div className="text-sm text-amber-300">{notice}</div> : null}
    </main>
  );
}
