import Link from "next/link";

const iconLinkClass =
  "flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/70 transition duration-200 hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60";

export default function TopStrip() {
  return (
    <div className="hidden h-[42px] border-b border-white/10 md:block">
      <div className="mx-auto flex h-full w-full max-w-[1540px] items-center justify-between gap-6 px-6 text-sm text-white/80">
        <Link
          href="mailto:connect@crystagrid.com"
          className="transition duration-200 hover:text-white"
        >
          connect@crystagrid.com
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="tel:+918679995253"
            className="transition duration-200 hover:text-white"
          >
            8679995253
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="https://www.instagram.com/crystagrid?dmpr=MWpuM2sxb2M4NWIwcg=="
              aria-label="Instagram"
              className={iconLinkClass}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle
                  cx="17.5"
                  cy="6.5"
                  r="1"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
