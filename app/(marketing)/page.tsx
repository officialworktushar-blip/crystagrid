import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/marketing/Hero";
import StatsRow from "@/components/marketing/StatsRow";

export const metadata: Metadata = {
  title: "Crystagrid — Control every screen from one dashboard",
  description:
    "Crystagrid is the digital signage cloud for uploading media, building playlists, and pushing content to every screen in real time.",
};

const features = [
  {
    title: "Pair screens with a 6-digit code",
    description:
      "Connect any display in seconds. Enter the code once and the screen is ready to receive content.",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M8 10h2M12 10h2M16 10h.01" />
      </svg>
    ),
  },
  {
    title: "Media library",
    description:
      "Upload, organise, and reuse images and videos across every location without duplicating files.",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m21 15-4.5-4.5L9 18" />
      </svg>
    ),
  },
  {
    title: "Playlists",
    description:
      "Build sequences, mix media types, and schedule exactly what plays on each screen and when.",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M8 6h12M8 12h12M8 18h7" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    ),
  },
  {
    title: "Live status",
    description:
      "See which screens are online and what is playing right now, with real-time health at a glance.",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M3 12h4l2.5-6 4 12L16 12h5" />
      </svg>
    ),
  },
];

export default function MarketingPage() {
  return (
    <>
      <Hero />
      <StatsRow />

      <section
        id="features"
        className="relative scroll-mt-24 overflow-hidden bg-[#05060a] py-20 sm:py-28"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p
              id="how-it-works"
              className="scroll-mt-24 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400"
            >
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Everything you need to run every screen
            </h2>
            <p className="mt-4 text-base leading-7 text-white/55">
              Pair a display, drop in your content, and publish. Crystagrid keeps
              every screen in sync without the busywork.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-400/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/15 to-blue-600/15 text-cyan-300">
                  {feature.icon}
                </div>
                <h3 className="mt-5 text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 bg-[#05060a] px-6 pb-24 sm:pb-32">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/15 via-[#080b12] to-blue-600/15 px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_55%)]" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Free to start
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready to bring your screens to life?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/55">
              Create your workspace, pair your first screen, and publish content
              in minutes. Scale when you are ready.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]"
              >
                Start Free
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
