// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // Only run for protected routes (see config.matcher below)
  const res = NextResponse.next();

  // ✅ If env vars are missing in Vercel, DO NOT crash middleware.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Let the request through; your API routes still check auth server-side.
    console.error("Missing Supabase env vars in middleware");
    return res;
  }

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (err) {
    // ✅ Never crash middleware in production. Log + allow.
    console.error("Middleware error:", err);
    return res;
  }
}

export const config = {
  // ✅ ONLY protect these. Avoid running middleware on /, /login, /api, etc.
  matcher: ["/dashboard/:path*", "/quotes/:path*", "/settings/:path*"],
};
