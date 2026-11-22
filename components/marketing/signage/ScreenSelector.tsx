"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Building,
  Check,
  Coffee,
  DoorOpen,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import ImageSlot from "@/components/marketing/signage/ImageSlot";
import { COLORS, SCREENS, imageFor } from "@/lib/signage-screens";

const SCREEN_IDS = SCREENS.map((item) => item.id);
const COLOUR_IDS = COLORS.map((item) => item.id);

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050b1f]";

const HELPER_ITEMS: { id: string; icon: LucideIcon; text: string }[] = [
  { id: "floor", icon: Building, text: "Open floor or showroom? Choose Floor." },
  { id: "board", icon: Coffee, text: "Cafe or shop entrance? Choose Board." },
  { id: "lift", icon: DoorOpen, text: "Lift lobby or corridor? Choose Lift." },
];

function moveSelection(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  index: number,
  ids: string[],
  select: (id: string) => void,
  refs: { current: (HTMLButtonElement | null)[] },
) {
  let nextIndex = index;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (index + 1) % ids.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (index - 1 + ids.length) % ids.length;
  } else {
    return;
  }
  event.preventDefault();
  const nextId = ids[nextIndex];
  if (nextId !== undefined) {
    select(nextId);
    refs.current[nextIndex]?.focus();
  }
}

