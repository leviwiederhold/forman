"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NewQuoteButton } from "@/components/new-quote-button";
import { BillingStatusBadge } from "@/components/billing-status-badge";
import { MobileMenu } from "@/components/mobile-menu";

// Order: most-used → least-used. Dashboard is accessed via the logo.
const NAV = [
  { href: "/settings/roofing", label: "Pricing" },
  { href: "/reports", label: "Insights" },
  { href: "/quotes", label: "Quotes" },
  { href: "/settings/billing", label: "Get Paid" },
  { href: "/billing", label: "Subscribe" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
        active
          ? "border border-primary/35 bg-primary/15 text-foreground"
          : "text-foreground/70 hover:bg-white/8 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/65 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
        {/* LEFT */}
        <Link
          href="/dashboard"
          className="flex-shrink-0 text-[1.05rem] font-semibold tracking-[0.16em] uppercase transition hover:opacity-90"
        >
          Forman
        </Link>

        {/* CENTER (desktop) */}
        <nav className="mx-auto hidden items-center gap-2 md:flex">
          <NewQuoteButton appearance="nav" />
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>

        {/* RIGHT (desktop) */}
        <div className="hidden items-center gap-4 md:flex">
          <BillingStatusBadge />
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="rounded-xl px-3 py-1.5 text-sm text-foreground/70 transition hover:bg-white/8 hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* MOBILE */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <BillingStatusBadge />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
