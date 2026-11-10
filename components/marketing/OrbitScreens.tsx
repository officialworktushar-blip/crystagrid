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
  image?: string;
};

const FRAME_COUNT = 7;
const ANGLE_STEP = 360 / FRAME_COUNT;
const INITIAL_ANGLE = 90;

const RX_RATIO = 0.33;
const RY_RATIO = 0.30;
const MAX_RX = 640;
const MAX_RY = 300;
const CENTER_Y_RATIO = 0.58;
const ROTATE_SECONDS = 60;
const BASE_WIDTH = 190;

const MOBILE_BREAKPOINT = 768;
const MOBILE_RX_RATIO = 0.40;
const MOBILE_RY_RATIO = 0.18;
const MOBILE_BASE_WIDTH = 100;

const PERSPECTIVE = 1400;
const SLAB_DEPTHS = [3, 6, 9, 12, 15, 18] as const;
const SLAB_COLORS = [
  "#0d1a3b",
  "#0c1836",
  "#0b1631",
  "#09132c",
  "#081026",
  "#060d22",
] as const;

const FRONT_BEZEL_COLOR = "#0f1d42";
const FAR_BEZEL_COLOR = "#0a1330";
const FRONT_SCREEN_COLOR = "#060b18";
const FAR_SCREEN_COLOR = "#04070f";
const FAR_SLAB_COLOR = "#04070f";
const BEZEL_BORDER_COLOR = "#2a4a8f";
const FAR_BEZEL_BORDER_COLOR = "#15264d";
const RIM_COLOR = "#3a5fae";
const FAR_RIM_COLOR = "#1a2d5b";

const SCREENS: ScreenCreative[] = [{}, {}, {}, {}, {}, {}, {}];

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");

  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function mixHex(from: string, to: string, amount: number): string {
  const clamped = Math.min(1, Math.max(0, amount));
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);

  const channel = (index: number) =>
    Math.round(fromRgb[index] + (toRgb[index] - fromRgb[index]) * clamped);

  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function SlabEdge({
  depth,
  baseColor,
  slabDepth,
}: {
  depth: MotionValue<number>;
  baseColor: string;
  slabDepth: number;
}) {
  const backgroundColor = useTransform(depth, (value) =>
    mixHex(baseColor, FAR_SLAB_COLOR, 1 - value),
  );

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        transform: `translateZ(-${slabDepth}px)`,
        borderRadius: 28,
        backgroundColor,
      }}
    />
  );
}

type OrbitFrameProps = {
  screen: ScreenCreative;
  index: number;
  angle: MotionValue<number>;
  centerX: MotionValue<number>;
  centerY: MotionValue<number>;
  radiusX: MotionValue<number>;
  radiusY: MotionValue<number>;
  frameWidth: MotionValue<number>;
};

