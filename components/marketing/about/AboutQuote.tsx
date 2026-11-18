"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ABOUT_QUOTE } from "@/lib/about-content";

export default function AboutQuote() {
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
    <section className="py-28">
      <motion.div {...revealProps} className="mx-auto max-w-4xl px-6 text-center">
        <svg
          aria-hidden="true"
          width="96"
          height="96"
          viewBox="0 0 24 24"
          fill="none"
          className="mx-auto opacity-25"
          style={{ color: "#38bdf8" }}
        >
          <path
            d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"
            fill="currentColor"
          />
        </svg>
        <blockquote className="mt-6 text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
          {ABOUT_QUOTE.quote}
        </blockquote>
        <p className="mt-8 text-sm uppercase tracking-widest text-[#94a3b8]">
          {ABOUT_QUOTE.attribution}
        </p>
      </motion.div>
    </section>
  );
}
