import Link from "next/link";

export default function AnnouncementBar() {
  return (
    <div className="brand-gradient h-14 w-full px-4 text-white">
      <div className="flex h-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center">
        <p className="text-xs font-semibold text-balance sm:text-sm md:text-base">
          Now live: pair any screen with a 6-digit code
        </p>
        <Link
          href="/register"
          className="whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#0b2a6f] transition duration-200 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-blue sm:text-sm"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
