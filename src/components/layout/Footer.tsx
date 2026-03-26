"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const hidden = ["/", "/pricing", "/demo", "/privacy", "/terms"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (hidden) return null;

  return (
    <footer className="mt-auto border-t-2 border-[#dfbfbc] bg-background">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          © {new Date().getFullYear()} Forman
        </div>

        <a
          href="/feedback"
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
        >
          How can we improve?
        </a>
      </div>
    </footer>
  );
}