export default function ScreenSelector() {
  const reducedMotion = useReducedMotion();
  const reduce = Boolean(reducedMotion);
  const [screenId, setScreenId] = useState(SCREENS[0]?.id ?? "");
  const [colourId, setColourId] = useState(COLORS[0]?.id ?? "");
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const screenRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const colourRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rawRotateX = useTransform(pointerY, [-0.5, 0.5], [3, -3]);
  const rawRotateY = useTransform(pointerX, [-0.5, 0.5], [-3, 3]);
  const rotateX = useSpring(rawRotateX, { stiffness: 180, damping: 22 });
  const rotateY = useSpring(rawRotateY, { stiffness: 180, damping: 22 });

  useEffect(() => {
    SCREENS.forEach((item) => {
      COLORS.forEach((option) => {
        const src = imageFor(item, option.id);
        if (src) {
          const preload = new Image();
          preload.src = src;
        }
      });
    });
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    const update = () => setTiltEnabled(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const screen = SCREENS.find((item) => item.id === screenId) ?? SCREENS[0];
  const colour = COLORS.find((item) => item.id === colourId) ?? COLORS[0];
  if (!screen || !colour) return null;

  const tilt = !reduce && tiltEnabled;
  const selectedSrc = imageFor(screen, colour.id);

  const selectScreen = (id: string) => {
    if (SCREENS.some((item) => item.id === id)) setScreenId(id);
  };

  const selectColour = (id: string) => {
    if (COLORS.some((item) => item.id === id)) setColourId(id);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!tilt || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const resetTilt = () => {
    pointerX.set(0);
    pointerY.set(0);
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
    <section id="choose-screen" className="scroll-mt-28 bg-[#050b1f] py-24">
      <div className="mx-auto max-w-[1540px] px-6">
        <motion.div {...revealProps} className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            Choose your screen
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            Pick the screen that fits your space
          </h2>
          <p className="mt-4 text-lg text-[#94a3b8]">
            Choose a type and a colour to see how it looks in a real space.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-10 lg:grid-cols-12">
          <motion.div
            {...revealProps}
            className="order-2 min-w-0 lg:order-1 lg:col-span-5"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                {"1  Screen type"}
              </p>
              <div
                role="radiogroup"
                aria-label="Screen type"
                className="mt-4 grid gap-3"
              >
                {SCREENS.map((item, index) => {
                  const active = item.id === screen.id;
                  const src = imageFor(item, colour.id);
                  return (
                    <button
                      key={item.id}
                      ref={(node) => {
                        screenRefs.current[index] = node;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      tabIndex={active ? 0 : -1}
                      onClick={() => selectScreen(item.id)}
                      onKeyDown={(event) =>
                        moveSelection(event, index, SCREEN_IDS, selectScreen, screenRefs)
                      }
                      className={`relative rounded-2xl border p-3 text-left transition ${FOCUS_RING} ${
                        active
                          ? "border-sky-400 bg-sky-400/10 shadow-[0_0_28px_rgba(56,189,248,0.2)]"
                          : "border-white/10 bg-white/[0.02] hover:border-sky-400/30"
                      }`}
                    >
                      {active ? (
                        <motion.span
                          aria-hidden="true"
                          layoutId="screen-type-active"
                          className="absolute inset-0 rounded-2xl bg-sky-400/10"
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { type: "spring", stiffness: 300, damping: 28 }
                          }
                        />
                      ) : null}
                      <span className="relative z-10 flex items-center gap-4">
                        <span className="block h-24 w-[72px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0f1b3a]">
                          <ImageSlot
                            src={src}
                            alt={`${item.name} screen in ${colour.label}`}
                            hint={src ?? undefined}
                          />
                        </span>
                        <span className="min-w-0">
                          <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                          <span className="mt-1 block text-sm text-[#94a3b8]">
                            {item.tagline}
                          </span>
                        </span>
                        {active ? (
                          <Check
                            aria-hidden="true"
                            className="ml-auto h-5 w-5 shrink-0 text-sky-400"
                          />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                {"2  Colour"}
              </p>
              <div
                role="radiogroup"
                aria-label="Screen colour"
                className="mt-4 flex flex-wrap gap-8"
              >
                {COLORS.map((item, index) => {
                  const active = item.id === colour.id;
                  const missing = imageFor(screen, item.id) === null;
                  return (
                    <button
                      key={item.id}
                      ref={(node) => {
                        colourRefs.current[index] = node;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`${item.label} colour`}
                      title={missing ? "Photo coming soon" : undefined}
                      tabIndex={active ? 0 : -1}
                      onClick={() => selectColour(item.id)}
                      onKeyDown={(event) =>
                        moveSelection(event, index, COLOUR_IDS, selectColour, colourRefs)
                      }
                      className={`flex flex-col items-center gap-2 rounded-xl p-1 transition ${FOCUS_RING}`}
                    >
                      <span className="relative">
                        <span
                          aria-hidden="true"
                          className={`relative flex h-11 w-11 items-center justify-center rounded-full ring-2 ${
                            active ? "ring-sky-400" : "ring-white/20"
                          }`}
                          style={{ background: item.bezel }}
                        >
                          {active ? (
                            <Check
                              className="h-5 w-5 text-sky-300"
                              strokeWidth={3}
                              aria-hidden="true"
                            />
                          ) : null}
                        </span>
                        {missing ? (
                          <span
                            aria-hidden="true"
                            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#050b1f]"
                          />
                        ) : null}
                      </span>
                      <span
                        className={`text-sm ${active ? "font-semibold text-white" : "text-slate-300"}`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${screen.id}-${colour.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={reduce ? { duration: 0 } : { duration: 0.25 }}
                className="mt-8 rounded-2xl border border-white/10 bg-[#0a1226] p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">{screen.name}</h3>
                  <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                    {screen.placementLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
                  {screen.description}
                </p>
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Best for
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {screen.bestFor.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-[#94a3b8]">
                  <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                  <span>{screen.installNote}</span>
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/contact?screen=${encodeURIComponent(screen.id)}&color=${encodeURIComponent(colour.id)}`}
                    className={`inline-flex items-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 ${FOCUS_RING}`}
                  >
                    Ask about this screen
                  </Link>
                  <Link
                    href="/book"
                    className={`brand-gradient inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 ${FOCUS_RING}`}
                  >
                    Book CrystaGrid Ads
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-sm font-semibold text-white">Not sure which one?</p>
              <div className="mt-2 grid gap-1">
                {HELPER_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectScreen(item.id)}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[#94a3b8] transition hover:text-white ${FOCUS_RING}`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-sky-400" />
                      <span>{item.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div
            {...revealProps}
            className="relative order-1 min-w-0 lg:sticky lg:top-28 lg:order-2 lg:col-span-7 lg:self-start"
          >
            <div aria-hidden="true" className="absolute -inset-6 rounded-[48px] blur-3xl">
              <div
                className="absolute inset-0 rounded-[48px] transition-opacity duration-[400ms]"
                style={{
                  background: "radial-gradient(circle at 50% 45%, rgba(14,165,233,0.25), transparent 70%)",
                  opacity: colour.id === "black" ? 1 : 0,
                }}
              />
              <div
                className="absolute inset-0 rounded-[48px] transition-opacity duration-[400ms]"
                style={{
                  background: "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.18), transparent 70%)",
                  opacity: colour.id === "white" ? 1 : 0,
                }}
              />
            </div>
            <div className="relative rounded-[36px] border border-white/10 bg-[#0a1226] p-4">
              <motion.div
                onPointerMove={handlePointerMove}
                onPointerLeave={resetTilt}
                style={{
                  width: "min(100%, 480px, 52.5vh)",
                  rotateX: tilt ? rotateX : 0,
                  rotateY: tilt ? rotateY : 0,
                  transformPerspective: 900,
                }}
                className="relative mx-auto aspect-[3/4] overflow-hidden rounded-[28px] bg-[#0f1b3a] shadow-[0_24px_70px_rgba(2,6,23,0.6)]"
              >
                <AnimatePresence>
                  <motion.div
                    key={`${screen.id}-${colour.id}`}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: reduce ? 1 : 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.45 }}
                  >
                    <ImageSlot
                      src={selectedSrc}
                      alt={`${screen.name} screen in ${colour.label}`}
                      hint={selectedSrc ?? undefined}
                    />
                  </motion.div>
                </AnimatePresence>
                <span className="absolute left-4 top-4 z-10 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                  {`${screen.name} - ${colour.label}`}
                </span>
              </motion.div>

              <div className="mt-5 flex justify-center gap-6">
                {COLORS.map((item) => {
                  const active = item.id === colour.id;
                  const src = imageFor(screen, item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`Show ${screen.name} in ${item.label}`}
                      aria-pressed={active}
                      onClick={() => selectColour(item.id)}
                      className={`flex flex-col items-center gap-2 rounded-xl p-1 ${FOCUS_RING}`}
                    >
                      <span
                        className={`block h-20 w-16 overflow-hidden rounded-xl border-2 bg-[#0f1b3a] ${
                          active ? "border-sky-400" : "border-white/10"
                        }`}
                      >
                        <ImageSlot
                          src={src}
                          alt={`${screen.name} screen in ${item.label}`}
                          hint={src ?? undefined}
                        />
                      </span>
                      <span
                        className={`text-xs ${active ? "font-semibold text-white" : "text-slate-400"}`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
