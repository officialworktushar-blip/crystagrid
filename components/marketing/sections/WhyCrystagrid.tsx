"use client";

import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

const reasons = [
  {
    number: "01",
    title: "Can't be skipped",
    description:
      "Screens play your content in full, so the message is seen from start to finish.",
  },
  {
    number: "02",
    title: "Right place, right time",
    description:
      "Put your message on screens where customers already are, when it matters most.",
  },
  {
    number: "03",
    title: "Instant updates",
    description:
      "Change content from anywhere and publish it to your screens in real time.",
  },
  {
    number: "04",
    title: "One dashboard",
    description:
      "Manage every screen, playlist, and upload from one clear place.",
  },
  {
    number: "05",
    title: "Simple setup",
    description:
      "Pair a screen with a 6-digit code and start publishing in minutes.",
  },
  {
    number: "06",
    title: "Grows with you",
    description:
      "Run one screen or hundreds from the same account as your network expands.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export default function WhyCrystagrid() {
  return (
    <section id="why-crystagrid" className="py-24">
      <Container>
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="The Edge"
            title="Why businesses are moving to digital screens"
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason) => (
              <Card
                key={reason.number}
                className="relative h-full overflow-hidden p-7"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-6 top-3 text-6xl font-extrabold tracking-tight text-white/[0.06]"
                >
                  {reason.number}
                </span>

                <h3 className="relative text-lg font-semibold tracking-tight text-white">
                  {reason.title}
                </h3>
                <p className="relative mt-3 text-sm leading-6 text-body">
                  {reason.description}
                </p>
              </Card>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
