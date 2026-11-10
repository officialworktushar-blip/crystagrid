"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const solutions = [
  { href: "#digital-signage", label: "Digital Signage" },
  { href: "#menu-boards", label: "Menu Boards" },
  { href: "#corporate-displays", label: "Corporate Displays" },
];

function SolutionsMenu() {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-haspopup="true"
        className="flex items-center gap-1.5 text-lg font-medium text-white transition duration-200 hover:text-sky-400 focus-visible:text-sky-400 focus-visible:outline-none"
      >
        Solutions
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-4 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-56 rounded-2xl border border-white/10 bg-[#020617]/95 p-2 shadow-card backdrop-blur-lg">
          {solutions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition duration-200 hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" && hash === "";
    }

    return pathname === "/" && hash === href;
  };

  const linkClass = (active: boolean) =>
    cn(
      "whitespace-nowrap text-lg font-medium transition duration-200",
      active ? "text-sky-400" : "text-white hover:text-sky-400",
    );

  const mobileLinkClass = (active: boolean) =>
    cn(
      "rounded-xl px-3 py-2.5 text-lg font-medium transition duration-200",
      active
        ? "bg-white/5 text-sky-400"
        : "text-white/80 hover:bg-white/5 hover:text-white",
    );

  return (
    <div
      className={cn(
        "w-full transition-colors duration-300",
        scrolled
          ? "fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-lg"
          : "relative z-10 bg-transparent",
      )}
    >
      <div className="mx-auto flex h-20 w-full max-w-[1540px] items-center justify-between gap-4 px-6 lg:gap-0 xl:gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 whitespace-nowrap text-3xl font-bold tracking-tight text-white"
        >
          <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-brand">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5 text-white"
            >
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
            </svg>
          </span>
          Crystagrid
        </Link>

        <div className="hidden flex-1 flex-col items-center gap-1.5 lg:flex">
          <span className="whitespace-nowrap rounded-full border border-sky-400/40 bg-sky-400/10 px-5 py-1.5 text-sm font-semibold tracking-[0.2em] text-sky-400">
            One Dashboard. Every Screen.
          </span>

          <nav
            aria-label="Main navigation"
            className="flex items-center gap-10"
          >
            <Link
              href="/"
              aria-current={isActive("/") ? "page" : undefined}
              className={linkClass(isActive("/"))}
            >
              Home
            </Link>

            <Link
              href="#features"
              aria-current={isActive("#features") ? "page" : undefined}
              className={linkClass(isActive("#features"))}
            >
              Features
            </Link>

            <Link
              href="#how-it-works"
              aria-current={isActive("#how-it-works") ? "page" : undefined}
              className={linkClass(isActive("#how-it-works"))}
            >
              How it works
            </Link>

            <SolutionsMenu />

            <Link
              href="#pricing"
              aria-current={isActive("#pricing") ? "page" : undefined}
              className={linkClass(isActive("#pricing"))}
            >
              Pricing
            </Link>
          </nav>
        </div>

        <div className="hidden shrink-0 lg:block">
          <Button asChild withArrow className="h-[52px] px-8 text-lg">
            <Link href="mailto:hello@crystagrid.com">Contact Us</Link>
          </Button>
        </div>

        <button
          type="button"
          aria-controls="mobile-navigation"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:hidden"
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
      </div>

      {mobileOpen ? (
        <div
          id="mobile-navigation"
          className="absolute inset-x-0 top-full max-h-[calc(100svh_-_80px)] overflow-y-auto border-b border-white/10 bg-background/95 backdrop-blur-lg lg:hidden"
        >
          <div className="mx-auto w-full max-w-[1540px] px-6 py-4">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
              <Link
                href="/"
                aria-current={isActive("/") ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                className={mobileLinkClass(isActive("/"))}
              >
                Home
              </Link>

              <Link
                href="#features"
                aria-current={isActive("#features") ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                className={mobileLinkClass(isActive("#features"))}
              >
                Features
              </Link>

              <Link
                href="#how-it-works"
                aria-current={
                  isActive("#how-it-works") ? "page" : undefined
                }
                onClick={() => setMobileOpen(false)}
                className={mobileLinkClass(isActive("#how-it-works"))}
              >
                How it works
              </Link>

              <Link
                href="#solutions"
                onClick={() => setMobileOpen(false)}
                className={mobileLinkClass(false)}
              >
                Solutions
              </Link>

              <div className="mb-1 ml-3 flex flex-col gap-1 border-l border-white/10 pl-3">
                {solutions.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-3 py-2 text-base font-medium text-white/60 transition duration-200 hover:bg-white/5 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <Link
                href="#pricing"
                aria-current={isActive("#pricing") ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                className={mobileLinkClass(isActive("#pricing"))}
              >
                Pricing
              </Link>
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4">
              <Button
                asChild
                withArrow
                className="h-[52px] w-full px-8 text-lg"
              >
                <Link href="mailto:hello@crystagrid.com">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
