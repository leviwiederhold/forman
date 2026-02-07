import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SettingsRow = {
  deposit_percent: number | null;
  accept_deposits_on_share: boolean | null;
};

function normalizePercent(v: unknown, fallback = 25) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

function normalizeBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json(
      { depositPercent: null, acceptDepositsOnShare: null },
      { status: 401 }
    );
  }

  const { data } = await supabase
    .from("profiles")
    .select("deposit_percent, accept_deposits_on_share")
    .eq("id", auth.user.id)
    .maybeSingle<SettingsRow>();

  return NextResponse.json({
    depositPercent: data?.deposit_percent ?? null,
    acceptDepositsOnShare: data?.accept_deposits_on_share ?? null,
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const depositPercent = normalizePercent(body.depositPercent, 25);
    const acceptDepositsOnShare = normalizeBool(body.acceptDepositsOnShare, false);

    const payload = {
      id: auth.user.id,
      deposit_percent: depositPercent,
      accept_deposits_on_share: acceptDepositsOnShare,
    };

    const primary = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (!primary.error) {
      return NextResponse.json({ ok: true, depositPercent, acceptDepositsOnShare });
    }

    // Fallback: only if service role exists
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("profiles").upsert(payload, { onConflict: "id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, depositPercent, acceptDepositsOnShare });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
