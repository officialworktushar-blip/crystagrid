export type MapPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  major: boolean;
  propertyNames: string[];
  propertiesCount: number;
  screensCount: number;
  onlineCount: number;
};

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const basePlaces = [
  { name: "Clock Tower (Ghanta Ghar)", lat: 30.3244, lng: 78.0420, major: true },
  { name: "Paltan Bazaar", lat: 30.3238, lng: 78.0392, major: false },
  { name: "Rajpur Road", lat: 30.3520, lng: 78.0640, major: true },
  { name: "Race Course", lat: 30.3120, lng: 78.0460, major: false },
  { name: "Sahastradhara Road", lat: 30.3570, lng: 78.0990, major: false },
  { name: "ISBT", lat: 30.3055, lng: 77.9955, major: true },
  { name: "Mussoorie Road", lat: 30.3985, lng: 78.0950, major: false },
  { name: "Dalanwala", lat: 30.3300, lng: 78.0510, major: false },
  { name: "Ballupur", lat: 30.3330, lng: 78.0140, major: false },
  { name: "Premnagar", lat: 30.3170, lng: 77.9780, major: false },
  { name: "Haridwar Road", lat: 30.2950, lng: 78.0200, major: false },
  { name: "Clement Town", lat: 30.2610, lng: 78.0060, major: false },
] as const;

export const DEFAULT_PLACES: MapPlace[] = basePlaces.map((place) => ({
  id: slug(place.name),
  name: place.name,
  lat: place.lat,
  lng: place.lng,
  major: place.major,
  propertyNames: [],
  propertiesCount: 0,
  screensCount: 0,
  onlineCount: 0,
}));
