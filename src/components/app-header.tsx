"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quotes", label: "Quotes" },
  { href: "/quotes/new", label: "New Quote" },
  { href: "/settings/roofing", label: "Settings" },
];


function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppHeader() {
  const pathname = usePathname();

  const hide =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth");

  if (hide) return null;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium tracking-wide">
            Forman
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "rounded-lg px-3 py-1.5 text-sm transition",
                    active
                      ? "bg-white/10 text-foreground"
                      : "text-foreground/70 hover:text-foreground hover:bg-white/5",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <form action="/auth/sign-out" method="post">
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      {/* mobile */}
      <div className="md:hidden border-t">
        <div className="mx-auto flex max-w-6xl gap-1 px-2 py-2">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex-1 rounded-lg px-3 py-2 text-center text-xs transition",
                  active
                    ? "bg-white/10 text-foreground"
                    : "text-foreground/70 hover:text-foreground hover:bg-white/5",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
