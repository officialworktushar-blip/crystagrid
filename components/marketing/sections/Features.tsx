"use client";

import { Activity, Images, ListVideo, MonitorSmartphone } from "lucide-react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

const features = [
  {
    title: "Easy Pairing",
    description:
      "Connect a screen in seconds with a 6-digit code that expires after 10 minutes.",
    icon: MonitorSmartphone,
  },
  {
    title: "Media Library",
    description:
      "Keep images and videos organised in one shared library for every screen.",
    icon: Images,
  },
  {
    title: "Playlists",
    description:
      "Drag to reorder content and set how long each item stays on screen.",
    icon: ListVideo,
  },
  {
    title: "Live Status",
    description:
      "See which screens are online or offline, plus when each one was last seen.",
    icon: Activity,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export default function Features() {
  return (
    <section id="features" className="scroll-mt-24 py-24">
      <Container>
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="Everything you need"
            title="One dashboard for every screen."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card key={feature.title} className="p-6">
                  <div className="brand-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-brand">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-body">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
