"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    question:
      "01. How can CrystaGrid be deployed across multiple residential properties?",
    answer:
      "CrystaGrid enables property owners and operators to connect digital displays across multiple residential communities through a centralized platform. Each property can be managed individually while remaining part of one connected advertising network.",
  },
  {
    question: "02. Can I manage screens across different locations from one dashboard?",
    answer:
      "Yes. CrystaGrid provides a centralized dashboard where you can organize, monitor, and manage connected screens across multiple properties and locations without needing separate management systems.",
  },
  {
    question: "03. How does CrystaGrid help monetize unused digital display spaces?",
    answer:
      "CrystaGrid helps transform strategically placed screens within residential properties into digital advertising opportunities. Property owners can make these spaces available for brand campaigns and explore new advertising revenue opportunities.",
  },
  {
    question: "04. Can advertising campaigns be customized for specific properties or audiences?",
    answer:
      "Yes. You can select specific screens and locations for individual campaigns. This allows advertising content to be distributed according to property, location, and campaign requirements rather than displaying the same content everywhere.",
  },
  {
    question: "05. What happens if a connected screen goes offline?",
    answer:
      "CrystaGrid provides screen visibility through its dashboard, allowing operators to identify online and offline displays and check their last-seen status. This helps teams identify connectivity issues and coordinate troubleshooting.",
  },
  {
    question: "06. Can the platform scale as our residential screen network expands?",
    answer:
      "Yes. CrystaGrid is designed to support centralized management as your network grows. You can add more connected screens and residential properties while continuing to manage your expanding network through the same platform.",
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
            title="Frequently Asked Questions"
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
