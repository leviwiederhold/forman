"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { NewQuoteButton } from "@/components/new-quote-button";
import { BillingStatusBadge } from "@/components/billing-status-badge";

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

export function MobileMenu() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    // close menu on route change
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-2 text-foreground/70 hover:text-foreground transition"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm border-l border-white/10 bg-background p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium tracking-wide">Forman</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-foreground/70 hover:text-foreground transition"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4">
              <BillingStatusBadge />
            </div>

            <div className="mt-5">
              <NewQuoteButton
                appearance="cta"
                variant="default"
                size="default"
                className="w-full"
              />
            </div>

            <nav className="mt-6 space-y-2">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "block rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-white/5 text-foreground"
                        : "text-foreground/70 hover:bg-white/5 hover:text-foreground",
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
                  className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/80 hover:bg-white/5 transition"
                >
                  Sign out
                </button>
              </form>
            </div>

            <div className="mt-3 text-xs text-foreground/50">
              Tip: Add this to your home screen for quick access.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
