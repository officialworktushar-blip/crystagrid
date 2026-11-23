export type MapTarget = {
  name: string;
  lat: number | null;
  lng: number | null;
};

const DEFAULT_QUERY = "Dehradun, Uttarakhand, India";
const DEFAULT_ZOOM = 12;
const COORD_ZOOM = 16;
const NAME_ZOOM = 15;

type ResolvedQuery = {
  query: string;
  queryWithoutLabel: string;
  zoom: number;
};

function hasCoords(target: MapTarget): target is MapTarget & { lat: number; lng: number } {
  return (
    target.lat !== null &&
    target.lng !== null &&
    Number.isFinite(target.lat) &&
    Number.isFinite(target.lng)
  );
}

function resolveQuery(target: MapTarget | null): ResolvedQuery {
  if (target === null) {
    return {
      query: DEFAULT_QUERY,
      queryWithoutLabel: DEFAULT_QUERY,
      zoom: DEFAULT_ZOOM,
    };
  }
  if (hasCoords(target)) {
    const coords = `${target.lat},${target.lng}`;
    return {
      query: `${coords}(${target.name})`,
      queryWithoutLabel: coords,
      zoom: COORD_ZOOM,
    };
  }
  const text = `${target.name}, Dehradun, Uttarakhand, India`;
  return {
    query: text,
    queryWithoutLabel: text,
    zoom: NAME_ZOOM,
  };
}

export function buildGoogleEmbedUrl(target: MapTarget | null): string {
  const { query, queryWithoutLabel, zoom } = resolveQuery(target);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  if (typeof key === "string" && key.length > 0) {
    return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(queryWithoutLabel)}&zoom=${zoom}&language=en`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=en&output=embed`;
}

export function buildGoogleMapsLink(target: MapTarget | null): string {
  let query = DEFAULT_QUERY;
  if (target !== null) {
    query = hasCoords(target)
      ? `${target.lat},${target.lng}`
      : `${target.name}, Dehradun, Uttarakhand, India`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
