"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { ClipboardList, CreditCard, LayoutDashboard, LineChart, Menu, MenuSquare, Wrench, X } from "lucide-react";

import { NewQuoteButton } from "@/components/new-quote-button";
import { BillingStatusBadge } from "@/components/billing-status-badge";

// Order: most-used → least-used. Dashboard is accessed via the logo.
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quotes", label: "Quotes", icon: ClipboardList },
  { href: "/settings/roofing", label: "Pricing", icon: Wrench },
  { href: "/reports", label: "Reports", icon: LineChart },
  { href: "/settings/billing", label: "Get Paid", icon: CreditCard },
  { href: "/billing", label: "Subscribe", icon: MenuSquare },
];

function isActive(pathname: string, href: string) {
  if (href === "/quotes" && (pathname === "/quotes/new" || pathname.startsWith("/quotes/new/"))) {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileMenu() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();
  const newQuoteActive = pathname === "/quotes/new" || pathname.startsWith("/quotes/new/");

  React.useEffect(() => setMounted(true), []);

  // close on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // lock scroll
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [open]);
  const overlay = (
    <div
      className="fixed inset-0 z-[2147483647] bg-background"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-16 items-center justify-between border-b-2 border-[#dfbfbc] px-4">
        <Link
          href="/dashboard"
          className="font-headline text-xl font-black uppercase tracking-[-0.08em]"
          onClick={() => setOpen(false)}
        >
          Forman
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border-2 border-border p-2 text-foreground transition hover:bg-muted"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-4 py-6">
        <BillingStatusBadge />

        <nav className="mt-6 space-y-2">
          <NewQuoteButton
            appearance="nav"
            className={[
              "block w-full border-l-4 px-3 py-3 text-left nav-label transition",
              newQuoteActive
                ? "border-l-white bg-primary text-white"
                : "border-l-transparent text-foreground hover:bg-muted",
            ].join(" ")}
          />

          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 border-l-4 px-3 py-3 nav-label transition-colors",
                  active
                    ? "border-l-primary bg-muted text-foreground"
                    : "border-l-transparent text-foreground/75 hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t-2 border-[#dfbfbc] pt-4">
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="w-full border-2 border-border bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition hover:bg-muted"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-2 border-border bg-white p-2 text-foreground transition hover:bg-muted"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* ✅ Portal to body avoids stacking-context bleed-through */}
      {mounted && open ? createPortal(overlay, document.body) : null}
    </>
  );
}
