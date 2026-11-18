"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Cpu,
  ShieldCheck,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";

type HeroCard = {
  kind: "hero";
  number: string;
  title: string;
  description: string;
  badge: string;
  footer: string;
};

type SmallCard = {
  kind: "small";
  number: string;
  title: string;
  description: string;
  numberColor: string;
  background: string;
  borderColor: string;
  icon: "target" | "zap" | "activity" | "ring" | "cpu";
};

const cards: (HeroCard | SmallCard)[] = [
  {
    kind: "hero",
    number: "01",
    title: "Can't Be Skipped",
    description:
      "Your ad plays in full on screens people already look at every day, in lifts, lobbies, shops and offices. No skip button, no blockers, just your message from start to finish.",
    badge: "UNMISSABLE BY DESIGN",
    footer: "Plays in full, start to finish",
  },
  {
    kind: "small",
    number: "02",
    title: "Right Place, Right Time",
    description:
      "Choose the exact properties and places in Dehradun where your customers already are, from residential societies to offices and markets.",
    numberColor: "#a855f7",
    background: "linear-gradient(135deg, #f5efff, #ffffff)",
    borderColor: "#e9defc",
    icon: "target",
  },
  {
    kind: "small",
    number: "03",
    title: "Hard to Ignore",
    description:
      "Bright, full-screen 10-second slots at eye level in lifts and lobbies, where people have a few quiet seconds to watch.",
    numberColor: "#f59e0b",
    background: "linear-gradient(135deg, #fffbeb, #ffffff)",
    borderColor: "#fdecb3",
    icon: "zap",
  },
  {
    kind: "small",
    number: "04",
    title: "Live Content Control",
    description:
      "Your account manager can change your content anytime, and new content reaches the screens within seconds.",
    numberColor: "#f43f5e",
    background: "linear-gradient(135deg, #fff1f3, #ffffff)",
    borderColor: "#fdd5dc",
    icon: "activity",
  },
  {
    kind: "small",
    number: "05",
    title: "Start Local, Grow Big",
    description:
      "Begin with a single property or a ready-made package, and add more places as your campaign grows.",
    numberColor: "#10b981",
    background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
    borderColor: "#c9f1df",
    icon: "ring",
  },
  {
    kind: "small",
    number: "06",
    title: "Clear Pricing, Easy Booking",
    description:
      "Pick a city, package and dates, and see the full price with GST before you book. Choose Gold or Platinum for more frequency.",
    numberColor: "#6366f1",
    background: "linear-gradient(135deg, #eef0ff, #ffffff)",
    borderColor: "#d9dcfb",
    icon: "cpu",
  },
];

const smallIcons: Record<Exclude<SmallCard["icon"], "ring">, LucideIcon> = {
  target: Target,
  zap: Zap,
  activity: Activity,
  cpu: Cpu,
};

function SmallCardDecoration({ card }: { card: SmallCard }) {
  if (card.icon === "ring") {
    return (
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 -right-6 h-[170px] w-[170px]"
        viewBox="0 0 170 170"
        fill="none"
      >
        <circle
          cx="85"
          cy="85"
          r="70"
          stroke="#10b981"
          strokeOpacity="0.25"
          strokeWidth="10"
        />
        <circle
          cx="85"
          cy="85"
          r="45"
          stroke="#10b981"
          strokeOpacity="0.25"
          strokeWidth="10"
        />
      </svg>
    );
  }

  const Icon = smallIcons[card.icon];

  return (
    <Icon
      aria-hidden="true"
      size={150}
      strokeWidth={1.5}
      className="pointer-events-none absolute -bottom-6 -right-6"
      style={{ color: card.numberColor, opacity: 0.25 }}
    />
  );
}

export default function WhyCrystagrid() {
  const reduce = useReducedMotion();

  return (
    <section id="why-crystagrid" className="bg-[#f8fafc] py-24">
      <div className="mx-auto max-w-[1540px] px-6">
        <div className="mx-auto mb-14 flex max-w-3xl flex-col items-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1d6fff]">
            THE EDGE
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-[#0b1220] md:text-5xl">
            Why businesses are moving to digital screens
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => {
            const motionProps = reduce
              ? {}
              : {
                  initial: { opacity: 0, y: 24 } as const,
                  whileInView: { opacity: 1, y: 0 } as const,
                  viewport: { once: true, amount: 0.2 } as const,
                  transition: { duration: 0.5, delay: index * 0.08 },
                };

            if (card.kind === "hero") {
              return (
                <motion.article
                  key={card.number}
                  {...motionProps}
                  className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-[32px] p-10 text-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_36px_70px_-18px_rgba(0,120,220,0.45)] md:col-span-2 lg:col-span-2 lg:row-span-2"
                  style={{
                    background:
                      "linear-gradient(135deg, #00a3f5 0%, #0a7fd8 45%, #1747e0 100%)",
                    boxShadow: "0 30px 60px -20px rgba(0,120,220,0.35)",
                  }}
                >
                  <ShieldCheck
                    aria-hidden="true"
                    size={340}
                    strokeWidth={1.5}
                    className="pointer-events-none absolute -bottom-10 -right-10 hidden text-white/[0.14] md:block"
                  />

                  <div className="relative z-10">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
                      <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
                      {card.badge}
                    </div>

                    <div className="mt-6 text-7xl font-extrabold text-white/[0.28] md:text-8xl">
                      {card.number}
                    </div>

                    <h3 className="mt-2 text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-[56px]">
                      {card.title}
                    </h3>

                    <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/90 md:text-xl">
                      {card.description}
                    </p>
                  </div>

                  <div className="relative z-10 mt-8 flex flex-wrap items-center gap-4">
                    <div className="flex items-center">
                      <span
                        className="h-10 w-10 rounded-full border-2"
                        style={{
                          backgroundColor: "#7dd3fc",
                          borderColor: "rgba(255,255,255,0.4)",
                        }}
                      />
                      <span
                        className="-ml-3 h-10 w-10 rounded-full border-2"
                        style={{
                          backgroundColor: "#22d3ee",
                          borderColor: "rgba(255,255,255,0.4)",
                        }}
                      />
                      <span
                        className="-ml-3 h-10 w-10 rounded-full border-2"
                        style={{
                          backgroundColor: "#93c5fd",
                          borderColor: "rgba(255,255,255,0.4)",
                        }}
                      />
                    </div>
                    <span className="text-base font-semibold text-white md:text-lg">
                      {card.footer}
                    </span>
                  </div>
                </motion.article>
              );
            }

            const isLast = index === cards.length - 1;

            return (
              <motion.article
                key={card.number}
                {...motionProps}
                className={`relative min-h-[260px] overflow-hidden rounded-[32px] border p-8 transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  isLast ? "md:col-span-2 lg:col-span-1" : ""
                }`}
                style={{
                  background: card.background,
                  borderColor: card.borderColor,
                }}
              >
                <SmallCardDecoration card={card} />

                <div className="relative z-10">
                  <div
                    className="text-5xl font-extrabold leading-none md:text-6xl"
                    style={{ color: card.numberColor }}
                  >
                    {card.number}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-[#111827] md:text-2xl">
                    {card.title}
                  </h3>
                  <p className="mt-3 max-w-[85%] text-base leading-relaxed text-[#64748b] md:text-[17px]">
                    {card.description}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
