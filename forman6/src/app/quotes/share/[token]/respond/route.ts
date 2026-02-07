// src/app/api/quotes/share/[token]/respond/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Params = Promise<{ token: string }>;

type Body = {
  action: "accept" | "reject";
};

function isBody(v: unknown): v is Body {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return r.action === "accept" || r.action === "reject";
}

export async function POST(req: Request, { params }: { params: Params }) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const bodyUnknown: unknown = await req.json().catch(() => null);
  if (!isBody(bodyUnknown)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          // ✅ critical: lets RLS authorize based on share token
          "x-share-token": token,
        },
      },
    }
  );

  const now = new Date().toISOString();

  const patch =
    bodyUnknown.action === "accept"
      ? { status: "accepted", accepted_at: now, rejected_at: null }
      : { status: "rejected", rejected_at: now, accepted_at: null };

  const { data, error } = await supabase
    .from("quotes")
    .update(patch)
    .eq("share_token", token)
    .select("status, accepted_at, rejected_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, quote: data });
}
