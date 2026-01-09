import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const StatusSchema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected"]),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await req.json();
  const parsed = StatusSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { status } = parsed.data;

  const { data, error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id, status")
    .single<{ id: string; status: string }>();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, status: data.status });
}
