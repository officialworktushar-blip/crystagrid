import Link from "next/link";

export default function AnnouncementBar() {
  return (
    <div className="brand-gradient relative z-[60] px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        <p className="text-balance">
          Now live: pair any screen with a 6-digit code
        </p>
        <Link
          href="/register"
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-blue transition duration-200 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-blue"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
