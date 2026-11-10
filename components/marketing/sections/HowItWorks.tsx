"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";

const steps = [
  {
    title: "Pair your screen",
    description:
      "Open the player and enter the 6-digit code shown in your dashboard.",
  },
  {
    title: "Upload your media",
    description:
      "Add images and videos to one shared library, ready for any screen.",
  },
  {
    title: "Publish a playlist",
    description:
      "Assign it to any screen and it updates live, instantly.",
  },
];

const screenCards = [
  { name: "Lobby", gradient: "from-sky-500/45 to-blue-600/10" },
  { name: "Retail", gradient: "from-indigo-500/45 to-sky-600/10" },
  { name: "Cafe", gradient: "from-cyan-500/45 to-blue-500/10" },
];

const playlistItems = [
  {
    name: "Summer campaign",
    duration: "0:12",
    progress: "w-3/4",
    gradient: "from-sky-400/50 to-blue-600/20",
  },
  {
    name: "Welcome loop",
    duration: "0:08",
    progress: "w-1/2",
    gradient: "from-cyan-400/50 to-indigo-600/20",
  },
  {
    name: "Daily specials",
    duration: "0:15",
    progress: "w-2/3",
    gradient: "from-blue-400/50 to-sky-700/20",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-24">
      <Container>
        <motion.div
          {...fadeUp}
          className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
              New · Self-Serve
            </p>

            <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
              Go live in{" "}
              <span className="text-brand-gradient">5 minutes</span>.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-body sm:text-lg">
              Pair a screen, add your media, and publish a playlist from one
              simple dashboard. No hardware, no installs, no learning curve.
            </p>

            <div className="mt-8 space-y-5">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-400/30 bg-sky-400/10 text-sm font-semibold text-sky-400">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-body">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button asChild className="mt-8">
              <Link href="/register">Start Free ↗</Link>
            </Button>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-sky-500/10 blur-3xl" />

            <Card className="relative overflow-hidden rounded-3xl border-white/10 bg-surface-2 p-0 shadow-card hover:border-white/10 hover:shadow-card">
              <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <div className="ml-3 h-2 w-28 rounded-full bg-white/10" />
                <div className="ml-auto h-2 w-8 rounded-full bg-white/10" />
              </div>

              <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[78px_1fr]">
                <div className="border-r border-white/10 bg-white/[0.02] p-3">
                  <div className="brand-gradient h-7 w-7 rounded-lg" />

                  <div className="mt-5 space-y-3">
                    <div className="h-2 w-full rounded-full bg-sky-400/50" />
                    <div className="h-2 w-4/5 rounded-full bg-white/10" />
                    <div className="h-2 w-3/5 rounded-full bg-white/10" />
                  </div>

                  <div className="mt-6 space-y-2">
                    <div className="h-6 rounded-lg bg-white/5" />
                    <div className="h-6 rounded-lg bg-white/5" />
                    <div className="h-6 rounded-lg bg-white/5" />
                  </div>
                </div>

                <div className="min-w-0 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                        Overview
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        3 screens online
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                      Live
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {screenCards.map((screen) => (
                      <div
                        key={screen.name}
                        className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-2"
                      >
                        <div
                          className={`aspect-video rounded-lg bg-gradient-to-br ${screen.gradient}`}
                        />
                        <p className="mt-2 truncate text-[10px] font-medium text-white/70">
                          {screen.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                          <span className="text-[9px] text-emerald-300">
                            Online
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-white">
                        Playlist
                      </p>
                      <span className="text-[9px] text-white/40">
                        Loop · 3 items
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-2">
                      {playlistItems.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-2.5"
                        >
                          <div
                            className={`h-7 w-10 shrink-0 rounded-md bg-gradient-to-br ${item.gradient}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-medium text-white/70">
                              {item.name}
                            </p>
                            <div className="mt-1 h-1 w-full rounded-full bg-white/10">
                              <div
                                className={`brand-gradient h-1 rounded-full ${item.progress}`}
                              />
                            </div>
                          </div>
                          <span className="text-[9px] text-white/40">
                            {item.duration}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
