"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import ImageSlot from "@/components/marketing/signage/ImageSlot";
import { COLORS, SCREENS, imageFor } from "@/lib/signage-screens";

const STAGE_FRAMES = [
  { id: "floor", width: 220, left: 30, top: 80, rotate: -6, z: 20, float: 6, delay: 0 },
  { id: "board", width: 190, left: 310, top: 35, rotate: 5, z: 30, float: 7, delay: 0.6 },
  { id: "lift", width: 205, left: 250, top: 265, rotate: -4, z: 15, float: 5, delay: 1.1 },
] as const;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]";

export default function SignageHero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const parallax = useTransform(scrollYProgress, [0, 1], [24, -24]);
  const reduce = Boolean(reducedMotion);

  const revealProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: true } as const,
        transition: { duration: 0.6 },
      };

  return (
    <section ref={sectionRef} className="relative overflow-hidden pb-20 pt-44 md:pt-52">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-64 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-[1540px] items-center gap-12 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <motion.div {...revealProps} className="max-w-2xl">
          <p className="inline-flex rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            Digital Signage
          </p>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-7xl">
            Digital signage that turns everyday places{" "}
            <span className="text-brand-gradient">into screens</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#94a3b8] md:text-xl">
            Choose your screen, choose your places and go live with full-screen 10-second ads across Dehradun.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#choose-screen"
              className={`inline-flex items-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 ${FOCUS_RING}`}
            >
              Choose your screen
            </a>
            <Link
              href="/book"
              className={`brand-gradient inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-brand transition hover:brightness-110 ${FOCUS_RING}`}
            >
              Book CrystaGrid Ads
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {[`${SCREENS.length} screen types`, `${COLORS.length} colours`, "Dehradun"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
              >
                {chip}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div {...revealProps} className="relative mt-10 h-[320px] w-full md:mt-0 md:h-[520px]">
          <div
            className="absolute left-1/2 top-0 origin-top -translate-x-1/2 scale-[0.55] sm:scale-[0.75] md:scale-100"
            style={{ width: 560, height: 520 }}
          >
            <motion.div className="relative h-full w-full" style={{ y: reduce ? 0 : parallax }}>
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                style={{ background: "radial-gradient(circle, rgba(56,189,248,0.35), transparent 70%)" }}
              />
              {STAGE_FRAMES.map((frame) => {
                const screen = SCREENS.find((item) => item.id === frame.id);
                if (!screen) return null;
                const src = imageFor(screen, screen.heroColour);
                return (
                  <motion.div
                    key={frame.id}
                    className="absolute"
                    style={{ left: frame.left, top: frame.top, zIndex: frame.z }}
                    animate={reduce ? undefined : { y: [-10, 10, -10] }}
                    transition={
                      reduce
                        ? undefined
                        : {
                            duration: frame.float,
                            ease: "easeInOut",
                            repeat: Infinity,
                            delay: frame.delay,
                          }
                    }
                  >
                    <div style={{ transform: `rotate(${frame.rotate}deg)` }}>
                      <div
                        className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/[0.12] bg-[#0f1b3a] shadow-[0_24px_60px_rgba(2,6,23,0.65),0_0_40px_rgba(56,189,248,0.28)]"
                        style={{ width: frame.width }}
                      >
                        <ImageSlot
                          src={src}
                          alt={`${screen.name} screen`}
                          hint={src ?? undefined}
                        />
                        <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                          {screen.name}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
