"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, CreditCard, LayoutDashboard, LineChart, LogOut, MenuSquare, Wrench } from "lucide-react";

import { NewQuoteButton } from "@/components/new-quote-button";
import { BillingStatusBadge } from "@/components/billing-status-badge";
import { MobileMenu } from "@/components/mobile-menu";

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

function NavLink({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className={[
        "mx-2 flex items-center gap-3 border-l-4 px-4 py-3 nav-label transition-colors",
        active
          ? "border-l-white bg-primary text-white"
          : "border-l-transparent text-white/65 hover:bg-sidebar-accent hover:text-white",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const hidden =
    ["/", "/pricing", "/demo", "/privacy", "/terms", "/login", "/signup", "/verify-email"].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    ) || pathname.startsWith("/quotes/share/");
  if (hidden) return null;
  const newQuoteActive = pathname === "/quotes/new" || pathname.startsWith("/quotes/new/");

  return (
    <>
      <aside data-app-shell="true" data-app-sidebar className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r-2 border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-sidebar-border bg-primary font-headline text-xl font-black text-white">
              F
            </div>
            <div>
              <div className="font-headline text-2xl font-black uppercase tracking-[-0.08em] text-white">
                Forman
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                Roofing Utility
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-5">
          <NewQuoteButton
            appearance="nav"
            className={newQuoteActive ? "mx-2 border-l-4 border-l-white bg-primary text-white" : "mx-2 border-l-4 border-l-transparent text-white/65 hover:bg-sidebar-accent hover:text-white"}
          />
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <BillingStatusBadge />
          <form action="/auth/sign-out" method="post" className="mt-4">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 border-2 border-sidebar-border bg-sidebar-accent px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#474746]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <header data-app-topbar className="fixed inset-x-0 top-0 z-40 border-b-2 border-[#dfbfbc] bg-background lg:left-64">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <div className="forman-kicker">Forman work board</div>
            <div className="font-headline text-lg font-bold uppercase tracking-[-0.04em] text-foreground">
              {newQuoteActive ? "New Quote Builder" : NAV.find((item) => isActive(pathname, item.href))?.label ?? "Workspace"}
            </div>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <BillingStatusBadge />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <BillingStatusBadge />
            <MobileMenu />
          </div>
        </div>
      </header>
    </>
  );
}
