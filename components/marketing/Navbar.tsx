"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const syncHash = () => {
      setHash(window.location.hash);
      setMobileOpen(false);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" && hash === "";
    }

    return pathname === "/" && hash === href;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-base font-semibold tracking-tight text-white sm:text-lg"
        >
          <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-xl shadow-brand">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4 text-white"
            >
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
            </svg>
          </span>
          Crystagrid
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 text-sm md:flex"
        >
          {links.map((link) => {
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "transition duration-200 hover:text-white",
                  active ? "font-semibold text-brand-sky" : "text-body",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="secondary" size="sm">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild size="sm" withArrow>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>

        <button
          type="button"
          aria-controls="mobile-navigation"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 md:hidden"
        >
          {mobileOpen ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </Container>

      {mobileOpen ? (
        <div
          id="mobile-navigation"
          className="absolute inset-x-0 top-full border-b border-white/10 bg-background/95 backdrop-blur-xl md:hidden"
        >
          <Container className="flex flex-col gap-1 py-4">
            {links.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200",
                    active
                      ? "bg-white/5 text-brand-sky"
                      : "text-body hover:bg-white/5 hover:text-white",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-4">
              <Button asChild variant="secondary" className="w-full">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild withArrow className="w-full">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
