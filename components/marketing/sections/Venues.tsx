"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

type Venue = {
  id: string;
  title: string;
  text: string;
  image: string;
  alt: string;
};

const VENUES: Venue[] = [
  {
    id: "retail-stores",
    title: "Retail Stores",
    text: "Show your offers on screens inside shops and showrooms across Dehradun, right where people decide what to buy.",
    image: "/View_FreshMart.webp",
    alt: "Retail Stores",
  },
  {
    id: "offices-lobbies",
    title: "Offices & Lobbies",
    text: "Reach working professionals in reception areas and building lobbies while they walk in, wait and move around.",
    image: "/View_RS.webp",
    alt: "Offices & Lobbies",
  },
  {
    id: "gyms-salons",
    title: "Gyms & Salons",
    text: "Connect with health and lifestyle customers at gyms and salons, ideal for wellness, nutrition, fashion and beauty brands.",
    image: "/View_Tarya.webp",
    alt: "Gyms & Salons",
  },
  {
    id: "restaurants-cafes",
    title: "Restaurants & Cafes",
    text: "Put your message in front of diners and café visitors while they relax, wait and choose what to order next.",
    image: "/View_Car.webp",
    alt: "Restaurants & Cafes",
  },
];

export default function Venues() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const isInView = useInView(sectionRef, { amount: 0.2 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || hasInteracted || !isInView || isHovering || isFocusWithin) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % VENUES.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [reduce, hasInteracted, isInView, isHovering, isFocusWithin]);

  const activate = (index: number) => {
    setActiveIndex(index);
  };

  const handleCardHover = (index: number) => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      setActiveIndex(index);
    }
  };

  const handleClick = (index: number) => {
    setActiveIndex(index);
    setHasInteracted(true);
  };

  const revealProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: true } as const,
        transition: { duration: 0.6 },
      };

  return (
    <section
      id="venues"
      ref={sectionRef}
      className="relative scroll-mt-28 overflow-hidden border-t border-[#e8eef6] py-24"
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)",
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocusWithin(false);
        }
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 75% 50%, rgba(125,211,252,0.28), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1540px] px-6">
        <motion.div
          {...revealProps}
          className="mx-auto mb-14 flex max-w-3xl flex-col items-center text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1d6fff]">
            BUILT FOR
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-[#0b1220] md:text-5xl">
            Screens wherever your customers are.
          </h2>
        </motion.div>

        <motion.div
          {...revealProps}
          className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
        >
          <div
            role="tablist"
            aria-label="Venue types"
            className="flex flex-col gap-4"
          >
            {VENUES.map((venue, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={venue.id}
                  type="button"
                  role="tab"
                  id={`venue-tab-${venue.id}`}
                  aria-selected={isActive}
                  aria-controls="venues-panel"
                  onClick={() => handleClick(index)}
                  onMouseEnter={() => handleCardHover(index)}
                  onFocus={() => activate(index)}
                  className={`relative w-full overflow-hidden rounded-[28px] border px-8 py-7 text-left transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fff] ${
                    isActive
                      ? "border-[#7dd3fc]"
                      : "border-[#e3e9f2] bg-white hover:-translate-y-0.5 hover:border-[#bae6fd]"
                  }`}
                  style={
                    isActive
                      ? {
                          background:
                            "linear-gradient(135deg, #e8f6ff 0%, #ffffff 100%)",
                          boxShadow:
                            "0 12px 32px -12px rgba(14,165,233,0.35)",
                        }
                      : { backgroundColor: "#ffffff" }
                  }
                >
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 top-0 w-1 bg-[#0ea5e9]"
                    />
                  ) : null}

                  <span
                    className={`block text-2xl font-semibold leading-tight md:text-[30px] ${
                      isActive ? "text-[#0b8bc4]" : "text-[#0b1220]"
                    }`}
                  >
                    {venue.title}
                  </span>
                  <span className="mt-3 block text-base leading-relaxed text-[#475569] md:text-lg">
                    {venue.text}
                  </span>

                  {isActive ? (
                    <span className="mt-5 block overflow-hidden rounded-2xl lg:hidden">
                      <span
                        className="relative block w-full"
                        style={{ aspectRatio: "4 / 3" }}
                      >
                        <Image
                          src={venue.image}
                          alt={venue.alt}
                          fill
                          className="object-cover"
                          sizes="100vw"
                        />
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div
            id="venues-panel"
            role="tabpanel"
            aria-live="polite"
            aria-labelledby={`venue-tab-${VENUES[activeIndex].id}`}
            className="relative mx-auto hidden w-full max-w-[478px] overflow-hidden rounded-[40px] lg:block"
            style={{
              aspectRatio: "478 / 696",
              boxShadow: "0 30px 80px -20px rgba(14,165,233,0.35)",
            }}
          >
            {VENUES.map((venue, index) => {
              const isActive = index === activeIndex;

              return (
                <div
                  key={venue.id}
                  className={`absolute inset-0 ${reduce ? "" : "transition-opacity duration-500"}`}
                  style={{
                    opacity: isActive ? 1 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                  aria-hidden={!isActive}
                >
                  <Image
                    src={venue.image}
                    alt={venue.alt}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 478px, 0px"
                    priority={index === 0}
                  />
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
