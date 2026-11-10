"use client";

import {
  Building2,
  Dumbbell,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

const venues = [
  {
    title: "Retail Stores",
    description: "Promote offers and new arrivals at the point of sale.",
    icon: Store,
    gradient: "from-sky-500/20 via-[#07142f] to-[#020617]",
  },
  {
    title: "Offices & Lobbies",
    description: "Keep teams and visitors informed with live updates.",
    icon: Building2,
    gradient: "from-blue-500/20 via-[#0a1026] to-[#020617]",
  },
  {
    title: "Gyms & Salons",
    description: "Show schedules, services, and promotions on repeat.",
    icon: Dumbbell,
    gradient: "from-indigo-500/20 via-[#0d0f2a] to-[#020617]",
  },
  {
    title: "Restaurants & Cafes",
    description: "Display menus and daily specials that stay current.",
    icon: UtensilsCrossed,
    gradient: "from-cyan-500/15 via-[#061821] to-[#020617]",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export default function Venues() {
  return (
    <section id="venues" className="scroll-mt-24 py-24">
      <Container>
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="Built for"
            title="Screens wherever your customers are."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {venues.map((venue) => {
              const Icon = venue.icon;

              return (
                <Card
                  key={venue.title}
                  className={`group relative aspect-[3/4] overflow-hidden rounded-3xl border-white/10 bg-gradient-to-br p-6 transition duration-300 hover:scale-105 hover:border-sky-400/50 hover:shadow-card ${venue.gradient}`}
                >
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1}
                    className="absolute -bottom-4 -right-4 h-40 w-40 text-white/[0.04] transition duration-300 group-hover:scale-110 group-hover:text-white/[0.07]"
                  />

                  <div className="relative flex h-full flex-col justify-end">
                    <h3 className="text-xl font-bold tracking-tight text-white">
                      {venue.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      {venue.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
