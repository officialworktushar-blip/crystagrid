"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

const venues = [
  {
    title: "Retail Stores",
    description: "Promote offers and new arrivals at the point of sale.",
    image: "/Tatvan_Vertical.webp",
  },
  {
    title: "Offices & Lobbies",
    description: "Keep teams and visitors informed with live updates.",
    image: "/Atira_Veritcal.webp",
  },
  {
    title: "Gyms & Salons",
    description: "Show schedules, services, and promotions on repeat.",
    image: "/Tarya_Vertical.webp",
  },
  {
    title: "Restaurants & Cafes",
    description: "Display menus and daily specials that stay current.",
    image: "/Cafe_Vertical.webp",
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
    <section id="venues" className="scroll-mt-28 py-24">
      <Container>
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="Built for"
            title="Screens wherever your customers are."
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {venues.map((venue) => (
              <div key={venue.title} className="flex flex-col items-center">
                <div className="relative mx-auto w-full max-w-[260px] aspect-[1122/1402] overflow-hidden rounded-[2rem] border border-white/10 bg-surface/40 p-3 shadow-card">
                  <div className="relative h-full w-full overflow-hidden rounded-[1.4rem] bg-black/30">
                    <Image
                      src={venue.image}
                      alt={venue.title}
                      fill
                      className="object-contain"
                      sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 80vw"
                    />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-white text-center">
                  {venue.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/60 text-center">
                  {venue.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
