import Link from "next/link";

const iconLinkClass =
  "flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/70 transition duration-200 hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60";

export default function TopStrip() {
  return (
    <div className="hidden h-[42px] border-b border-white/10 md:block">
      <div className="mx-auto flex h-full w-full max-w-[1540px] items-center justify-between gap-6 px-6 text-sm text-white/80">
        <Link
          href="mailto:hello@crystagrid.com"
          className="transition duration-200 hover:text-white"
        >
          hello@crystagrid.com
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="tel:+910000000000"
            className="transition duration-200 hover:text-white"
          >
            +91 00000 00000
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="#"
              aria-label="LinkedIn"
              className={iconLinkClass}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.84 0-2.12 1.43-2.12 2.9V21h-4z" />
              </svg>
            </Link>

            <Link
              href="#"
              aria-label="Instagram"
              className={iconLinkClass}
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
