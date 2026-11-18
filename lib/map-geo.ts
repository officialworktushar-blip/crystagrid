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

const MIN_SPAN = 1e-6;

export function projectPlaces(
  places: ProjectPlaceInput[],
  width: number,
  margin: number,
): { points: ProjectedPoint[]; width: number; height: number } {
  const valid = (Array.isArray(places) ? places : []).filter(
    (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );
  if (valid.length === 0) {
    return { points: [], width: 720, height: 520 };
  }

  const w = Number.isFinite(width) && width > 0 ? width : 720;
  const m = Number.isFinite(margin) && margin >= 0 ? Math.min(margin, w / 2 - 1) : 0;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of valid) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  const latSpan = Math.max(maxLat - minLat, MIN_SPAN);
  const lngSpan = Math.max(maxLng - minLng, MIN_SPAN);
  const latCenter = minLat + latSpan / 2;
  const lngCenter = minLng + lngSpan / 2;
  const cosLat = Math.cos((latCenter * Math.PI) / 180);

  const projected = valid.map((p) => ({
    id: p.id,
    px: (p.lng - lngCenter) * cosLat,
    py: -(p.lat - latCenter),
  }));

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of projected) {
    if (p.px < minX) minX = p.px;
    if (p.px > maxX) maxX = p.px;
    if (p.py < minY) minY = p.py;
    if (p.py > maxY) maxY = p.py;
  }

  const projW = Math.max(maxX - minX, MIN_SPAN);
  const projH = Math.max(maxY - minY, MIN_SPAN);
  const rawHeight = w * (projH / projW);
  const clampedHeight = Math.max(520, Math.min(860, rawHeight));
  const scale = Math.min(
    (w - m * 2) / projW,
    (clampedHeight - m * 2) / projH,
  );
  const offsetX = (w - projW * scale) / 2 - minX * scale;
  const offsetY = (clampedHeight - projH * scale) / 2 - minY * scale;

  const points = projected
    .map((p) => ({
      id: p.id,
      x: p.px * scale + offsetX,
      y: p.py * scale + offsetY,
    }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (points.length === 0) {
    return { points: [], width: 720, height: 520 };
  }
  return { points, width: w, height: clampedHeight };
}

export type Point2D = [number, number];

function isPoint(p: unknown): p is Point2D {
  return (
    Array.isArray(p) &&
    p.length >= 2 &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1])
  );
}

