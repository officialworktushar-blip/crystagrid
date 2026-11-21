"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";

const steps = [
  {
    title: "Connect Your Screen",
    description:
      "Pair your Android-powered display using a simple 6-digit activation code. Connect your screen to your CrystaGrid dashboard in minutes.",
  },
  {
    title: "Upload Your Content",
    description:
      "Build your media library with images and videos. Organize your advertising creatives and keep everything ready for publishing.",
  },
  {
    title: "Publish & Manage",
    description:
      "Create playlists, assign content to individual screens, and push updates in real time. Manage your connected displays from anywhere.",
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
    <section id="how-it-works" className="scroll-mt-28 py-24">
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
              Your screens. Your campaigns.{" "}
              <span className="text-brand-gradient">One platform.</span>
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-body sm:text-lg">
              Launch and manage your digital advertising screens without
              complicated setups. Connect your display, upload your creative
              content, and publish campaigns through one centralized dashboard.
            </p>

            <p className="mt-4 max-w-xl text-base leading-7 text-body sm:text-lg">
              No complex configurations. No manual content transfers. Just a
              simpler way to manage digital screens.
            </p>

            <div className="mt-8 space-y-5">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-400/30 bg-sky-400/10 text-sm font-semibold text-sky-400">
                    {String(index + 1).padStart(2, "0")}
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
              <Link href="/register">Start Free</Link>
            </Button>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-sky-500/10 blur-3xl" />
            <div className="relative">
              <Image
                src="/Home_MockUp.webp"
                alt="Crystagrid self-serve dashboard"
                width={1622}
                height={969}
                className="h-auto w-full"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
