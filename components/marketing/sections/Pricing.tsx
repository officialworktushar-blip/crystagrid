"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

// Placeholder prices — edit these values before launch.
const PLANS = [
  {
    name: "Starter",
    price: "₹499",
    period: "/ month",
    features: [
      "1 screen",
      "Unlimited media uploads",
      "Playlist management",
      "Live screen status",
    ],
    highlighted: false,
    cta: { label: "Start Free", href: "/register" },
  },
  {
    name: "Growth",
    price: "₹1,999",
    period: "/ month",
    features: [
      "Up to 5 screens",
      "Everything in Starter",
      "Per-screen playlists",
      "Live screen status",
    ],
    highlighted: true,
    cta: { label: "Start Free", href: "/register" },
  },
  {
    name: "Business",
    price: "Custom",
    period: "annual plan",
    features: [
      "Unlimited screens",
      "Everything in Growth",
      "Separate customer accounts",
      "Volume pricing",
    ],
    highlighted: false,
    cta: { label: "Talk to us", href: "/contact" },
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

type Plan = (typeof PLANS)[number];

function PlanContent({ plan }: { plan: Plan }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight text-white">
          {plan.name}
        </h3>
        {plan.highlighted ? (
          <span className="brand-gradient rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
            Most popular
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-end gap-2">
        <p className="text-4xl font-extrabold tracking-tight text-white">
          {plan.price}
        </p>
        <p className="pb-1 text-sm text-muted">{plan.period}</p>
      </div>

      <ul className="mt-7 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-body">
            <Check
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        withArrow
        variant={plan.highlighted ? "primary" : "secondary"}
        className="mt-8 w-full"
      >
        <Link href={plan.cta.href}>{plan.cta.label}</Link>
      </Button>
    </>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <Container>
        <motion.div {...fadeUp}>
          <SectionHeading eyebrow="Pricing" title="Simple plans." />

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) =>
              plan.highlighted ? (
                <div
                  key={plan.name}
                  className="brand-gradient h-full rounded-3xl p-px shadow-brand"
                >
                  <div className="flex h-full flex-col rounded-[calc(1.5rem_-_1px)] bg-surface p-7">
                    <PlanContent plan={plan} />
                  </div>
                </div>
              ) : (
                <Card key={plan.name} className="flex h-full flex-col p-7">
                  <PlanContent plan={plan} />
                </Card>
              ),
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
