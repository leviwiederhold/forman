import { NextResponse } from "next/server";
import { getEntitlements } from "@/lib/billing/entitlements.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ent = await getEntitlements();
  return NextResponse.json({ ent });
}
