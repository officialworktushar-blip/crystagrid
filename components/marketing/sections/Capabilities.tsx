"use client";

import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";

const capabilities = [
  {
    title: "Multi-Property Network",
    description:
      "Connect advertising screens across multiple residential properties and housing communities through one platform.",
  },
  {
    title: "Centralized Screen Management",
    description:
      "Monitor and manage displays across different residential locations from a single dashboard.",
  },
  {
    title: "Remote Content Publishing",
    description:
      "Upload, schedule, and publish advertising campaigns across selected screens in real time.",
  },
  {
    title: "Residential Audience Reach",
    description:
      "Help brands connect with residents through strategically placed digital displays in everyday community spaces.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export default function Capabilities() {
  return (
    <section id="capabilities" className="scroll-mt-28 py-24">
      <Container>
        <motion.div
          {...fadeUp}
          className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
              What We Do
            </p>

            <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
              Bringing Digital Advertising Into{" "}
              <span className="text-brand-gradient">Residential Societies</span>.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-body sm:text-lg">
              CrystaGrid is transforming residential properties into connected
              digital advertising environments, bringing brands closer to
              audiences where they live every day.
            </p>

            <p className="mt-4 max-w-xl text-base leading-7 text-body sm:text-lg">
              From apartment complexes and gated communities to residential
              towers and premium housing societies, we turn everyday
              residential touchpoints into valuable digital advertising
              spaces.
            </p>

            <p className="mt-4 max-w-xl text-base leading-7 text-body sm:text-lg">
              Our platform enables centralized screen management, seamless
              content distribution, and real-time publishing, helping property
              owners build smarter advertising networks while giving brands
              access to residential audiences.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {capabilities.map((capability) => (
              <Card
                key={capability.title}
                className="flex min-h-32 items-start gap-3 p-5"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-sky shadow-[0_0_10px_rgba(14,165,233,0.7)]" />
                <div className="min-w-0">
                  <h3 className="text-base font-semibold leading-6 tracking-tight text-white">
                    {capability.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-body">
                    {capability.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
