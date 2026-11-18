"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ABOUT_IMAGES, ABOUT_NETWORK } from "@/lib/about-content";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]";

export default function AboutNetwork() {
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
        <motion.div {...revealProps}>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            {ABOUT_NETWORK.chip}
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            {ABOUT_NETWORK.heading}
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {ABOUT_IMAGES.map((item, index) => (
            <motion.div
              key={item.src}
              {...revealProps}
              transition={reduce ? undefined : { duration: 0.6, delay: index * 0.08 }}
              whileHover={reduce ? undefined : { y: -6, transition: { duration: 0.25 } }}
              className="rounded-[32px] border border-[rgba(255,255,255,0.1)] bg-[#0a1226] p-3 transition-colors duration-200 hover:border-[rgba(56,189,248,0.4)] hover:shadow-[0_24px_60px_-20px_rgba(14,165,233,0.55)]"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[22px]">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="px-3 py-4">
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                  {item.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          {...revealProps}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href={ABOUT_NETWORK.secondaryHref}
            className={`inline-flex items-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-white/10 ${FOCUS_RING}`}
          >
            {ABOUT_NETWORK.secondaryCta}
          </Link>
          <Link
            href={ABOUT_NETWORK.primaryHref}
            className={`brand-gradient inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-brand transition duration-200 hover:brightness-110 ${FOCUS_RING}`}
          >
            {ABOUT_NETWORK.primaryCta}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
