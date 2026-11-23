import Link from "next/link";
import OrbitScreens from "@/components/marketing/OrbitScreens";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative isolate flex min-h-screen w-full items-start justify-center overflow-hidden bg-background px-6 pb-24">
      <video
        className="absolute inset-0 h-full w-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src="/hero_video.webm" type="video/webm" />
        <source src="/Hero_Video.webm" type="video/webm" />
      </video>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/30 to-black/70" />

      <OrbitScreens />

      <div className="relative z-[3] mx-auto flex w-full max-w-5xl flex-col items-center pt-[136px] text-center md:pt-[178px]">
        <h1 className="max-w-5xl text-balance text-[clamp(2.75rem,6vw,5.5rem)] font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(2,6,23,0.85)]">
          <span className="text-[0.75em]">Uttrakhand First Ambient DOOH</span>{" "}
          <span className="text-brand-gradient">Advertising Network</span>
        </h1>

        <p className="mt-6 max-w-3xl text-balance text-lg leading-8 text-white/70 sm:text-xl lg:text-2xl">
          From residential communities and commercial spaces to caf&eacute;s,
          retail stores, and public venues, CrystaGrid transforms everyday
          locations into powerful digital advertising opportunities.
        </p>

        <div className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
          <Button
            asChild
            withArrow
            className="h-14 w-full px-8 text-lg sm:w-auto"
          >
            <Link href="/book">Book CrystaGrid Ads</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="h-14 w-full px-8 text-lg sm:w-auto"
          >
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
