"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type FollowUpTemplatesProps = {
  customerName?: string | null;
  total: number;
  expiresAt?: string | null;
  depositEnabled: boolean;
  depositPercent: number;
};

type Template = {
  id: string;
  label: string;
  body: string;
};

function money(n: number) {
  const value = Number.isFinite(n) ? n : 0;
  return `$${value.toFixed(2)}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function buildTemplates({
  customerName,
  total,
  expiresAt,
  depositEnabled,
  depositPercent,
}: FollowUpTemplatesProps): Template[] {
  const name = customerName && customerName.trim().length > 0 ? customerName.trim() : "there";
  const totalText = money(total);
  const expiresLabel = formatDate(expiresAt);
  const expirationLine = expiresLabel ? `The current quote is valid through ${expiresLabel}.` : "";
  const depositLine = depositEnabled
    ? `If helpful, you can reserve your spot with a ${depositPercent.toFixed(0)}% deposit in the quote link.`
    : "";

  return [
    {
      id: "sms-check-in",
      label: "SMS check-in",
      body: [
        `Hi ${name} — checking in on your quote for ${totalText}.`,
        expirationLine,
        depositLine,
        "Happy to answer any questions or adjust scope if needed.",
      ]
        .filter(Boolean)
        .join(" "),
    },
    {
      id: "email-professional-followup",
      label: "Email follow-up",
      body: [
        `Hi ${name},`,
        "",
        `I wanted to follow up on your quote (${totalText}).`,
        expirationLine,
        depositLine,
        "If you want to review options, I can walk through the scope and timeline with you.",
        "",
        "Thanks,",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      id: "final-reminder",
      label: "Final reminder",
      body: [
        `Hi ${name}, quick reminder on your quote for ${totalText}.`,
        expiresLabel
          ? `It is currently set to expire on ${expiresLabel}.`
          : "Let me know if you want me to hold this pricing window a little longer.",
        depositLine,
        "If you want to proceed, I can confirm next scheduling steps today.",
      ]
        .filter(Boolean)
        .join(" "),
    },
  ];
}

export function FollowUpTemplates(props: FollowUpTemplatesProps) {
  const [open, setOpen] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const templates = React.useMemo(() => buildTemplates(props), [props]);

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 1200);
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Follow-up messages</div>
          <div className="text-xs text-foreground/60">Ready-to-send templates for SMS or email.</div>
        </div>
        <Button variant="outline" type="button" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide templates" : "Generate follow-up"}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-foreground/70">{template.label}</div>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => copy(template.body, template.id)}
                >
                  {copiedId === template.id ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground/85 font-sans">
                {template.body}
              </pre>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

