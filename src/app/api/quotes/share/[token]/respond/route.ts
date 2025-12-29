import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const BodySchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const status = parsed.data.action === "accept" ? "accepted" : "rejected";

  // Public anon client, but we pass the share token header to satisfy RLS.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          "x-share-token": token,
        },
      },
    }
  );

  // IMPORTANT: update ONLY the row matching share_token
  const patch =
    status === "accepted"
      ? { status: "accepted", accepted_at: new Date().toISOString(), rejected_at: null }
      : { status: "rejected", rejected_at: new Date().toISOString(), accepted_at: null };

  const { data, error } = await supabase
    .from("quotes")
    .update(patch)
    .eq("share_token", token)
    .not("status", "in", '("accepted","rejected")') // one-time response
    .select("id,status,accepted_at,rejected_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to update quote status" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, quote: data });
}
