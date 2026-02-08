import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = "/api/stripe/connect/onboard";
  url.search = "";
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = "/api/stripe/connect/onboard";
  url.search = "";
  return NextResponse.redirect(url, 303);
}