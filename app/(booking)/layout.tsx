import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";

export default async function BookingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSessionProfile();

  return (
    <div className="booking-theme flex min-h-screen flex-col bg-[#f8fafc] text-[#0f172a] [color-scheme:light]">
      <header className="sticky top-0 z-40 border-b border-[#e5e7eb] bg-[#f8fafc]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/logo.webp"
              alt="Crystagrid"
              width={256}
              height={256}
              priority
              className="h-12 w-auto origin-left scale-[1.15] object-contain"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-sm font-semibold text-[#64748b] transition hover:text-[#0f172a] sm:inline-flex"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to home
            </Link>

            {session ? (
              <Link
                href="/dashboard/plans"
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#1d6fff] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(29,111,255,0.9)] transition hover:bg-[#155ee7]"
              >
                My Plans
              </Link>
            ) : (
              <Link
                href="/login?next=%2Fbook"
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#dbe3ef] bg-white px-4 text-sm font-semibold text-[#0f172a] transition hover:border-[#1d6fff]/40 hover:text-[#1d6fff]"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:py-12">
        {children}
      </main>
    </div>
  );
}
