// EDIT THESE VALUES: the screen types, colours and photo paths below are the real products.

export const SHOW_PLACEHOLDER_HINTS = true;
export const SHOW_SIZES = false;

export type Colour = {
  id: string;
  label: string;
  bezel: string;
  body: string;
};

export type Screen = {
  id: string;
  name: string;
  tagline: string;
  placementLabel: string;
  description: string;
  bestFor: string[];
  installNote: string;
  heroColour: string;
  ratio?: [number, number] | null;
  images: {
    black: string | null;
    white: string | null;
  };
};

export const COLORS: Colour[] = [
  { id: "black", label: "Black", bezel: "#0b0f1a", body: "#1b2233" },
  { id: "white", label: "White", bezel: "#e8edf5", body: "#cbd5e1" },
];

export const SCREENS: Screen[] = [
  {
    id: "floor",
    name: "Floor",
    tagline: "Free-standing kiosk screen",
    placementLabel: "Floor standing",
    description:
      "A free-standing screen that stands on its own, ideal for open floors where people walk in and gather.",
    bestFor: ["Showrooms", "Malls and retail floors", "Reception areas"],
    installNote: "Stands on the floor, so it can be placed where footfall is highest.",
    heroColour: "black",
    ratio: null,
    images: { black: "/Floor_Black.webp", white: "/Floor_White.png" },
  },
  {
    id: "board",
    name: "Board",
    tagline: "A-frame style screen",
    placementLabel: "A-frame board",
    description:
      "A slim A-frame style screen that works like a digital offer or menu board at the entrance of a shop or cafe.",
    bestFor: ["Cafes and restaurants", "Shop entrances", "Salons and gyms"],
    installNote: "Stands on the floor near the entrance and can be moved when needed.",
    heroColour: "white",
    ratio: null,
    images: { black: "/Board_Black.webp", white: "/Board_White.webp" },
  },
  {
    id: "lift",
    name: "Lift",
    tagline: "Wall screen beside the lift",
    placementLabel: "Wall mounted by the lift",
    description:
      "A wall mounted screen placed next to the lift doors, where people wait for a few quiet seconds.",
    bestFor: ["Residential towers", "Office buildings", "Mall lift lobbies"],
    installNote: "Fixed on the wall beside the lift doors at eye level.",
    heroColour: "black",
    ratio: null,
    images: { black: "/Lift_Black.webp", white: "/Lift_White.webp" },
  },
];

export function ratioLabel(ratio: readonly [number, number] | null | undefined): string {
  if (!ratio) return "";
  return `${ratio[0]}:${ratio[1]}`;
}

export function isPortrait(ratio: readonly [number, number] | null | undefined): boolean {
  if (!ratio) return false;
  return ratio[1] > ratio[0];
}

export function imageFor(screen: Screen, colourId: string): string | null {
  if (colourId === "black") return screen.images.black;
  if (colourId === "white") return screen.images.white;
  return null;
}
