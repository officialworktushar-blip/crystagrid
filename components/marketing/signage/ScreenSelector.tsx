"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  DoorOpen,
  PanelBottom,
  Square,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import ImageSlot from "@/components/marketing/signage/ImageSlot";
import PlacementScene from "@/components/marketing/signage/PlacementScene";
import {
  COLORS,
  PLACEMENTS,
  SCREENS,
  SHOW_SIZES,
  imageFor,
  ratioLabel,
  type PlacementId,
} from "@/lib/signage-screens";

const PLACEMENT_ICONS: Record<PlacementId, LucideIcon> = {
  wall: Square,
  floor: PanelBottom,
  lift: DoorOpen,
};

const SCREEN_IDS = SCREENS.map((item) => item.id);
const COLOUR_IDS = COLORS.map((item) => item.id);
const PLACEMENT_IDS = PLACEMENTS.map((item) => item.id);

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050b1f]";

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
  const [placementId, setPlacementId] = useState<PlacementId>("wall");
  const shapeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const colourRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const placementRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const screen = SCREENS.find((item) => item.id === screenId) ?? SCREENS[0];
  const colour = COLORS.find((item) => item.id === colourId) ?? COLORS[0];
  if (!screen || !colour) return null;

  const placement = PLACEMENTS.find((item) => item.id === placementId);
  if (!placement) return null;

  const selectScreen = (id: string) => {
    const next = SCREENS.find((item) => item.id === id);
    if (!next) return;
    setScreenId(next.id);
    if (!next.placements.includes(placementId)) {
      setPlacementId(next.placements[0] ?? "wall");
    }
  };

  const selectColour = (id: string) => {
    if (COLORS.some((item) => item.id === id)) setColourId(id);
  };

  const selectPlacement = (id: string) => {
    const next = PLACEMENTS.find((item) => item.id === id);
    if (next) setPlacementId(next.id);
  };

  const placementLabels = screen.placements
    .map((id) => PLACEMENTS.find((item) => item.id === id)?.label ?? "")
    .filter((label) => label.length > 0);

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
            Select a shape and a colour, then see how it is placed.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <motion.div
            {...revealProps}
            className="rounded-3xl border border-white/10 bg-[#0a1226] p-6"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                Screen shape
              </p>
              <div role="radiogroup" aria-label="Screen shape" className="mt-4 grid gap-3 sm:grid-cols-2">
                {SCREENS.map((item, index) => {
                  const active = item.id === screen.id;
                  const miniW = item.ratio[0] === item.ratio[1] ? 18 : item.ratio[0] > item.ratio[1] ? 24 : 14;
                  const miniH = item.ratio[0] === item.ratio[1] ? 18 : item.ratio[0] > item.ratio[1] ? 14 : 24;
                  return (
                    <button
                      key={item.id}
                      ref={(node) => {
                        shapeRefs.current[index] = node;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      tabIndex={active ? 0 : -1}
                      onClick={() => selectScreen(item.id)}
                      onKeyDown={(event) =>
                        moveSelection(event, index, SCREEN_IDS, selectScreen, shapeRefs)
                      }
                      className={`relative rounded-2xl border p-4 text-left transition ${FOCUS_RING} ${
                        active
                          ? "border-sky-400/60 text-white"
                          : "border-white/10 text-slate-300 hover:border-sky-400/30"
                      }`}
                    >
                      {active ? (
                        <motion.span
                          aria-hidden="true"
                          layoutId="screen-shape-active"
                          className="absolute inset-0 rounded-2xl bg-sky-400/10"
                          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 28 }}
                        />
                      ) : null}
                      <span className="relative z-10 flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-1 block shrink-0 rounded-sm border border-sky-300/60"
                          style={{ width: miniW, height: miniH }}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{item.name}</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {ratioLabel(item.ratio)}
                          </span>
                        </span>
                        {active ? (
                          <Check aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-sky-400" />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                Colour
              </p>
              <div role="radiogroup" aria-label="Screen colour" className="mt-4 flex flex-wrap gap-3">
                {COLORS.map((item, index) => {
                  const active = item.id === colour.id;
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
                      tabIndex={active ? 0 : -1}
                      onClick={() => selectColour(item.id)}
                      onKeyDown={(event) =>
                        moveSelection(event, index, COLOUR_IDS, selectColour, colourRefs)
                      }
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${FOCUS_RING} ${
                        active
                          ? "border-sky-400/60 bg-sky-400/10 text-white"
                          : "border-white/10 text-slate-300 hover:border-sky-400/30"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/30"
                        style={{ background: item.bezel }}
                      >
                        {active ? <Check className="h-3.5 w-3.5 text-sky-300" strokeWidth={3} /> : null}
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                Placement
              </p>
              <div role="radiogroup" aria-label="Screen placement" className="mt-4 grid gap-3 sm:grid-cols-3">
                {PLACEMENTS.map((item, index) => {
                  const supported = screen.placements.includes(item.id);
                  const active = placementId === item.id;
                  const Icon = PLACEMENT_ICONS[item.id];
                  return (
                    <button
                      key={item.id}
                      ref={(node) => {
                        placementRefs.current[index] = node;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={active && supported}
                      aria-label={item.label}
                      disabled={!supported}
                      tabIndex={active && supported ? 0 : -1}
                      onClick={() => selectPlacement(item.id)}
                      onKeyDown={(event) =>
                        moveSelection(event, index, PLACEMENT_IDS, selectPlacement, placementRefs)
                      }
                      title={supported ? item.description : "Not offered for this shape"}
                      className={`relative rounded-2xl border p-3 text-center transition ${FOCUS_RING} ${
                        !supported
                          ? "cursor-not-allowed border-white/5 text-slate-600"
                          : active
                            ? "border-sky-400/60 text-white"
                            : "border-white/10 text-slate-300 hover:border-sky-400/30"
                      }`}
                    >
                      {active && supported ? (
                        <motion.span
                          aria-hidden="true"
                          layoutId="placement-active"
                          className="absolute inset-0 rounded-2xl bg-sky-400/10"
                          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 28 }}
                        />
                      ) : null}
                      <span className="relative z-10 flex flex-col items-center gap-2">
                        <Icon className="h-5 w-5" strokeWidth={1.8} />
                        <span className="text-xs font-medium leading-tight">{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${screen.id}-${colour.id}-${placement.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={reduce ? { duration: 0 } : { duration: 0.25 }}
                className="mt-8 rounded-2xl border border-white/10 bg-[#050b1f] p-5"
              >
                <h3 className="text-lg font-semibold text-white">{screen.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{screen.description}</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Ratio</dt>
                    <dd className="text-right text-slate-200">{ratioLabel(screen.ratio)}</dd>
                  </div>
                  {SHOW_SIZES ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Size</dt>
                      <dd className="text-right text-slate-200">{screen.diagonalInches} inch</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Fits</dt>
                    <dd className="text-right text-slate-200">{placementLabels.join(", ")}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">{placement.description}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {screen.installNotes[placement.id]}
                </p>
                <div className="mt-4">
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
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/contact?screen=${encodeURIComponent(screen.id)}&color=${encodeURIComponent(colour.id)}`}
                    className={`brand-gradient inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 ${FOCUS_RING}`}
                  >
                    Ask about this screen
                  </Link>
                  <Link
                    href="/book"
                    className={`inline-flex items-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 ${FOCUS_RING}`}
                  >
                    Book CrystaGrid Ads
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <motion.div {...revealProps} className="min-w-0">
            <div className="rounded-[36px] border border-white/10 bg-[#0a1226] p-4">
              <div className="aspect-[8/5] w-full overflow-hidden rounded-3xl border border-white/5 bg-[#050b1f]">
                <PlacementScene screen={screen} colour={colour} placementId={placement.id} />
              </div>
              <p className="sr-only">
                {`Preview of ${screen.name} in ${colour.label}, ${placement.label}`}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((index) => {
                  const src = index === 0 ? imageFor(screen, colour.id) : index === 1 ? screen.images.installed : null;
                  const hint =
                    index === 0
                      ? `public/signage/${screen.id}-${colour.id}.png`
                      : index === 1
                        ? `public/signage/${screen.id}-installed.jpg`
                        : "public/signage/detail.png";
                  return (
                    <div
                      key={index}
                      className="aspect-square overflow-hidden rounded-2xl border border-white/10"
                    >
                      <ImageSlot
                        src={src}
                        alt={`${screen.name} mockup ${index + 1}`}
                        hint={hint}
                      />
                    </div>
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
