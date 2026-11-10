import Link from "next/link";
import OrbitScreens from "@/components/marketing/OrbitScreens";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-background px-6 py-24">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/hero_video.webm"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />

      <OrbitScreens />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-sky shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
          The digital signage cloud
        </span>

        <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(2,6,23,0.85)] sm:text-5xl lg:text-7xl">
          Run every screen from{" "}
          <span className="text-brand-gradient">one dashboard</span>
        </h1>

        <p className="mt-6 max-w-xl text-balance text-base leading-7 text-body sm:text-lg">
          Upload media, build playlists, and push content to every display in
          real time — without the busywork.
        </p>

        <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" withArrow className="w-full sm:w-auto">
            <Link href="/register">Start free</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
          >
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
