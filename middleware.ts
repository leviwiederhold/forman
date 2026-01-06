// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseAuthCookie(req: NextRequest) {
  // Supabase cookies commonly look like:
  // - sb-<project-ref>-auth-token
  // - sb-access-token / sb-refresh-token (older setups)
  const cookies = req.cookies.getAll();

  return cookies.some((c) => {
    const name = c.name;
    return (
      (name.startsWith("sb-") && name.endsWith("-auth-token")) ||
      name === "sb-access-token" ||
      name === "sb-refresh-token"
    );
  });
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/quotes/share/") ||
    pathname.startsWith("/feedback") ||
    pathname.startsWith("/api/feedback");

  if (isPublic) return NextResponse.next();

  // ✅ No Supabase client calls here (avoids getSession/getUser type mismatches)
  if (!hasSupabaseAuthCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
