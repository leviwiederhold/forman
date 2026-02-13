"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

import { NewQuoteButton } from "@/components/new-quote-button";
import { BillingStatusBadge } from "@/components/billing-status-badge";

// Order: most-used → least-used. Dashboard is accessed via the logo.
const NAV = [
  { href: "/settings/roofing", label: "Pricing" },
  { href: "/reports", label: "Insights" },
  { href: "/quotes", label: "Quotes" },
  { href: "/settings/billing", label: "Get Paid" },
  { href: "/billing", label: "Subscribe" },
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
    const prevOverscroll = (document.body.style as any).overscrollBehavior;
    document.body.style.overflow = "hidden";
    (document.body.style as any).overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      (document.body.style as any).overscrollBehavior = prevOverscroll;
    };
  }, [open]);

  function Overlay() {
    return (
      <div
        className="fixed inset-0 z-[2147483647] bg-background/96 backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <Link
            href="/dashboard"
            className="text-[1.05rem] font-semibold tracking-[0.16em] uppercase transition hover:opacity-90"
            onClick={() => setOpen(false)}
          >
            Forman
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-foreground/70 transition hover:bg-white/8 hover:text-foreground"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-6">
          <BillingStatusBadge />

          <nav className="mt-6 space-y-2">
            {/* New Quote styled like the other items */}
            <NewQuoteButton
              appearance="nav"
              className={[
                "block w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                newQuoteActive
                  ? "border border-primary/35 bg-primary/15 text-foreground"
                  : "text-foreground/70 hover:bg-white/8 hover:text-foreground",
              ].join(" ")}
            />

            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                    active
                      ? "border border-primary/35 bg-primary/15 text-foreground"
                      : "text-foreground/70 hover:bg-white/8 hover:text-foreground",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-white/10 pt-4">
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="w-full rounded-xl border border-white/15 bg-background/40 px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-white/8"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-foreground/70 transition hover:bg-white/8 hover:text-foreground"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* ✅ Portal to body avoids stacking-context bleed-through */}
      {mounted && open ? createPortal(<Overlay />, document.body) : null}
    </>
  );
}
