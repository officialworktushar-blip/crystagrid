"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PLACEMENTS, type Colour, type PlacementId, type Screen } from "@/lib/signage-screens";

type PlacementSceneProps = {
  screen: Screen;
  colour: Colour;
  placementId: PlacementId;
};

export default function PlacementScene({ screen, colour, placementId }: PlacementSceneProps) {
  const reducedMotion = useReducedMotion();
  const reduce = Boolean(reducedMotion);
  const placement = PLACEMENTS.find((item) => item.id === placementId);
  const label = placement ? placement.label : "";
  const rw = screen.ratio[0];
  const rh = screen.ratio[1];
  const diagonalCm = screen.diagonalInches * 2.54;
  const norm = Math.sqrt(rw * rw + rh * rh);
  let w = (diagonalCm * rw * 1.9) / norm;
  let h = (diagonalCm * rh * 1.9) / norm;
  const maxH = 230 * 1.9;
  const maxW = 400;
  if (h > maxH || w > maxW) {
    const scale = Math.min(maxH / h, maxW / w);
    w *= scale;
    h *= scale;
  }

  const floorY = 470;
  let x = 330;
  let y = 185 - h / 2;
  if (placementId === "floor") {
    y = floorY - 25 * 1.9 - h;
  } else if (placementId === "lift") {
    x = 560;
  }

  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 140, damping: 20 };

  return (
    <svg
      viewBox="0 0 800 500"
      role="img"
      aria-label={`${screen.name} in ${colour.label}, ${label}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="signage-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#13244a" />
          <stop offset="100%" stopColor="#0f1b3a" />
        </linearGradient>
        <filter id="signage-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      <rect x="0" y="0" width="800" height="470" fill="url(#signage-wall)" />
      <rect x="0" y="470" width="800" height="30" fill="#0a1226" />

      {placementId === "lift" ? (
        <g>
          <rect x="120" y="80" width="110" height="390" rx="4" fill="#94a3b8" />
          <rect x="240" y="80" width="110" height="390" rx="4" fill="#94a3b8" />
          <rect x="230" y="80" width="10" height="390" fill="#475569" />
          <circle cx="375" cy="250" r="7" fill="#cbd5e1" />
        </g>
      ) : null}

      <motion.g
        key={`person-${placementId}`}
        initial={reduce ? false : { opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.5 }}
      >
        <motion.g
          style={{ transformOrigin: "667px 470px" }}
          animate={reduce ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={reduce ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx="667" cy="210" r="20" fill="#334155" />
          <rect x="641" y="234" width="52" height="196" rx="24" fill="#334155" />
        </motion.g>
      </motion.g>

      <motion.rect
        initial={false}
        animate={{ x: x - 8, y: y - 8, width: w + 16, height: h + 16 }}
        transition={spring}
        rx="18"
        fill="#38bdf8"
        opacity="0.18"
        filter="url(#signage-glow)"
      />
      <motion.rect
        initial={false}
        animate={{ x, y, width: w, height: h }}
        transition={spring}
        rx="6"
        fill={colour.bezel}
      />
      <motion.rect
        initial={false}
        animate={{ x: x + 5, y: y + 5, width: Math.max(0, w - 10), height: Math.max(0, h - 10) }}
        transition={spring}
        rx="3"
        fill={colour.body}
      />

      {placementId === "floor" ? (
        <g>
          <rect x={x + w / 2 - 5} y={y + h} width="10" height={floorY - (y + h)} fill="#64748b" />
          <rect x={x + w / 2 - 45} y={floorY - 6} width="90" height="8" rx="4" fill="#64748b" />
        </g>
      ) : null}
    </svg>
  );
}
