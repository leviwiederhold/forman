"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BillingStatusBadge } from "@/components/billing-status-badge";
import { NewQuoteButton } from "@/components/new-quote-button";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quotes", label: "Quotes" },
  { href: "/settings/roofing", label: "Settings" },
  { href: "/billing", label: "Billing" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background/50 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        {/* Left */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium">
            Forman
          </Link>

          <nav className="flex items-center gap-5">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "text-sm transition",
                    active
                      ? "text-foreground"
                      : "text-foreground/70 hover:text-foreground",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* ✅ Looks like the other nav links */}
            <NewQuoteButton appearance="nav" />
          </nav>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <BillingStatusBadge />

          {/* ✅ POST sign out */}
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="text-sm text-foreground/70 hover:text-foreground transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
