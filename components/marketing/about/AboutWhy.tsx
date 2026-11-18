"use client";

import { CalendarCheck, MapPin, RefreshCw, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ABOUT_WHY } from "@/lib/about-content";

const ICONS: LucideIcon[] = [MapPin, CalendarCheck, RefreshCw];

export default function AboutWhy() {
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
    <section className="bg-[#050b1f] py-24">
      <div className="mx-auto max-w-[1540px] px-6">
        <motion.div {...revealProps} className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            {ABOUT_WHY.chip}
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            {ABOUT_WHY.heading}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-[#94a3b8]">
            {ABOUT_WHY.paragraph}
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ABOUT_WHY.cards.map((card, index) => {
            const Icon = ICONS[index];
            return (
              <motion.div
                key={card.title}
                {...revealProps}
                transition={reduce ? undefined : { duration: 0.6, delay: index * 0.08 }}
                className="rounded-3xl bg-[#0a1226] p-6"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-400"
                >
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <h3 className="mt-6 text-xl font-semibold text-white">
                  {card.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-[#94a3b8]">
                  {card.text}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
