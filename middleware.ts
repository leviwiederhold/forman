// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseAuthCookie(req: NextRequest) {
  const cookies = req.cookies.getAll();

  // Common Supabase cookie patterns
  return cookies.some((c) => {
    const name = c.name;
    return (
      (name.startsWith("sb-") && name.endsWith("-auth-token")) ||
      name === "sb-access-token" ||
      name === "sb-refresh-token"
    );
  });
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/quotes/share/") ||
    pathname.startsWith("/feedback") ||
    pathname.startsWith("/api/feedback") ||
    pathname.startsWith("/api/quotes/share/");

  if (isPublic) return NextResponse.next();

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
