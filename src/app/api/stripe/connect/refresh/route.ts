export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Send them back to the billing/payments page with a message
  const url = new URL(req.url);
  url.pathname = "/settings/billing";
  url.search = "connect=retry";
  return NextResponse.redirect(url, 303);
}