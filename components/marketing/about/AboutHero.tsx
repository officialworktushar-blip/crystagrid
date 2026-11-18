"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ABOUT_HERO, ABOUT_HERO_MEDIA } from "@/lib/about-content";

const TILE_GAP = 20;
const SMALLEST_TILE_WIDTH = 260;
const MAX_VIEWPORT_WIDTH = 3840;
const REPEATS = Math.max(
  2,
  Math.ceil(
    Math.ceil((MAX_VIEWPORT_WIDTH * 2) / (SMALLEST_TILE_WIDTH + TILE_GAP)) /
      ABOUT_HERO_MEDIA.length,
  ),
);
const HALF_TILES = Array.from(
  { length: REPEATS * ABOUT_HERO_MEDIA.length },
  (_, index) => ABOUT_HERO_MEDIA[index % ABOUT_HERO_MEDIA.length],
);

const MARQUEE_MASK = {
  maskImage:
    "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
} as const;

const MARQUEE_TRANSITION = {
  duration: 200,
  ease: "linear" as const,
  repeat: Infinity,
};

export default function AboutHero() {
  const reducedMotion = useReducedMotion();
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(Boolean(reducedMotion));
  }, [reducedMotion]);

  const revealProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: true } as const,
        transition: { duration: 1.5 },
      };

  return (
    <section className="relative overflow-hidden pb-24 pt-44 md:pt-52">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(29,111,255,0.18), transparent 55%)",
        }}
      />

      <div
        className={reduce ? "relative flex w-full justify-center overflow-hidden" : "relative w-full overflow-hidden"}
        style={MARQUEE_MASK}
      >
        <motion.div
          className="flex w-max"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={reduce ? undefined : MARQUEE_TRANSITION}
        >
          {[false, true].map((isDuplicate) => (
            <div
              key={isDuplicate ? "duplicate" : "original"}
              aria-hidden={isDuplicate ? true : undefined}
              className="flex shrink-0 gap-5 pr-5"
            >
              {HALF_TILES.map((image, index) => (
                <div
                  key={`${isDuplicate ? "duplicate" : "original"}-${index}`}
                  className={`relative w-[260px] shrink-0 overflow-hidden rounded-[28px] ${
                    image.orientation === "landscape"
                      ? "aspect-[4/3] md:w-[400px]"
                      : "aspect-[3/4] md:w-[320px]"
                  }`}
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Image
                    src={image.src}
                    alt={isDuplicate ? "" : image.alt}
                    fill
                    sizes="(min-width: 768px) 400px, 260px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        {...revealProps}
        className="relative mx-auto mt-[72px] max-w-4xl px-6 text-center"
      >
        <p className="inline-flex rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          {ABOUT_HERO.chip}
        </p>
        <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-7xl">
          {ABOUT_HERO.headingStart}
          <span className="text-brand-gradient">{ABOUT_HERO.headingAccent}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[#94a3b8] md:text-xl">
          {ABOUT_HERO.paragraph}
        </p>
      </motion.div>
    </section>
  );
}
