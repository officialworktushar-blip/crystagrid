"use client";

import { motion, useReducedMotion } from "framer-motion";
import ImageSlot from "@/components/marketing/signage/ImageSlot";

type ScreenFrameProps = {
  ratio: [number, number];
  colour: { bezel: string; body: string };
  width: number;
  imageSrc?: string | null;
  hint?: string;
  demo?: boolean;
};

export default function ScreenFrame({
  ratio,
  colour,
  width,
  imageSrc = null,
  hint,
  demo = false,
}: ScreenFrameProps) {
  const reducedMotion = useReducedMotion();
  const height = (width * ratio[1]) / ratio[0];
  const padding = Math.max(6, Math.round(width * 0.03));
  const radius = Math.max(8, Math.round((14 * width) / 210));
  const safeImage = typeof imageSrc === "string" ? imageSrc : null;
  const frameTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 140, damping: 20 };

  return (
    <motion.div
      initial={false}
      animate={{ width, height }}
      transition={frameTransition}
      className="shrink-0"
    >
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          borderRadius: radius,
          padding,
          background: colour.bezel,
          boxShadow: "0 24px 60px -20px rgba(14,165,233,0.55)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/20"
        />
        <div
          className="relative h-full w-full overflow-hidden rounded-xl"
          style={{ background: colour.body }}
        >
          {safeImage ? (
            <ImageSlot
              src={safeImage}
              alt="Screen mockup"
              hint={hint ?? "public/signage/front.png"}
            />
          ) : demo ? (
            <DemoAd reducedMotion={Boolean(reducedMotion)} />
          ) : (
            <ImageSlot
              src={null}
              alt="Screen mockup coming soon"
              hint={hint ?? "public/signage/front.png"}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DemoAd({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      className="flex h-full w-full flex-col items-center justify-center gap-2"
      style={{
        backgroundImage:
          "linear-gradient(110deg, #0b1a3a 0%, #1b3a6b 45%, #0b1a3a 90%)",
        backgroundSize: "200% 100%",
      }}
      animate={
        reducedMotion
          ? undefined
          : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
      }
      transition={
        reducedMotion
          ? undefined
          : { duration: 10, ease: "linear", repeat: Infinity }
      }
    >
      <motion.div
        aria-hidden="true"
        className="h-1.5 w-2/3 rounded-full bg-sky-300/50"
        animate={reducedMotion ? undefined : { opacity: [0.35, 0.9, 0.35] }}
        transition={reducedMotion ? undefined : { duration: 3, repeat: Infinity }}
      />
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">
        Your ad
      </span>
      <motion.div
        aria-hidden="true"
        className="h-1.5 w-1/2 rounded-full bg-sky-300/40"
        animate={reducedMotion ? undefined : { opacity: [0.9, 0.35, 0.9] }}
        transition={reducedMotion ? undefined : { duration: 3, repeat: Infinity }}
      />
    </motion.div>
  );
}
