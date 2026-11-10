"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    question: "What is digital signage?",
    answer:
      "Digital signage is the use of screens to show images, video, menus, and live updates. Crystagrid lets you manage that content remotely instead of changing each screen by hand.",
  },
  {
    question: "How do I pair a screen?",
    answer:
      "Open the Crystagrid player on your screen and enter the 6-digit code shown in your dashboard. Once paired, the screen appears in your account and can receive playlists.",
  },
  {
    question: "What devices are supported?",
    answer:
      "Crystagrid runs on Android-based displays and devices that can run the Crystagrid player. If you are unsure about a specific device, contact us and we will confirm before you roll it out.",
  },
  {
    question: "Can I schedule different content on different screens?",
    answer:
      "Yes. Screens can have their own playlists, so content can differ by location. Playlist item durations control how long each piece stays on screen.",
  },
  {
    question: "Is my media stored securely?",
    answer:
      "Your media is stored in the cloud and accessed through your authenticated Crystagrid account. Only users with access to your account can manage it.",
  },
  {
    question: "Can I manage multiple screens from one account?",
    answer:
      "Yes. One account can manage multiple screens. Agencies and multi-location teams can also use separate customer accounts to keep each client's screens and media apart.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faqs" className="py-24">
      <Container>
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="FAQs"
            title="Frequently asked questions"
          />

          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-white/10 bg-surface px-6 sm:px-8">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={faq.question}
                  className="border-b border-white/10 last:border-b-0"
                >
                  <button
                    type="button"
                    id={`faq-question-${index}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    onClick={() =>
                      setOpenIndex(isOpen ? null : index)
                    }
                    className="flex w-full items-center justify-between gap-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                  >
                    <span className="text-base font-semibold text-white sm:text-lg">
                      {faq.question}
                    </span>
                    <motion.span
                      aria-hidden="true"
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 text-brand-sky"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        key="content"
                        id={`faq-answer-${index}`}
                        role="region"
                        aria-labelledby={`faq-question-${index}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="pb-5 pr-10 text-sm leading-7 text-body sm:text-base">
                          {faq.answer}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
