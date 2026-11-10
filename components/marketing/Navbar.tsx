import Link from "next/link";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#05060a]/60 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-white sm:text-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
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

        <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/70 transition hover:text-white sm:px-3"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 sm:px-3.5"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}
