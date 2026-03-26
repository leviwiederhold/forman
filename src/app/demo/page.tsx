"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function DemoPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        page: "/demo",
        message: `Demo request from ${name || "unknown"}\n\n${message || "Requested a Forman demo."}`,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      warning?: string;
      error?: string;
    };
    setLoading(false);
    if (!res.ok || !body.ok) {
      setNotice(body.error ?? "Could not send demo request.");
      return;
    }
    setDone(true);
    setNotice(body.warning ?? null);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div className="border-l-8 border-primary pl-5">
        <div className="forman-kicker">Book Demo</div>
        <h1 className="forman-title text-4xl">See how Forman fits your roofing workflow.</h1>
        <p className="forman-subtitle mt-2">
          Tell us a little about your crew and we’ll follow up about a practical walkthrough.
        </p>
      </div>

      {done ? (
        <div className="paper-panel p-6">
          <div className="font-headline text-2xl font-bold uppercase tracking-[-0.04em]">Demo request received</div>
          <p className="mt-2 text-sm text-muted-foreground">
            We’ve got your request and will follow up using the details you sent.
          </p>
          {notice ? <p className="mt-2 text-sm text-muted-foreground">{notice}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to landing page</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="paper-panel p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="field-label">Your name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mike Thompson" />
            </div>
            <div>
              <div className="field-label">Email</div>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@roofingco.com" />
            </div>
            <div className="md:col-span-2">
              <div className="field-label">What do you want to see?</div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your quote process, pricing setup, or deposit workflow."
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={submit} disabled={loading || !email}>
              {loading ? "Sending..." : "Book Demo"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>
          {notice ? <p className="mt-3 text-sm text-destructive">{notice}</p> : null}
        </div>
      )}
    </main>
  );
}
