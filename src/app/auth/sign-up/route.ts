import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/signup";
  url.search = "";
  return NextResponse.redirect(url, 307);
}

export function POST(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/signup";
  url.search = "";
  return NextResponse.redirect(url, 307);
}