function cross(o: Point2D, a: Point2D, b: Point2D): number {
  if (!isPoint(o) || !isPoint(a) || !isPoint(b)) return 0;
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

export function convexHull(points: Point2D[]): Point2D[] {
  const input = (Array.isArray(points) ? points : []).filter(isPoint);
  if (input.length < 3) return input.slice();

  const unique = Array.from(
    new Map(input.map((p) => [`${p[0].toFixed(6)},${p[1].toFixed(6)}`, p])).values(),
  );
  if (unique.length < 3) return unique.slice();

  const sorted = unique.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lower: Point2D[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point2D[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    if (!isPoint(p)) continue;
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  if (lower.length > 0) lower.pop();
  if (upper.length > 0) upper.pop();
  return lower.concat(upper);
}

export function smoothClosedPath(points: Point2D[]): string {
  if (!Array.isArray(points)) return "";
  const valid = points.filter(isPoint);
  if (valid.length < 3) return "";

  let pts = valid.slice();
  for (let iter = 0; iter < 3; iter++) {
    const n = pts.length;
    if (n < 3) return "";
    const next: Point2D[] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      if (!isPoint(a) || !isPoint(b)) return "";
      const q: Point2D = [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]];
      const r: Point2D = [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]];
      if (!isPoint(q) || !isPoint(r)) return "";
      next.push(q, r);
    }
    pts = next;
  }

  if (pts.length === 0 || !isPoint(pts[0])) return "";
  const d = [`M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (!isPoint(p)) return "";
    d.push(`L ${p[0].toFixed(2)} ${p[1].toFixed(2)}`);
  }
  d.push("Z");
  return d.join(" ");
}

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

export function bboxOf(points: Point2D[]): BBox {
  const valid = (Array.isArray(points) ? points : []).filter(isPoint);
  if (valid.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  let minX = valid[0][0];
  let minY = valid[0][1];
  let maxX = valid[0][0];
  let maxY = valid[0][1];
  for (const p of valid) {
    if (!isPoint(p)) continue;
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] > maxY) maxY = p[1];
  }
  return { minX, minY, maxX, maxY };
}

export function outlinePath(
  sites: ProjectedPoint[],
  radius: number,
): { path: string; bbox: BBox } {
  const emptyBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const validSites = (Array.isArray(sites) ? sites : []).filter(
    (s) => s && Number.isFinite(s.x) && Number.isFinite(s.y),
  );
  if (validSites.length === 0) return { path: "", bbox: emptyBBox };

  const r = Number.isFinite(radius) && radius > 0 ? radius : 1;
  const cloud: Point2D[] = [];
  for (const s of validSites) {
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const x = s.x + Math.cos(a) * r;
      const y = s.y + Math.sin(a) * r;
      if (Number.isFinite(x) && Number.isFinite(y)) cloud.push([x, y]);
    }
  }
  if (cloud.length === 0) return { path: "", bbox: emptyBBox };

  const hull = convexHull(cloud);
  if (hull.length >= 3) {
    const path = smoothClosedPath(hull);
    if (path) return { path, bbox: bboxOf(hull) };
  }

  let cx = 0;
  let cy = 0;
  for (const s of validSites) {
    cx += s.x;
    cy += s.y;
  }
  cx /= validSites.length;
  cy /= validSites.length;
  if (!Number.isFinite(cx)) cx = 0;
  if (!Number.isFinite(cy)) cy = 0;

  const rr = r.toFixed(2);
  const y = cy.toFixed(2);
  const left = (cx - r).toFixed(2);
  const right = (cx + r).toFixed(2);
  const path = `M ${left} ${y} A ${rr} ${rr} 0 1 0 ${right} ${y} A ${rr} ${rr} 0 1 0 ${left} ${y} Z`;
  return {
    path,
    bbox: { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r },
  };
}

function polygonToPath(poly: Point2D[]): string {
  if (!Array.isArray(poly) || poly.length < 3) return "";
  const points = poly.filter(isPoint);
  if (points.length < 3) return "";

  const d = [`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (!isPoint(p)) return "";
    d.push(`L ${p[0].toFixed(2)} ${p[1].toFixed(2)}`);
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
  if (!Array.isArray(polygon) || polygon.length === 0) return [];
  const points = polygon.filter(isPoint);
  if (points.length === 0) return [];
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return [];

  const inside = (p: Point2D) =>
    isPoint(p) && a * p[0] + b * p[1] <= c + 1e-9;
  const intersect = (s: Point2D, e: Point2D): Point2D | null => {
    if (!isPoint(s) || !isPoint(e)) return null;
    const ds = a * s[0] + b * s[1] - c;
    const de = a * e[0] + b * e[1] - c;
    const denom = ds - de;
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return null;
    const t = ds / denom;
    const x = s[0] + t * (e[0] - s[0]);
    const y = s[1] + t * (e[1] - s[1]);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  };

  const output: Point2D[] = [];
  let prev = points[points.length - 1];
  let prevIn = inside(prev);
  for (const curr of points) {
    if (!isPoint(curr)) continue;
    const currIn = inside(curr);
    if (currIn !== prevIn) {
      const crossing = intersect(prev, curr);
      if (crossing) output.push(crossing);
    }
    if (currIn) output.push(curr);
    prev = curr;
    prevIn = currIn;
  }
  return output.length >= 3 ? output : [];
}

export function voronoiCells(
  sites: ProjectedPoint[],
  bounds: BBox,
): { id: string; polygon: Point2D[]; path: string }[] {
  const input = Array.isArray(sites) ? sites : [];
  const bx = bounds && Number.isFinite(bounds.minX) && Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxX) && Number.isFinite(bounds.maxY)
    ? bounds
    : { minX: 0, minY: 0, maxX: 720, maxY: 520 };

  const rect: Point2D[] = [
    [bx.minX, bx.minY],
    [bx.maxX, bx.minY],
    [bx.maxX, bx.maxY],
    [bx.minX, bx.maxY],
  ].filter(isPoint);
  if (rect.length < 3) {
    return input.map((s) => ({ id: s && typeof s.id === "string" ? s.id : "", polygon: [], path: "" }));
  }

  const valid = input
    .map((site, index) => ({ site, index }))
    .filter(({ site }) => site && Number.isFinite(site.x) && Number.isFinite(site.y));

  const adjusted: ProjectedPoint[] = [];
  for (const { site } of valid) {
    let x = site.x;
    let y = site.y;
    for (let j = 0; j < adjusted.length; j++) {
      const o = adjusted[j];
      if (o && Math.abs(o.x - x) < 1e-6 && Math.abs(o.y - y) < 1e-6) {
        x += 0.01;
        y += 0.01;
      }
    }
    adjusted.push({ id: site.id, x, y });
  }

  const computed = adjusted.map((si) => {
    let cell = rect.slice();
    for (const sj of adjusted) {
      if (si.id === sj.id) continue;
      const a = sj.x - si.x;
      const b = sj.y - si.y;
      const c = (sj.x * sj.x + sj.y * sj.y - si.x * si.x - si.y * si.y) / 2;
      cell = clipPolygon(cell, a, b, c);
      if (cell.length === 0) break;
    }
    const polygon = cell.length >= 3 ? cell.filter(isPoint) : [];
    const safePolygon = polygon.length >= 3 ? polygon : [];
    return { id: si.id, polygon: safePolygon, path: polygonToPath(safePolygon) };
  });

  const byIndex = new Map(valid.map(({ index }, i) => [index, computed[i]]));
  return input.map((s, i) => {
    const cell = byIndex.get(i);
    if (!cell) return { id: s && typeof s.id === "string" ? s.id : "", polygon: [], path: "" };
    return cell;
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
  const valid = (Array.isArray(sites) ? sites : []).filter(
    (s) => s && Number.isFinite(s.x) && Number.isFinite(s.y) && typeof s.id === "string",
  );
  if (valid.length === 0) return [];

  const size = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 13;
  const ordered = valid
    .map((s, i) => ({ ...s, index: i }))
    .sort((a, b) => (a.major === b.major ? a.index - b.index : a.major ? -1 : 1));

  const dotRects: Rect[] = valid.map((s) => {
    const r = (s.major ? 7 : 5) + 3;
    return { x1: s.x - r, y1: s.y - r, x2: s.x + r, y2: s.y + r };
  });
  const placedRects: Rect[] = [];
  const result = new Map<string, PlacedLabel>();

  for (const site of ordered) {
    const name = typeof site.name === "string" ? site.name : "";
    const w = 0.58 * size * name.length;
    const h = size + 4;
    const offset = 12;
    const dotR = site.major ? 7 : 5;
    const candidates: { x: number; y: number; anchor: "start" | "end" | "middle"; dy: number; rect: Rect }[] = [
      {
        x: site.x + dotR + offset,
        y: site.y,
        anchor: "start",
        dy: size * 0.35,
        rect: { x1: site.x + dotR + offset, y1: site.y - h / 2, x2: site.x + dotR + offset + w, y2: site.y + h / 2 },
      },
      {
        x: site.x - dotR - offset,
        y: site.y,
        anchor: "end",
        dy: size * 0.35,
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
        dy: size,
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

  return valid.map((s) =>
    result.get(s.id) ?? {
      id: s.id,
      x: s.x,
      y: s.y,
      anchor: "start" as const,
      dy: size * 0.35,
    },
  );
}
