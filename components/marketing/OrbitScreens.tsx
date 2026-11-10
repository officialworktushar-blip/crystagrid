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
  { gradient: "linear-gradient(145deg, #06b6d4 0%, #2563eb 100%)" },
  { gradient: "linear-gradient(145deg, #a855f7 0%, #ec4899 100%)" },
  { gradient: "linear-gradient(145deg, #f97316 0%, #ef4444 100%)" },
  { gradient: "linear-gradient(145deg, #14b8a6 0%, #22c55e 100%)" },
  { gradient: "linear-gradient(145deg, #6366f1 0%, #8b5cf6 100%)" },
  { gradient: "linear-gradient(145deg, #3b82f6 0%, #06b6d4 100%)" },
  { gradient: "linear-gradient(145deg, #d946ef 0%, #fb923c 100%)" },
];

const ANGLE_STEP = 360 / SCREENS.length;
const ROTATION_MS = 45_000;

function buildEdgeShadow(direction: 1 | -1) {
  const layers = Array.from({ length: 12 }, (_, index) => {
    const offset = index + 1;
    const color = index % 2 === 0 ? "#0c1630" : "#0b1429";

    return `${direction * offset}px ${offset}px 0 ${color}`;
  });

  return [
    ...layers,
    `${direction * 14}px 18px 32px rgba(2, 6, 18, 0.55)`,
    `${direction * 24}px 38px 70px rgba(2, 6, 18, 0.62)`,
    "0 0 48px rgba(30, 140, 255, 0.25)",
    "inset 1px 1px 0 rgba(180, 215, 255, 0.1)",
    "inset -1px -1px 0 rgba(0, 0, 0, 0.65)",
  ].join(", ");
}

const SHADOW_LEFT = buildEdgeShadow(-1);
const SHADOW_RIGHT = buildEdgeShadow(1);

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
    ([rad, radius]) => Math.sin(rad) * radius * 0.45,
  );
  const depth = useTransform(radians, (rad) => (Math.sin(rad) + 1) / 2);
  const scale = useTransform(depth, (value) => 0.65 + value * 0.5);
  const opacity = useTransform(depth, (value) => 0.35 + value * 0.65);
  const rotateY = useTransform(radians, (rad) => -Math.cos(rad) * 28);
  const rotateZ = useTransform(radians, (rad) => Math.cos(rad) * 4);
  const zIndex = useTransform(depth, (value) => Math.round(value * 10));
  const filter = useTransform(depth, (value) => {
    const blur = (1 - value) * 1.5;
    const brightness = 0.6 + value * 0.4;

    return `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(2)})`;
  });
  const boxShadow = useTransform(radians, (rad) =>
    Math.cos(rad) >= 0 ? SHADOW_LEFT : SHADOW_RIGHT,
  );
  const shadeOpacity = useTransform(depth, (value) => (1 - value) * 0.48);
  const contentOpacity = useTransform(depth, (value) => 0.4 + value * 0.6);

  return (
    <motion.div
      className="absolute left-1/2 top-[56%] h-[220px] w-[110px] rounded-[28px] md:top-[57%] md:h-[340px] md:w-[170px]"
      style={{
        x,
        y,
        scale,
        opacity,
        rotateX: 6,
        rotateY,
        rotateZ,
        zIndex,
        filter,
        boxShadow,
        transformStyle: "preserve-3d",
        transformOrigin: "center center",
      }}
      transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated}`}
    >
      <div
        className="relative h-full w-full rounded-[28px] p-2"
        style={{
          border: "1px solid rgba(120, 170, 255, 0.25)",
          background: "linear-gradient(145deg, #0a1226 0%, #101c3a 100%)",
          boxShadow:
            "inset 1px 1px 0 rgba(180, 215, 255, 0.12), inset -1px -1px 0 rgba(0, 0, 0, 0.65)",
          transformStyle: "preserve-3d",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-black">
          {screen.image ? (
            <Image
              src={screen.image}
              alt=""
              fill
              sizes="170px"
              className="object-cover"
            />
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{ backgroundImage: screen.gradient }}
              />
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/30 blur-3xl" />
              <div className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-white/20 blur-3xl" />
            </>
          )}

          <motion.div
            className="absolute inset-0 bg-[#02040a]"
            style={{ opacity: shadeOpacity }}
          />

          <motion.div
            className="absolute inset-0"
            style={{ opacity: contentOpacity }}
          >
            <div className="flex h-full flex-col items-center justify-center px-3 text-center">
              <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/15 backdrop-blur-sm md:mb-4 md:h-10 md:w-10">
                <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] md:h-2.5 md:w-2.5" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white md:text-sm">
                Your Ad Here
              </p>
              <p className="mt-1.5 text-[6px] uppercase tracking-[0.24em] text-white/65 md:text-[7px]">
                Premium DOOH
              </p>
            </div>

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-3 md:px-4 md:pb-4">
              <span className="text-[6px] font-semibold uppercase tracking-[0.2em] text-white/60 md:text-[7px]">
                Crystagrid
              </span>
              <span className="h-1 w-5 rounded-full bg-white/30 md:h-1.5 md:w-7" />
            </div>
          </motion.div>

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_28%,transparent_58%)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[20px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />
        </div>
      </div>
    </motion.div>
  );
}

export default function OrbitScreens() {
  const angle = useMotionValue(0);
  const radiusX = useMotionValue(520);
  const radiusY = useMotionValue(420);
  const prefersReducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion === true;

    if (prefersReducedMotion) {
      angle.set(0);
    }
  }, [angle, prefersReducedMotion]);

  useEffect(() => {
    function updateOrbit() {
      const width = window.innerWidth;
      const nextRadiusX =
        width < 768
          ? Math.min(width * 0.3, 320)
          : Math.min(width * 0.38, 620);

      radiusX.set(nextRadiusX);
      radiusY.set(nextRadiusX * 0.9);
    }

    updateOrbit();
    window.addEventListener("resize", updateOrbit);

    return () => window.removeEventListener("resize", updateOrbit);
  }, [radiusX, radiusY]);

  useAnimationFrame((_, delta) => {
    if (reducedMotionRef.current) {
      return;
    }

    const nextAngle = (angle.get() + (delta / ROTATION_MS) * 360) % 360;
    angle.set(nextAngle);
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ perspective: "1400px", perspectiveOrigin: "50% 48%" }}
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
