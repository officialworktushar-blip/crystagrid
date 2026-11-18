export type ProjectedPoint = {
  id: string;
  x: number;
  y: number;
};

export type ProjectPlaceInput = {
  id: string;
  lat: number;
  lng: number;
};

export function projectPlaces(
  places: ProjectPlaceInput[],
  width: number,
  margin: number,
): { points: ProjectedPoint[]; width: number; height: number } {
  if (places.length === 0) {
    return { points: [], width, height: 640 };
  }

  const lats = places.map((p) => p.lat);
  const lngs = places.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latCenter = (minLat + maxLat) / 2;
  const lngCenter = (minLng + maxLng) / 2;
  const cosLat = Math.cos((latCenter * Math.PI) / 180);

  const projected = places.map((p) => ({
    id: p.id,
    px: (p.lng - lngCenter) * cosLat,
    py: -(p.lat - latCenter),
  }));

  let minX = Math.min(...projected.map((p) => p.px));
  let maxX = Math.max(...projected.map((p) => p.px));
  let minY = Math.min(...projected.map((p) => p.py));
  let maxY = Math.max(...projected.map((p) => p.py));

  const projW = Math.max(maxX - minX, 1e-6);
  const projH = Math.max(maxY - minY, 1e-6);

  const rawHeight = width * (projH / projW);
  const clampedHeight = Math.max(520, Math.min(860, rawHeight));

  const scale = Math.min(
    (width - margin * 2) / projW,
    (clampedHeight - margin * 2) / projH,
  );

  const offsetX = (width - projW * scale) / 2 - minX * scale;
  const offsetY = (clampedHeight - projH * scale) / 2 - minY * scale;

  return {
    points: projected.map((p) => ({
      id: p.id,
      x: p.px * scale + offsetX,
      y: p.py * scale + offsetY,
    })),
    width,
    height: clampedHeight,
  };
}

export type Point2D = [number, number];

function cross(o: Point2D, a: Point2D, b: Point2D): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

export function convexHull(points: Point2D[]): Point2D[] {
  const unique = Array.from(
    new Map(points.map((p) => [`${p[0].toFixed(6)},${p[1].toFixed(6)}`, p])).values(),
  );
  if (unique.length <= 1) return unique.slice();
  const sorted = unique.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lower: Point2D[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point2D[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function smoothClosedPath(points: Point2D[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0][0]} ${points[0][1]} Z`;
  }
  if (points.length === 2) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]} Z`;
  }

  let pts = points.slice();
  for (let iter = 0; iter < 3; iter++) {
    const next: Point2D[] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const q: Point2D = [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]];
      const r: Point2D = [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]];
      next.push(q, r);
    }
    pts = next;
  }

  const d = [`M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`];
  for (let i = 1; i < pts.length; i++) {
    d.push(`L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`);
  }
  d.push("Z");
  return d.join(" ");
}

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

export function bboxOf(points: Point2D[]): BBox {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = points[0][0];
  let minY = points[0][1];
  let maxX = points[0][0];
  let maxY = points[0][1];
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function outlinePath(
  sites: ProjectedPoint[],
  radius: number,
): { path: string; bbox: BBox } {
  if (sites.length === 0) {
    return { path: "", bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
  }
  if (sites.length === 1) {
    const s = sites[0];
    const circle: Point2D[] = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      circle.push([s.x + Math.cos(a) * radius, s.y + Math.sin(a) * radius]);
    }
    const hull = convexHull(circle);
    return { path: smoothClosedPath(hull), bbox: bboxOf(hull) };
  }

  const cloud: Point2D[] = [];
  for (const s of sites) {
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      cloud.push([s.x + Math.cos(a) * radius, s.y + Math.sin(a) * radius]);
    }
  }
  const hull = convexHull(cloud);
  return { path: smoothClosedPath(hull), bbox: bboxOf(hull) };
}

function polygonToPath(poly: Point2D[]): string {
  if (poly.length === 0) return "";
  const d = [`M ${poly[0][0].toFixed(2)} ${poly[0][1].toFixed(2)}`];
  for (let i = 1; i < poly.length; i++) {
    d.push(`L ${poly[i][0].toFixed(2)} ${poly[i][1].toFixed(2)}`);
  }
  d.push("Z");
  return d.join(" ");
}

