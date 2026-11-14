import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import ContactForm from "@/components/marketing/ContactForm";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Contact — Talk to Crystagrid",
  description:
    "Talk to the Crystagrid team about digital signage, menu boards, corporate displays, and screen networks.",
};

export default function ContactPage() {
  return (
    <section className="pb-24 pt-48 sm:pt-56">
      <Container>
        <SectionHeading
          eyebrow="Contact"
          title="Talk to us"
          highlight="to us"
          subtitle="Tell us about your screens, locations, or the experience you want to build. Our team will help you find the right setup."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
          <div className="lg:pt-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
              Get in touch
            </p>
            <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
              Tell us what you want on screen.
            </h3>
            <p className="mt-4 text-base leading-7 text-body">
              Whether you are outfitting a single venue or managing a national
              network, we can walk you through setup, playlists, and live
              screen control.
            </p>

            <div className="mt-8 space-y-3">
              <a
                href="mailto:hello@crystagrid.com"
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition duration-200 hover:border-sky-500/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-brand-sky">
                  <Mail aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-muted">
                    Email
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-white">
                    hello@crystagrid.com
                  </span>
                </span>
              </a>

              <a
                href="tel:+910000000000"
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition duration-200 hover:border-sky-500/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-brand-sky">
                  <Phone aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-muted">
                    Phone
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-white">
                    +91 00000 00000
                  </span>
                </span>
              </a>
            </div>
          </div>

          <ContactForm />
        </div>
      </Container>
    </section>
  );
}
