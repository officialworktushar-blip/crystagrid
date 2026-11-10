import Link from "next/link";

const footerLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Get Started" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#05060a]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-base font-semibold tracking-tight text-white"
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
            <p className="mt-3 text-sm leading-6 text-white/50">
              Digital signage cloud for teams that need every screen in sync.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/50">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/5 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Crystagrid. All rights reserved.</p>
          <p>Built for screens everywhere.</p>
        </div>
      </div>
    </footer>
  );
}
