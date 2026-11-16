import Link from "next/link";
import Image from "next/image";

const pageLinks = [
  { href: "/", label: "Home" },
  { href: "#about", label: "About Us" },
  { href: "#pricing", label: "Pricing" },
];

const companyLinks = [
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-background">
      <div className="mx-auto w-full max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-white"
            >
              <Image
                src="/logo.webp"
                alt=""
                width={256}
                height={256}
                className="h-40 w-auto max-w-72 shrink-0 object-contain"
              />
            </Link>
            <p className="mt-4 text-sm leading-6 text-body">
              Your digital screen network partner.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Pages</h2>
            <nav aria-label="Pages" className="mt-4 flex flex-col gap-3">
              {pageLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-body transition duration-200 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Company</h2>
            <nav aria-label="Company" className="mt-4 flex flex-col gap-3">
              {companyLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-body transition duration-200 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Contact</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-body">
              <Link
                href="/contact"
                className="font-medium text-white transition duration-200 hover:text-brand-sky"
              >
                Contact us
              </Link>
              <a
                href="mailto:hello@crystagrid.com"
                className="transition duration-200 hover:text-white"
              >
                hello@crystagrid.com
              </a>
              <a
                href="tel:+919876543210"
                className="transition duration-200 hover:text-white"
              >
                +91 98765 43210
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Crystagrid. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="transition duration-200 hover:text-white"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition duration-200 hover:text-white"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
