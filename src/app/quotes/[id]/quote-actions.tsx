"use client";

import { Button } from "@/components/ui/button";

export default function QuoteActions({ quoteId }: { quoteId: string }) {
  async function copyLink() {
    const url = `${window.location.origin}/quotes/${quoteId}/share`;
    await navigator.clipboard.writeText(url);
    alert("Share link copied");
  }

  async function emailQuote() {
    const email = prompt("Enter customer email:");
    if (!email) return;

    const res = await fetch(`/api/quotes/${quoteId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      alert("Failed to send email");
      return;
    }

    alert("Email sent");
  }

  function downloadPDF() {
    window.open(`/api/quotes/${quoteId}/pdf`, "_blank");
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={downloadPDF}>
        Download PDF
      </Button>
      <Button variant="outline" onClick={copyLink}>
        Copy Link
      </Button>
      <Button onClick={emailQuote}>Email</Button>
    </div>
  );
}
