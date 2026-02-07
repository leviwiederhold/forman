// Convenience endpoint.
// Some parts of the UI (or older links) may point to /api/stripe/connect.
// We keep this route as a thin redirect to the current onboarding handler.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";

function getOrigin(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function handler(req: NextRequest) {
  const origin = getOrigin(req);
  return NextResponse.redirect(new URL("/api/stripe/connect/onboard", origin), 303);
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}
