"use client";

import { Activity, Images, ListVideo, MonitorSmartphone } from "lucide-react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

const features = [
  {
    title: "Multi-Location Management",
    description:
      "Manage digital displays across multiple properties, branches and locations from one centralized dashboard.",
    icon: MonitorSmartphone,
  },
  {
    title: "100+ Screen Management",
    description:
      "Control and monitor 100+ connected screens without switching between multiple accounts or dashboards.",
    icon: Images,
  },
  {
    title: "Centralized Content Control",
    description:
      "Upload, organize and distribute advertising content across selected screens with complete control.",
    icon: ListVideo,
  },
  {
    title: "Remote Screen Management",
    description:
      "Manage your display network from anywhere. Update content, control playback and monitor screen activity remotely.",
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
    <section id="features" className="scroll-mt-28 py-24">
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
