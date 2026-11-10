import Link from "next/link";
import OrbitScreens from "@/components/marketing/OrbitScreens";

export default function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-[#05060a] px-6 py-24">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/hero_video.webm"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-[#05060a]/85 via-[#05060a]/60 to-[#05060a]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12),transparent_55%)]" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <OrbitScreens />
      </div>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/70 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          Digital Signage Cloud
        </span>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-white drop-shadow-[0_2px_24px_rgba(5,6,10,0.85)] sm:text-5xl lg:text-7xl">
          Control every screen from{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            one dashboard
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-balance text-base leading-7 text-white/65 sm:text-lg">
          Upload media, build playlists, and push content to every screen in real
          time — all from one place.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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
    </section>
  );
}