function clipPolygon(
  polygon: Point2D[],
  a: number,
  b: number,
  c: number,
): Point2D[] {
  if (polygon.length === 0) return [];
  const inside = (p: Point2D) => a * p[0] + b * p[1] <= c + 1e-9;
  const intersect = (s: Point2D, e: Point2D): Point2D => {
    const ds = a * s[0] + b * s[1] - c;
    const de = a * e[0] + b * e[1] - c;
    const t = ds / (ds - de);
    return [s[0] + t * (e[0] - s[0]), s[1] + t * (e[1] - s[1])];
  };

  const output: Point2D[] = [];
  let prev = polygon[polygon.length - 1];
  let prevIn = inside(prev);
  for (const curr of polygon) {
    const currIn = inside(curr);
    if (currIn) {
      if (!prevIn) output.push(intersect(prev, curr));
      output.push(curr);
    } else if (prevIn) {
      output.push(intersect(prev, curr));
    }
    prev = curr;
    prevIn = currIn;
  }
  return output;
}

export function voronoiCells(
  sites: ProjectedPoint[],
  bounds: BBox,
): { id: string; polygon: Point2D[]; path: string }[] {
  const rect: Point2D[] = [
    [bounds.minX, bounds.minY],
    [bounds.maxX, bounds.minY],
    [bounds.maxX, bounds.maxY],
    [bounds.minX, bounds.maxY],
  ];

  const adjusted = sites.map((s, i) => {
    let x = s.x;
    let y = s.y;
    for (let j = 0; j < i; j++) {
      const o = adjusted[j];
      if (Math.abs(o.x - x) < 1e-6 && Math.abs(o.y - y) < 1e-6) {
        x += 0.01;
        y += 0.01;
      }
    }
    return { id: s.id, x, y };
  });

  return adjusted.map((si) => {
    let cell = rect.slice();
    for (const sj of adjusted) {
      if (si.id === sj.id) continue;
      const a = sj.x - si.x;
      const b = sj.y - si.y;
      const c = (sj.x * sj.x + sj.y * sj.y - si.x * si.x - si.y * si.y) / 2;
      cell = clipPolygon(cell, a, b, c);
      if (cell.length === 0) break;
    }
    return { id: si.id, polygon: cell, path: polygonToPath(cell) };
  });
}

export type LabelSite = ProjectedPoint & {
  name: string;
  major: boolean;
};

export type PlacedLabel = {
  id: string;
  x: number;
  y: number;
  anchor: "start" | "end" | "middle";
  dy: number;
};

type Rect = { x1: number; y1: number; x2: number; y2: number };

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
}

export function placeLabels(sites: LabelSite[], fontSize: number): PlacedLabel[] {
  const ordered = sites
    .map((s, i) => ({ ...s, index: i }))
    .sort((a, b) => (a.major === b.major ? a.index - b.index : a.major ? -1 : 1));

  const placedRects: Rect[] = [];
  const dotRects: Rect[] = sites.map((s) => {
    const r = (s.major ? 7 : 5) + 3;
    return { x1: s.x - r, y1: s.y - r, x2: s.x + r, y2: s.y + r };
  });
  const result = new Map<string, PlacedLabel>();

  for (const site of ordered) {
    const w = 0.58 * fontSize * site.name.length;
    const h = fontSize + 4;
    const offset = 12;
    const dotR = site.major ? 7 : 5;
    const candidates: { x: number; y: number; anchor: "start" | "end" | "middle"; dy: number; rect: Rect }[] = [
      {
        x: site.x + dotR + offset,
        y: site.y,
        anchor: "start",
        dy: fontSize * 0.35,
        rect: { x1: site.x + dotR + offset, y1: site.y - h / 2, x2: site.x + dotR + offset + w, y2: site.y + h / 2 },
      },
      {
        x: site.x - dotR - offset,
        y: site.y,
        anchor: "end",
        dy: fontSize * 0.35,
        rect: { x1: site.x - dotR - offset - w, y1: site.y - h / 2, x2: site.x - dotR - offset, y2: site.y + h / 2 },
      },
      {
        x: site.x,
        y: site.y - dotR - offset,
        anchor: "middle",
        dy: 0,
        rect: { x1: site.x - w / 2, y1: site.y - dotR - offset - h, x2: site.x + w / 2, y2: site.y - dotR - offset },
      },
      {
        x: site.x,
        y: site.y + dotR + offset,
        anchor: "middle",
        dy: fontSize,
        rect: { x1: site.x - w / 2, y1: site.y + dotR + offset, x2: site.x + w / 2, y2: site.y + dotR + offset + h },
      },
    ];

    let chosen = candidates[0];
    for (const cand of candidates) {
      const bad =
        placedRects.some((r) => rectsOverlap(cand.rect, r)) ||
        dotRects.some((r) => rectsOverlap(cand.rect, r));
      if (!bad) {
        chosen = cand;
        break;
      }
    }

    placedRects.push(chosen.rect);
    result.set(site.id, {
      id: site.id,
      x: chosen.x,
      y: chosen.y,
      anchor: chosen.anchor,
      dy: chosen.dy,
    });
  }

  return sites.map((s) => result.get(s.id)!);
}
