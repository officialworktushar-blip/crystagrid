"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]";

export default function SignageCta() {
  const reducedMotion = useReducedMotion();
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
    <section className="pb-24">
      <div className="mx-auto max-w-[1540px] px-6">
        <motion.div
          {...revealProps}
          className="relative overflow-hidden rounded-[40px] border border-sky-400/20 bg-[#07102a] px-6 py-16 text-center md:px-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-sky-500/25 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              Ready to put your brand on screen?
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/book"
                className={`brand-gradient inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-brand transition hover:brightness-110 ${FOCUS_RING}`}
              >
                Book CrystaGrid Ads
              </Link>
              <Link
                href="/contact"
                className={`inline-flex items-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 ${FOCUS_RING}`}
              >
                Talk to us
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
