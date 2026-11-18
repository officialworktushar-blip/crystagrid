"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ABOUT_VISION } from "@/lib/about-content";

export default function AboutVision() {
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
        transition: { duration: 0.6 },
      };

  return (
    <section className="py-24">
      <div className="mx-auto max-w-[1540px] px-6">
        <motion.div {...revealProps} className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            {ABOUT_VISION.chip}
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            {ABOUT_VISION.heading}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-[#94a3b8]">
            {ABOUT_VISION.paragraph}
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ABOUT_VISION.tiles.map((tile, index) => (
            <motion.div
              key={tile.word}
              {...revealProps}
              transition={reduce ? undefined : { duration: 0.6, delay: index * 0.08 }}
              className="rounded-3xl bg-[#0a1226] p-6"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <p className="text-[28px] font-bold leading-tight text-white">
                {tile.word}
              </p>
              <p className="mt-3 text-base leading-relaxed text-[#94a3b8]">
                {tile.caption}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
