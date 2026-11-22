"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import ImageSlot from "@/components/marketing/signage/ImageSlot";
import { COLORS, SCREENS, imageFor } from "@/lib/signage-screens";

const ROTATE_MS = 4000;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]";

export default function SignageHero() {
  const reducedMotion = useReducedMotion();
  const reduce = Boolean(reducedMotion);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reduce || SCREENS.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % SCREENS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [reduce]);

  const activeScreen = SCREENS[activeIndex] ?? SCREENS[0];
  if (!activeScreen) return null;

  const activeSrc = imageFor(activeScreen, activeScreen.heroColour);
  const revealProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: true } as const,
        transition: { duration: 0.6 },
      };

  return (
    <section className="relative overflow-hidden pb-20 pt-44 md:pt-52">
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

        <motion.div {...revealProps} className="relative mt-10 md:mt-0">
          <div className="relative mx-auto w-full max-w-[520px] rounded-[36px] border border-white/10 bg-[#0a1226] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.65)]">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[340px] overflow-hidden rounded-[28px] bg-[#0f1b3a]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScreen.id}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.4 }}
                >
                  <ImageSlot
                    src={activeSrc}
                    alt={`${activeScreen.name} screen mockup`}
                    hint={activeSrc ?? undefined}
                  />
                </motion.div>
              </AnimatePresence>
              <span className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                {activeScreen.name}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {SCREENS.map((item, index) => {
                const src = imageFor(item, item.heroColour);
                const active = item.id === activeScreen.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Show ${item.name} mockup`}
                    aria-pressed={active}
                    onClick={() => setActiveIndex(index)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-2 transition ${FOCUS_RING} ${
                      active
                        ? "border-sky-400 bg-sky-400/10"
                        : "border-white/10 bg-white/[0.02] hover:border-sky-400/30"
                    }`}
                  >
                    <span className="block w-full overflow-hidden rounded-xl bg-[#0f1b3a]">
                      <span className="block aspect-[3/4]">
                        <ImageSlot
                          src={src}
                          alt={`${item.name} screen mockup`}
                          hint={src ?? undefined}
                        />
                      </span>
                    </span>
                    <span className={`text-xs font-medium ${active ? "text-white" : "text-slate-400"}`}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
