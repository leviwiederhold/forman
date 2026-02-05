// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/quotes/share/") ||
    pathname.startsWith("/feedback")
  );
}

function safeRedirectTarget(pathname: string) {
  if (!pathname || pathname.startsWith("/api/")) return "/dashboard";
  if (!pathname.startsWith("/")) return "/dashboard";
  return pathname;
}

function isEmailVerificationBypassPath(pathname: string) {
  return (
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/quotes/share/")
  );
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ✅ Explicit API bypasses (Stripe + public flows)
  if (
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/quotes/share/") ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // Always allow public routes
  if (isPublicPath(pathname)) return NextResponse.next();

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  // Not logged in → login
  if (!data.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", safeRedirectTarget(pathname));
    return NextResponse.redirect(url);
  }

  // Email verification enforcement
  const emailConfirmed = Boolean(data.user.email_confirmed_at);

  if (!emailConfirmed && !isEmailVerificationBypassPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/verify-email";
    url.searchParams.set("redirectTo", safeRedirectTarget(pathname));
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
