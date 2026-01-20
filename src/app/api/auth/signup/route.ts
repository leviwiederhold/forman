import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getOrigin(req: Request) {
  // Vercel sets x-forwarded-proto + host
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;

  // fallback
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://forman-u4mc.vercel.app";
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  const email = (body.email ?? "").trim();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const origin = getOrigin(req);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // ✅ force correct redirect target
      emailRedirectTo: `${origin}/verify-email`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
