"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  Dumbbell,
  Store,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

type Venue = {
  title: string;
  text: string;
  icon: LucideIcon;
};

const VENUES: Venue[] = [
  {
    title: "Lift lobbies",
    text: "Tall screens catch attention while people wait for the lift.",
    icon: Building2,
  },
  {
    title: "Shops and showrooms",
    text: "Landscape screens put your campaign in front of people as they browse.",
    icon: Store,
  },
  {
    title: "Offices and coworking",
    text: "Reception and lobby screens reach people at the start of their day.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Salons and gyms",
    text: "Screens in waiting areas stay visible during longer visits.",
    icon: Dumbbell,
  },
];

export default function SignageVenues() {
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
    <section className="bg-[#050b1f] py-24">
      <div className="mx-auto max-w-[1540px] px-6">
        <motion.div {...revealProps} className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            Where it runs
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            Screens wherever your customers are
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {VENUES.map((venue, index) => {
            const Icon = venue.icon;
            return (
              <motion.div
                key={venue.title}
                {...revealProps}
                transition={revealProps.transition ? { duration: 0.6, delay: index * 0.08 } : undefined}
                className="rounded-3xl border border-white/10 bg-[#0a1226] p-6"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-400"
                >
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{venue.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">{venue.text}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div {...revealProps} className="mt-10">
          <Link
            href="/#network"
            className="inline-flex items-center rounded-full border border-sky-400/40 bg-sky-400/10 px-5 py-2.5 text-sm font-semibold text-sky-400 transition hover:bg-sky-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050b1f]"
          >
            See the areas on the map
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
