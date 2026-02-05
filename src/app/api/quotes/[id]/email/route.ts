import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  email: z.string().email(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const { data: quote } = await supabase
    .from("quotes")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  return NextResponse.json(
    { ok: true, message: "Email sending not implemented yet.", to: parsed.data.email },
    { status: 200 }
  );
}
