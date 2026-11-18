"use client";

import { Image as ImageIcon, Video } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const SLOT_COUNT = 10;

export default function SlotLoop() {
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const reduce = Boolean(reducedMotion);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % SLOT_COUNT);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [reduce]);

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
            Your content
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            One loop, up to 10 slots
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#94a3b8]">
            Every slot is 10 seconds. Add up to 10 images or videos and they play in order, again and again. Platinum campaigns play more often.
          </p>
        </motion.div>

        <motion.div
          {...revealProps}
          className="mt-14 rounded-[36px] border border-white/10 bg-[#0a1226] p-6 md:p-10"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: SLOT_COUNT }, (_, index) => {
              const isActive = !reduce && index === active;
              const Icon = index % 2 === 0 ? ImageIcon : Video;
              return (
                <motion.div
                  key={index}
                  animate={
                    reduce
                      ? undefined
                      : {
                          borderColor: isActive ? "rgba(56,189,248,0.8)" : "rgba(255,255,255,0.1)",
                          backgroundColor: isActive ? "rgba(14,165,233,0.16)" : "rgba(5,11,31,0.9)",
                        }
                  }
                  transition={reduce ? undefined : { duration: 0.25 }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#050b1f] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      Slot {index + 1}
                    </span>
                    <Icon
                      aria-hidden="true"
                      className={`h-4 w-4 ${isActive ? "text-sky-400" : "text-slate-600"}`}
                      strokeWidth={1.8}
                    />
                  </div>
                  <div className="mt-4 h-10 rounded-lg border border-white/5 bg-white/[0.03]" />
                  <div className="mt-2 h-2 w-2/3 rounded-full bg-white/10" />
                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-sky-400"
                      animate={reduce ? undefined : { width: isActive ? "100%" : "0%" }}
                      transition={reduce ? undefined : { duration: 1.2, ease: "linear" }}
                      style={{ width: reduce ? "0%" : undefined }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <p className="text-sm font-medium text-slate-300">Loop time: up to 100 seconds</p>
            <p className="text-sm text-slate-500">10 second slots, played in order</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
