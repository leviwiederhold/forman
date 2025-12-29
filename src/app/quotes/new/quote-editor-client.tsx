"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function safeStringify(v: unknown) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function QuoteEditorClient({
  editId,
  initialPayload,
}: {
  editId: string | null;
  initialPayload: unknown;
}) {
  const router = useRouter();

  const initialText = useMemo(
    () => safeStringify(initialPayload),
    [initialPayload]
  );
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);

  async function save() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      alert("Invalid JSON. Fix it and try again.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(editId ? `/api/quotes/${editId}` : "/api/quotes", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.error ?? "Save failed");
        return;
      }

      const newId = json?.quote?.id ?? json?.id ?? editId;

      if (newId) {
        router.push(`/quotes/${newId}`);
        router.refresh();
      } else {
        alert("Saved, but missing quote id.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <div>
        <div className="text-sm text-foreground/70">
          Quote payload (Roofing)
        </div>
        <div className="text-xs text-foreground/60">
          This is the exact JSON payload used to calculate pricing.
        </div>
      </div>

      <textarea
        className="min-h-[420px] w-full rounded-lg border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-white/10"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving..." : editId ? "Save Changes" : "Create Quote"}
        </Button>
      </div>
    </div>
  );
}
