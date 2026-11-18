"use client";

import {
  Clock,
  MapPin,
  Monitor,
  Receipt,
  RefreshCw,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";

type Service = {
  title: string;
  text: string;
  icon: LucideIcon;
};

const SERVICES: Service[] = [
  {
    title: "Screens in the right places",
    text: "Our team installs screens at chosen properties across Dehradun, from lift lobbies to shops and offices.",
    icon: MapPin,
  },
  {
    title: "10-second slots",
    text: "Your ad plays in full-screen slots of 10 seconds, up to 10 slots in one loop.",
    icon: Clock,
  },
  {
    title: "Orientation and fit set for you",
    text: "We set the orientation and fit of every screen, so your content looks right on portrait and landscape displays.",
    icon: Monitor,
  },
  {
    title: "Content changes in seconds",
    text: "Your account manager can update your content any time, and new content reaches the screens within seconds.",
    icon: RefreshCw,
  },
  {
    title: "Clear booking",
    text: "Pick a package, set your dates and see the full price with GST before you book.",
    icon: Receipt,
  },
  {
    title: "A person to talk to",
    text: "Every customer gets an account manager who looks after content and playlists.",
    icon: User,
  },
];

export default function ServicesGrid() {
  const reducedMotion = useReducedMotion();
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const update = () => setTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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
      <div className="mx-auto max-w-[1540px] px-6">
        <motion.div {...revealProps} className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            What you get
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            Everything around the screen, taken care of
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((service, index) => (
            <ServiceCard
              key={service.title}
              service={service}
              index={index}
              revealProps={revealProps}
              tiltEnabled={!reduce && !touch}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type RevealProps = {
  initial?: { opacity: number; y: number };
  whileInView?: { opacity: number; y: number };
  viewport?: { once: boolean };
  transition?: { duration: number };
};

function ServiceCard({
  service,
  index,
  revealProps,
  tiltEnabled,
}: {
  service: Service;
  index: number;
  revealProps: RevealProps;
  tiltEnabled: boolean;
}) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useTransform(pointerY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(pointerX, [-0.5, 0.5], [-6, 6]);
  const Icon = service.icon;

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!tiltEnabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const resetTilt = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <motion.div
      {...revealProps}
      transition={revealProps.transition ? { duration: 0.6, delay: index * 0.08 } : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
      style={{
        rotateX: tiltEnabled ? rotateX : 0,
        rotateY: tiltEnabled ? rotateY : 0,
        transformPerspective: 900,
      }}
      className="rounded-3xl border border-white/10 bg-[#0a1226] p-6 transition-colors duration-200 hover:border-sky-400/40"
    >
      <span
        aria-hidden="true"
        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-400"
      >
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <h3 className="mt-6 text-xl font-semibold text-white">{service.title}</h3>
      <p className="mt-3 text-base leading-relaxed text-[#94a3b8]">{service.text}</p>
    </motion.div>
  );
}
