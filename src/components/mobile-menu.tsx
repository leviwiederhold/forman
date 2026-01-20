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

  // Close menu on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll when menu is open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-2 text-foreground/70 hover:text-foreground transition"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />

          {/* FULL SCREEN MENU PANEL (OPAQUE) */}
          <div className="absolute inset-0 bg-background">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
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

            {/* Content */}
            <div className="px-4 py-5">
              <BillingStatusBadge />

              {/* Navigation */}
              <nav className="mt-6 space-y-2">
                {/* New Quote — styled like a nav item */}
                <NewQuoteButton
                  appearance="nav"
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-foreground/70 hover:bg-white/5 hover:text-foreground transition"
                />

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

              {/* Sign out */}
              <div className="mt-8 border-t border-white/10 pt-4">
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/80 hover:bg-white/5 transition"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
