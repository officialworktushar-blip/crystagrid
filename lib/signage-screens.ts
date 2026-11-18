// EDIT THESE VALUES: the screens, ratios and colours below are PLACEHOLDERS, replace them with the real products before publishing.

export const SHOW_PLACEHOLDER_HINTS = true;
export const SHOW_SIZES = false;

export type PlacementId = "wall" | "floor" | "lift";

export type Colour = {
  id: string;
  label: string;
  bezel: string;
  body: string;
};

export type Placement = {
  id: PlacementId;
  label: string;
  description: string;
};

export type Screen = {
  id: string;
  name: string;
  ratio: [number, number];
  description: string;
  diagonalInches: number;
  placements: PlacementId[];
  bestFor: string[];
  installNotes: Record<PlacementId, string>;
  images: {
    front: Record<string, string | null>;
    installed: string | null;
  };
};

export const COLORS: Colour[] = [
  { id: "black", label: "Black", bezel: "#0b0f1a", body: "#1b2233" },
  { id: "white", label: "White", bezel: "#e8edf5", body: "#cbd5e1" },
];

export const PLACEMENTS: Placement[] = [
  {
    id: "wall",
    label: "Wall mounted",
    description: "Fixed flat on a wall at eye level.",
  },
  {
    id: "floor",
    label: "Floor standing",
    description: "A free-standing unit that can be moved when needed.",
  },
  {
    id: "lift",
    label: "Lift and pillar side",
    description: "Next to lift doors or on a pillar, where people wait.",
  },
];

export const SCREENS: Screen[] = [
  {
    id: "wide",
    name: "Wide Landscape",
    ratio: [16, 9],
    description: "A broad screen for everyday campaigns.",
    diagonalInches: 43,
    placements: ["wall", "floor"],
    bestFor: ["Shops", "Gyms & Salons"],
    installNotes: {
      wall: "Fixed flat on the shop wall at eye level.",
      floor: "Stands on a slim base where floor space allows.",
      lift: "Wall space beside the lift is limited for this shape.",
    },
    images: { front: { black: null, white: null }, installed: null },
  },
  {
    id: "tall",
    name: "Tall Portrait",
    ratio: [9, 16],
    description: "An upright screen for places where people pause.",
    diagonalInches: 43,
    placements: ["floor", "wall", "lift"],
    bestFor: ["Lift lobbies", "Offices & Lobbies"],
    installNotes: {
      wall: "Mounted upright on the lobby wall.",
      floor: "Placed on a weighted base near the waiting area.",
      lift: "Sits on the wall beside the lift doors.",
    },
    images: { front: { black: null, white: null }, installed: null },
  },
  {
    id: "classic",
    name: "Classic",
    ratio: [4, 3],
    description: "A familiar frame for everyday displays.",
    diagonalInches: 32,
    placements: ["wall"],
    bestFor: ["Cafes", "Counters"],
    installNotes: {
      wall: "Fixed above the counter at a comfortable viewing height.",
      floor: "A floor base is not offered for this shape.",
      lift: "A lift-side mount is not offered for this shape.",
    },
    images: { front: { black: null, white: null }, installed: null },
  },
  {
    id: "square",
    name: "Square",
    ratio: [1, 1],
    description: "An even frame for close-up spaces.",
    diagonalInches: 32,
    placements: ["wall", "floor"],
    bestFor: ["Reception desks", "Shops"],
    installNotes: {
      wall: "Mounted level with the reception wall.",
      floor: "Sits on a compact stand on the counter or floor.",
      lift: "A lift-side mount is not offered for this shape.",
    },
    images: { front: { black: null, white: null }, installed: null },
  },
];

export function ratioLabel(ratio: readonly [number, number]): string {
  return `${ratio[0]}:${ratio[1]}`;
}

export function isPortrait(ratio: readonly [number, number]): boolean {
  return ratio[1] > ratio[0];
}

export function imageFor(screen: Screen, colourId: string): string | null {
  const value = screen.images.front[colourId];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
