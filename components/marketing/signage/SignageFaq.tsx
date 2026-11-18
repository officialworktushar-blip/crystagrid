"use client";

import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const FAQS = [
  {
    question: "What is digital signage?",
    answer:
      "It is a screen in a public place that plays full-screen content. Crystagrid places the screens, sets the orientation and fit, and plays your campaign in 10 second slots.",
  },
  {
    question: "How long is each ad?",
    answer:
      "Each slot is 10 seconds. You can add up to 10 images or videos and they play in order, again and again. Platinum campaigns play more often.",
  },
  {
    question: "Can I choose the screen shape and colour?",
    answer:
      "Yes. Pick from the shapes and colours shown above. The preview updates as you choose so you can see the frame and where it can be placed.",
  },
  {
    question: "Can I use both images and videos?",
    answer:
      "Yes. Mix images and videos in your slots. Your account manager helps set the order and makes sure everything fits the screen.",
  },
  {
    question: "How quickly can my content go live?",
    answer:
      "Your account manager can update your content any time, and new content reaches the screens within seconds.",
  },
  {
    question: "Do I need to buy or install a screen?",
    answer:
      "No. Crystagrid handles the screens and their placement across Dehradun. You choose your campaign and we take care of the rest.",
  },
];

export default function SignageFaq() {
  const reducedMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reduce = Boolean(reducedMotion);

  const revealProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: true } as const,
        transition: { duration: 0.6 },
      };

  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div {...revealProps} className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            FAQ
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            Good to know
          </h2>
        </motion.div>

        <motion.div {...revealProps} className="mt-14 space-y-3">
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <div
                key={faq.question}
                className="rounded-3xl border border-white/10 bg-[#0a1226]"
              >
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`signage-faq-panel-${index}`}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 rounded-3xl px-6 py-5 text-left text-base font-semibold text-white transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
                  >
                    <span>{faq.question}</span>
                    {open ? (
                      <Minus aria-hidden="true" className="h-5 w-5 shrink-0 text-sky-400" />
                    ) : (
                      <Plus aria-hidden="true" className="h-5 w-5 shrink-0 text-sky-400" />
                    )}
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      id={`signage-faq-panel-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-sm leading-relaxed text-[#94a3b8]">
                        {faq.answer}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