function OrbitFrame({
  screen,
  index,
  angle,
  centerX,
  centerY,
  radiusX,
  radiusY,
  frameWidth,
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
    [radians, radiusX, centerX],
    ([rad, rx, cx]) => cx + Math.cos(rad) * rx,
  );
  const y = useTransform<number, number>(
    [radians, radiusY, centerY],
    ([rad, ry, cy]) => cy + Math.sin(rad) * ry,
  );

  const depth = useTransform(radians, (rad) => (Math.sin(rad) + 1) / 2);
  const scale = useTransform(depth, (value) => 0.8 + value * 0.45);
  const zIndex = useTransform(depth, (value) => Math.round(value * 10));
  const rotateY = useTransform(
    radians,
    (rad) =>
      -Math.cos(rad) * (30 + 45 * (1 - Math.abs(Math.sin(rad)))),
  );
  const rotateZ = useTransform(radians, (rad) => Math.cos(rad) * 4);

  const bezelColor = useTransform(depth, (value) =>
    mixHex(FRONT_BEZEL_COLOR, FAR_BEZEL_COLOR, 1 - value),
  );
  const screenColor = useTransform(depth, (value) =>
    mixHex(FRONT_SCREEN_COLOR, FAR_SCREEN_COLOR, 1 - value),
  );
  const borderColor = useTransform(depth, (value) =>
    mixHex(BEZEL_BORDER_COLOR, FAR_BEZEL_BORDER_COLOR, 1 - value),
  );
  const rimColor = useTransform(depth, (value) =>
    mixHex(RIM_COLOR, FAR_RIM_COLOR, 1 - value),
  );

  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{
        x,
        y,
        zIndex,
        width: frameWidth,
        aspectRatio: "9 / 19.5",
        transformStyle: "preserve-3d",
      }}
      transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated}`}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          scale,
          borderRadius: 28,
          boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
        }}
      />

      <motion.div
        className="absolute inset-0"
        style={{
          scale,
          rotateX: 6,
          rotateY,
          rotateZ,
          transformStyle: "preserve-3d",
          transformOrigin: "center center",
        }}
      >
        {SLAB_DEPTHS.map((slabDepth, slabIndex) => (
          <SlabEdge
            key={slabDepth}
            depth={depth}
            baseColor={SLAB_COLORS[slabIndex]}
            slabDepth={slabDepth}
          />
        ))}

        <motion.div
          className="absolute inset-0 z-10"
          style={{
            boxSizing: "border-box",
            borderRadius: 28,
            backgroundColor: bezelColor,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor,
            padding: 10,
          }}
        >
          <motion.div
            className="pointer-events-none absolute"
            style={{
              inset: 1,
              borderRadius: 27,
              borderTopWidth: 1,
              borderRightWidth: 0,
              borderBottomWidth: 0,
              borderLeftWidth: 1,
              borderStyle: "solid",
              borderColor: rimColor,
            }}
          />

          <motion.div
            className="relative h-full w-full overflow-hidden"
            style={{
              borderRadius: 20,
              backgroundColor: screenColor,
            }}
          >
            {screen.image ? (
              <Image
                src={screen.image}
                alt=""
                fill
                sizes="(max-width: 767px) 100px, 190px"
                className="object-cover"
              />
            ) : null}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function OrbitScreens() {
  const containerRef = useRef<HTMLDivElement>(null);
  const angle = useMotionValue(INITIAL_ANGLE);
  const centerX = useMotionValue(0);
  const centerY = useMotionValue(0);
  const radiusX = useMotionValue(0);
  const radiusY = useMotionValue(0);
  const frameWidth = useMotionValue(BASE_WIDTH);
  const prefersReducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const isReduced = prefersReducedMotion === true;
    reducedMotionRef.current = isReduced;

    if (isReduced || ROTATE_SECONDS <= 0) {
      angle.set(INITIAL_ANGLE);
    }
  }, [angle, prefersReducedMotion]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const updateOrbit = (width: number, height: number) => {
      const isMobile = width < MOBILE_BREAKPOINT;

      centerX.set(width * 0.5);
      centerY.set(height * CENTER_Y_RATIO);
      radiusX.set(
        isMobile ? width * MOBILE_RX_RATIO : Math.min(width * RX_RATIO, MAX_RX),
      );
      radiusY.set(
        isMobile ? height * MOBILE_RY_RATIO : Math.min(height * RY_RATIO, MAX_RY),
      );
      frameWidth.set(isMobile ? MOBILE_BASE_WIDTH : BASE_WIDTH);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      updateOrbit(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(container);

    const rect = container.getBoundingClientRect();
    updateOrbit(rect.width, rect.height);

    return () => observer.disconnect();
  }, [centerX, centerY, frameWidth, radiusX, radiusY]);

  useAnimationFrame((_, delta) => {
    if (ROTATE_SECONDS <= 0 || reducedMotionRef.current) {
      return;
    }

    angle.set(
      (angle.get() + (delta / (ROTATE_SECONDS * 1000)) * 360) % 360,
    );
  });

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      style={{ perspective: `${PERSPECTIVE}px` }}
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
            centerX={centerX}
            centerY={centerY}
            radiusX={radiusX}
            radiusY={radiusY}
            frameWidth={frameWidth}
          />
        ))}
      </div>
    </div>
  );
}
