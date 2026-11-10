"use client";

import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";

const capabilities = [
  "Real-time updates",
  "Separate customer accounts",
  "Secure by design",
  "Works on any Android display",
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export default function Capabilities() {
  return (
    <section id="capabilities" className="scroll-mt-24 py-24">
      <Container>
        <motion.div
          {...fadeUp}
          className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
              What we do
            </p>

            <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
              Digital signage that just works.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-body sm:text-lg">
              Crystagrid gives you one clear place to manage every display,
              whether you run two screens or two hundred. Pair, publish, and
              update content without touching a single device.
            </p>

            <p className="mt-4 max-w-xl text-base leading-7 text-body sm:text-lg">
              Customer accounts stay separate and secure, so agencies and
              multi-location teams can work side by side with confidence.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {capabilities.map((capability) => (
              <Card
                key={capability}
                className="flex min-h-32 items-start gap-3 p-5"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-sky shadow-[0_0_10px_rgba(14,165,233,0.7)]" />
                <h3 className="text-base font-semibold leading-6 tracking-tight text-white">
                  {capability}
                </h3>
              </Card>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
