"use client";

import Image from "next/image";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef } from "react";

type ScreenCreative = {
  gradient: string;
  image?: string;
};

const SCREENS: ScreenCreative[] = [
  { gradient: "linear-gradient(160deg, #06b6d4 0%, #2563eb 100%)" },
  { gradient: "linear-gradient(160deg, #a855f7 0%, #ec4899 100%)" },
  { gradient: "linear-gradient(160deg, #f97316 0%, #ef4444 100%)" },
  { gradient: "linear-gradient(160deg, #14b8a6 0%, #22c55e 100%)" },
  { gradient: "linear-gradient(160deg, #6366f1 0%, #8b5cf6 100%)" },
  { gradient: "linear-gradient(160deg, #3b82f6 0%, #06b6d4 100%)" },
  { gradient: "linear-gradient(160deg, #d946ef 0%, #fb923c 100%)" },
];

const ANGLE_STEP = 360 / SCREENS.length;
const INITIAL_ANGLE = 90;
const ROTATION_MS = 60_000;
const SLAB_DEPTHS = [3, 6, 9, 12];

type OrbitFrameProps = {
  screen: ScreenCreative;
  index: number;
  angle: MotionValue<number>;
  radiusX: MotionValue<number>;
  radiusY: MotionValue<number>;
};

function OrbitFrame({
  screen,
  index,
  angle,
  radiusX,
  radiusY,
}: OrbitFrameProps) {
  const frameAngle = useTransform(
    angle,
    (value) => value + index * ANGLE_STEP,
  );
  const radians = useTransform(
    frameAngle,
    (value) => (value * Math.PI) / 180,
  );

  const x = useTransform<number, number>(
    [radians, radiusX],
    ([rad, radius]) => Math.cos(rad) * radius,
  );
  const y = useTransform<number, number>(
    [radians, radiusY],
    ([rad, radius]) => Math.sin(rad) * radius,
  );

  const depth = useTransform(radians, (rad) => (Math.sin(rad) + 1) / 2);
  const scale = useTransform(depth, (value) => 0.8 + value * 0.45);
  const zIndex = useTransform(depth, (value) => Math.round(value * 10));
  const rotateY = useTransform(
    radians,
    (rad) =>
      -Math.cos(rad) * (30 + 45 * (1 - Math.abs(Math.sin(rad)))),
  );
  const rotateZ = useTransform(radians, (rad) => Math.cos(rad) * 3);
  const overlayOpacity = useTransform(depth, (value) => (1 - value) * 0.75);
  const contentOpacity = useTransform(
    depth,
    (value) => 0.25 + value * 0.75,
  );
  const glowOpacity = useTransform(depth, (value) => value * 0.35);

  return (
    <motion.div
      className="absolute left-1/2 top-[58%] w-[100px] md:w-[190px]"
      style={{
        x,
        y,
        scale,
        rotateX: 6,
        rotateY,
        rotateZ,
        zIndex,
        aspectRatio: "9 / 19.5",
        transformStyle: "preserve-3d",
        transformOrigin: "center center",
      }}
      transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated}`}
    >
      <div
        className="pointer-events-none absolute -inset-2 rounded-[32px] bg-black/80 blur-2xl"
        style={{ transform: "translateZ(-16px)" }}
      />

      <motion.div
        className="pointer-events-none absolute -inset-8 rounded-[40px] bg-sky-500/40 blur-3xl"
        style={{ opacity: glowOpacity, transform: "translateZ(-18px)" }}
      />

      {SLAB_DEPTHS.map((slabDepth) => (
        <div
          key={slabDepth}
          className="absolute inset-0 rounded-[26px]"
          style={{
            transform: `translateZ(-${slabDepth}px)`,
            background:
              "linear-gradient(160deg, #08102a 0%, #0b1634 100%)",
          }}
        />
      ))}

      <div
        className="absolute inset-0 rounded-[26px] p-[9px]"
        style={{
          background: "linear-gradient(160deg, #16275a 0%, #0a1430 100%)",
          border: "1px solid rgba(110, 160, 255, 0.3)",
        }}
      >
        <div className="pointer-events-none absolute left-[12px] top-[5px] h-px w-[42%] bg-gradient-to-r from-white/35 via-white/10 to-transparent" />

        <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-black">
          {screen.image ? (
            <Image
              src={screen.image}
              alt=""
              fill
              sizes="(max-width: 767px) 100px, 190px"
              className="object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ backgroundImage: screen.gradient }}
            />
          )}

          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />

          <motion.div
            className="absolute inset-0 bg-[#02040a]"
            style={{ opacity: overlayOpacity }}
          />

          <motion.div
            className="absolute inset-0"
            style={{ opacity: contentOpacity }}
          >
            <div className="flex h-full flex-col items-center justify-center px-3 text-center">
              <p className="text-[11px] font-extrabold uppercase leading-tight tracking-[0.08em] text-white md:text-xl">
                Your Ad Here
              </p>
            </div>

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center px-3 pb-3 md:pb-4">
              <span className="text-[5px] font-semibold uppercase tracking-[0.2em] text-white/70 md:text-[7px]">
                Crystagrid
              </span>
            </div>

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_28%,transparent_58%)]" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default function OrbitScreens() {
  const containerRef = useRef<HTMLDivElement>(null);
  const angle = useMotionValue(INITIAL_ANGLE);
  const radiusX = useMotionValue(0);
  const radiusY = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion === true;

    if (prefersReducedMotion) {
      angle.set(INITIAL_ANGLE);
    }
  }, [angle, prefersReducedMotion]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const updateRadius = (width: number, height: number) => {
      const isMobile = width < 768;

      radiusX.set(
        isMobile ? width * 0.4 : Math.min(width * 0.33, 640),
      );
      radiusY.set(
        isMobile ? height * 0.18 : Math.min(height * 0.3, 300),
      );
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      updateRadius(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(container);

    const rect = container.getBoundingClientRect();
    updateRadius(rect.width, rect.height);

    return () => observer.disconnect();
  }, [radiusX, radiusY]);

  useAnimationFrame((_, delta) => {
    if (reducedMotionRef.current) {
      return;
    }

    angle.set((angle.get() + (delta / ROTATION_MS) * 360) % 360);
  });

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ perspective: "1400px" }}
    >
      <div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {SCREENS.map((screen, index) => (
          <OrbitFrame
            key={index}
            screen={screen}
            index={index}
            angle={angle}
            radiusX={radiusX}
            radiusY={radiusY}
          />
        ))}
      </div>
    </div>
  );
}
