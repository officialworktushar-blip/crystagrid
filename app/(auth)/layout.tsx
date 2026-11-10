import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-12 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-20%] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-blue/20 blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-12%] h-[360px] w-[360px] rounded-full bg-brand-sky/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-2xl font-bold tracking-tight text-white"
          >
            <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl shadow-brand">
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
        </div>

        <div className="rounded-3xl border border-white/10 bg-surface p-8 shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
}
