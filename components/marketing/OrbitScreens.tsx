"use client";

import { cn } from "@/lib/utils";

const SCREEN_COUNT = 7;
const ORBIT_RADIUS = 36;

const screenThemes = [
  "from-cyan-400/25 to-blue-600/5",
  "from-blue-500/25 to-indigo-600/5",
  "from-sky-400/25 to-cyan-600/5",
  "from-indigo-500/25 to-blue-700/5",
  "from-cyan-300/20 to-sky-600/5",
  "from-blue-400/20 to-violet-600/5",
  "from-teal-300/20 to-cyan-600/5",
];

const screens = Array.from({ length: SCREEN_COUNT }, (_, index) => {
  const angle = (360 / SCREEN_COUNT) * index - 90;
  const radians = (angle * Math.PI) / 180;

  return {
    id: index,
    left: 50 + Math.cos(radians) * ORBIT_RADIUS,
    top: 50 + Math.sin(radians) * ORBIT_RADIUS,
  };
});

export default function OrbitScreens() {
  return (
    <div className="orbit-spin relative aspect-square w-[min(90vw,760px)]">
      {screens.map((screen) => (
        <div
          key={screen.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${screen.left}%`, top: `${screen.top}%` }}
        >
          <div className="orbit-counter-spin">
            <div className="flex flex-col items-center">
              <div className="relative h-[clamp(52px,8vw,96px)] w-[clamp(80px,12vw,148px)] overflow-hidden rounded-[10px] border border-cyan-300/30 bg-[#080b12]/90 shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)]">
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br",
                    screenThemes[screen.id],
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" />
                <div className="absolute inset-1.5 rounded-[7px] border border-white/5 bg-[#05060a]/40" />
                <div className="absolute left-3 top-3 h-1 w-8 rounded-full bg-white/20" />
                <div className="absolute left-3 top-5 h-1 w-12 rounded-full bg-white/10" />
                <div className="absolute bottom-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-cyan-300/80 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <div className="absolute inset-0 rounded-[10px] ring-1 ring-inset ring-white/5" />
              </div>
              <div className="h-1.5 w-7 rounded-b-sm bg-white/10" />
              <div className="h-1 w-10 rounded-full bg-white/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
