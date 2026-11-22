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
  clip?: Point2D[],
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
  const clipRing = (Array.isArray(clip) ? clip : []).filter(isPoint);
  const region = clipRing.length >= 3 ? clipRing : rect;
  if (region.length < 3) {
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
    let cell = region.slice();
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

export function placeLabels(
  sites: LabelSite[],
  fontSize: number,
  viewW?: number,
  viewH?: number,
): PlacedLabel[] {
  const valid = (Array.isArray(sites) ? sites : []).filter(
    (s) => s && Number.isFinite(s.x) && Number.isFinite(s.y) && typeof s.id === "string",
  );
  if (valid.length === 0) return [];

  const size = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 13;
  let maxX = 0;
  let maxY = 0;
  for (const s of valid) {
    if (s.x + 220 > maxX) maxX = s.x + 220;
    if (s.y + 60 > maxY) maxY = s.y + 60;
  }
  const viewWidth =
    typeof viewW === "number" && Number.isFinite(viewW) && viewW > 0 ? viewW : Math.max(720, maxX);
  const viewHeight =
    typeof viewH === "number" && Number.isFinite(viewH) && viewH > 0 ? viewH : Math.max(520, maxY);
  const insideView = (r: Rect) =>
    r.x1 >= -0.5 && r.y1 >= -0.5 && r.x2 <= viewWidth + 0.5 && r.y2 <= viewHeight + 0.5;
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
    let found = false;
    for (const cand of candidates) {
      if (!insideView(cand.rect)) continue;
      const bad =
        placedRects.some((r) => rectsOverlap(cand.rect, r)) ||
        dotRects.some((r) => rectsOverlap(cand.rect, r));
      if (!bad) {
        chosen = cand;
        found = true;
        break;
      }
    }
    if (!found) {
      for (const cand of candidates) {
        if (!insideView(cand.rect)) continue;
        chosen = cand;
        found = true;
        break;
      }
    }
    if (!found) {
      let bestScore = Infinity;
      for (const cand of candidates) {
        const overlap =
          placedRects.filter((r) => rectsOverlap(cand.rect, r)).length +
          dotRects.filter((r) => rectsOverlap(cand.rect, r)).length;
        const outside =
          Math.max(0, -cand.rect.x1) +
          Math.max(0, cand.rect.x2 - viewWidth) +
          Math.max(0, -cand.rect.y1) +
          Math.max(0, cand.rect.y2 - viewHeight);
        const score = overlap * 1000 + outside;
        if (score < bestScore) {
          bestScore = score;
          chosen = cand;
        }
      }
    }

    const rect = chosen.rect;
    let shiftX = 0;
    let shiftY = 0;
    if (rect.x1 < 2) shiftX = 2 - rect.x1;
    else if (rect.x2 > viewWidth - 2) shiftX = viewWidth - 2 - rect.x2;
    if (rect.y1 < 2) shiftY = 2 - rect.y1;
    else if (rect.y2 > viewHeight - 2) shiftY = viewHeight - 2 - rect.y2;
    const finalX = chosen.x + shiftX;
    const finalY = chosen.y + shiftY;
    placedRects.push({
      x1: rect.x1 + shiftX,
      y1: rect.y1 + shiftY,
      x2: rect.x2 + shiftX,
      y2: rect.y2 + shiftY,
    });
    result.set(site.id, {
      id: site.id,
      x: finalX,
      y: finalY,
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

export type LatLng = [number, number];

export type MercatorPoint = { x: number; y: number };

export function mercator(lat: number, lng: number): MercatorPoint {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { x: 0, y: 0 };
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  const x = (lng * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + rad / 2));
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : { x: 0, y: 0 };
}

export function inverseMercator(x: number, y: number): LatLng {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [0, 0];
  const lng = (x * 180) / Math.PI;
  const lat = (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * (180 / Math.PI);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : [0, 0];
}

export const mercatorInverse = inverseMercator;

function isLatLng(p: unknown): p is LatLng {
  return (
    Array.isArray(p) &&
    p.length >= 2 &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1])
  );
}

function samePoint(a: Point2D, b: Point2D): boolean {
  return Math.abs(a[0] - b[0]) < 1e-12 && Math.abs(a[1] - b[1]) < 1e-12;
}

function distanceToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (!(lenSq > 0)) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq),
  );
  const cx = a[0] + t * dx;
  const cy = a[1] + t * dy;
  return Math.hypot(p[0] - cx, p[1] - cy);
}

function douglasPeuckerKeep(points: Point2D[], tolerance: number): boolean[] {
  const keep = new Array<boolean>(points.length).fill(false);
  if (points.length === 0) return keep;
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const segment = stack.pop();
    if (!segment) break;
    const start = segment[0];
    const end = segment[1];
    if (end - start <= 1) continue;
    let maxDistance = -1;
    let split = -1;
    for (let i = start + 1; i < end; i++) {
      const distance = distanceToSegment(points[i], points[start], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        split = i;
      }
    }
    if (split >= 0 && maxDistance > tolerance) {
      keep[split] = true;
      stack.push([start, split], [split, end]);
    }
  }
  return keep;
}

export function simplifyRing(points: Point2D[], maxPoints: number): Point2D[] {
  const input = (Array.isArray(points) ? points : []).filter(isPoint);
  const limit = Number.isFinite(maxPoints) ? Math.floor(maxPoints) : 250;
  if (input.length < 3 || limit < 3) return input.slice();
  if (input.length <= limit) return input.slice();

  const closed =
    samePoint(input[0], input[input.length - 1]);
  const open = closed ? input.slice(0, -1) : input.slice();
  if (open.length < 3) return input.slice();

  const target = closed ? limit - 1 : limit;
  const box = bboxOf(open);
  const span = Math.max(box.maxX - box.minX, box.maxY - box.minY, MIN_SPAN);
  let low = 0;
  let high = span;
  let best = douglasPeuckerKeep(open, high);
  for (let iteration = 0; iteration < 28; iteration++) {
    const mid = (low + high) / 2;
    const keep = douglasPeuckerKeep(open, mid);
    const count = keep.reduce((sum, value) => sum + (value ? 1 : 0), 0);
    if (count <= target) {
      best = keep;
      high = mid;
    } else {
      low = mid;
    }
  }

  let result = open.filter((_, index) => best[index]);
  if (result.length > target) {
    const step = Math.ceil(open.length / target);
    result = open.filter((_, index) => index % step === 0);
    if (result.length > target) result = result.slice(0, target);
    if (result.length > 0) result[result.length - 1] = open[open.length - 1];
  }
  if (result.length < 3) return input.slice(0, limit);
  if (closed) result.push([result[0][0], result[0][1]]);
  return result;
}

function chaikinClosed(points: Point2D[]): Point2D[] {
  const ring = points.filter(isPoint);
  if (ring.length < 3) return ring;
  const output: Point2D[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    output.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
    output.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
  }
  return output;
}

export type Projector = {
  viewW: number;
  viewH: number;
  project: (lat: number, lng: number) => Point2D;
  unproject: (x: number, y: number) => LatLng;
  polygon: Point2D[];
  path: string;
  bbox: BBox;
};

function emptyProjector(viewW: number, viewH: number): Projector {
  const width = Number.isFinite(viewW) && viewW > 0 ? viewW : 720;
  const height = Number.isFinite(viewH) && viewH > 0 ? viewH : 520;
  return {
    viewW: width,
    viewH: height,
    project: () => [0, 0],
    unproject: () => [0, 0],
    polygon: [],
    path: "",
    bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  };
}

export function makeProjector(
  outline: LatLng[],
  viewW = 720,
  margin = 40,
  extraPoints: LatLng[] = [],
): Projector {
  const w = Number.isFinite(viewW) && viewW > 0 ? viewW : 720;
  const m = Number.isFinite(margin) && margin >= 0 ? Math.min(margin, w / 2 - 1) : 40;
  const fallback = emptyProjector(w, 2 * m + 200);
  const ring = (Array.isArray(outline) ? outline : []).filter(isLatLng);
  if (ring.length < 3) return fallback;

  const asXY: Point2D[] = ring.map((p) => [p[0], p[1]]);
  const reduced = asXY.length > 250 ? simplifyRing(asXY, 250) : asXY;
  const projected = reduced
    .map((p) => mercator(p[0], p[1]))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (projected.length < 3) return fallback;

  const extras = (Array.isArray(extraPoints) ? extraPoints : [])
    .filter(isLatLng)
    .map((p) => mercator(p[0], p[1]))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const all = projected.concat(extras);
  const box = bboxOf(all.map((p) => [p.x, p.y] as Point2D));
  const spanX = Math.max(box.maxX - box.minX, MIN_SPAN);
  const spanY = Math.max(box.maxY - box.minY, MIN_SPAN);
  const innerW = Math.max(w - 2 * m, 1);
  const scale = innerW / spanX;
  const viewH = spanY * scale + 2 * m;
  if (!Number.isFinite(scale) || !Number.isFinite(viewH) || scale <= 0) return fallback;

  const toView = (p: MercatorPoint): Point2D => [
    m + (p.x - box.minX) * scale,
    m + (box.maxY - p.y) * scale,
  ];
  const polygon = projected.map(toView).filter(isPoint);
  if (polygon.length < 3) return fallback;
  if (polygon.length > 1 && samePoint(polygon[0], polygon[polygon.length - 1])) polygon.pop();
  const path = polygonToPath(chaikinClosed(polygon));
  if (!path) return fallback;

  return {
    viewW: w,
    viewH,
    project: (lat: number, lng: number) => toView(mercator(lat, lng)),
    unproject: (x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return [0, 0];
      const mx = box.minX + (x - m) / scale;
      const my = box.maxY - (y - m) / scale;
      return inverseMercator(mx, my);
    },
    polygon,
    path,
    bbox: bboxOf(polygon),
  };
}

export function pointInPolygon(
  p: Point2D | null | undefined,
  polygon: Point2D[],
): boolean {
  if (!isPoint(p)) return false;
  const ring = (Array.isArray(polygon) ? polygon : []).filter(isPoint);
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if ((a[1] > p[1]) !== (b[1] > p[1])) {
      const crossing = ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0];
      if (p[0] < crossing) inside = !inside;
    }
  }
  return inside;
}

export function nearestPointOnPolygon(
  p: Point2D | null | undefined,
  polygon: Point2D[],
): Point2D {
  if (!isPoint(p)) return [0, 0];
  const ring = (Array.isArray(polygon) ? polygon : []).filter(isPoint);
  if (ring.length === 0) return [p[0], p[1]];
  let best: Point2D = [ring[0][0], ring[0][1]];
  let bestDistance = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0
      ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq))
      : 0;
    const q: Point2D = [a[0] + t * dx, a[1] + t * dy];
    const distance = (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]);
    if (Number.isFinite(distance) && distance < bestDistance) {
      bestDistance = distance;
      best = q;
    }
  }
  return best;
}

function distanceToPolygon(p: Point2D, polygon: Point2D[]): number {
  const q = nearestPointOnPolygon(p, polygon);
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

export function insetInside(
  p: Point2D | null | undefined,
  polygon: Point2D[],
  insetPx = 14,
): Point2D {
  if (!isPoint(p)) return [0, 0];
  const ring = (Array.isArray(polygon) ? polygon : []).filter(isPoint);
  if (ring.length < 3) return [p[0], p[1]];
  const inset = Number.isFinite(insetPx) && insetPx >= 0 ? insetPx : 14;
  if (pointInPolygon(p, ring) && distanceToPolygon(p, ring) >= inset) {
    return [p[0], p[1]];
  }

  const nearest = nearestPointOnPolygon(p, ring);
  const vx = p[0] - nearest[0];
  const vy = p[1] - nearest[1];
  const length = Math.hypot(vx, vy);
  const offsets: Point2D[] = [];
  if (length > 1e-9) {
    offsets.push([-(vx / length) * inset, -(vy / length) * inset]);
    offsets.push([(vx / length) * inset, (vy / length) * inset]);
  }
  const radii = [inset, inset * 1.5, inset * 2.5, inset * 4];
  for (const radius of radii) {
    for (let k = 0; k < 16; k++) {
      const angle = (k / 16) * Math.PI * 2;
      offsets.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
  }

  let bestInside: Point2D | null = null;
  let bestDistance = -1;
  for (const offset of offsets) {
    const candidate: Point2D = [nearest[0] + offset[0], nearest[1] + offset[1]];
    if (!isPoint(candidate) || !pointInPolygon(candidate, ring)) continue;
    const distance = distanceToPolygon(candidate, ring);
    if (distance >= inset * 0.95) return candidate;
    if (distance > bestDistance) {
      bestDistance = distance;
      bestInside = candidate;
    }
  }
  if (bestInside !== null) return bestInside;
  if (pointInPolygon(p, ring)) return [p[0], p[1]];

  let cx = 0;
  let cy = 0;
  for (const vertex of ring) {
    cx += vertex[0];
    cy += vertex[1];
  }
  cx /= ring.length;
  cy /= ring.length;
  const centre: Point2D = [cx, cy];
  return pointInPolygon(centre, ring) ? centre : nearest;
}

export type FittedSite<T extends ProjectedPoint> = T & { outside: boolean };

export function fitSitesToOutline<T extends ProjectedPoint>(
  sites: T[],
  polygon: Point2D[],
  insetPx = 14,
  minSpacing = 16,
): FittedSite<T>[] {
  const input = Array.isArray(sites) ? sites : [];
  const ring = (Array.isArray(polygon) ? polygon : []).filter(isPoint);
  const inset = Number.isFinite(insetPx) && insetPx >= 0 ? insetPx : 14;
  const spacing = Number.isFinite(minSpacing) && minSpacing > 0 ? minSpacing : 16;

  const fitted: FittedSite<T>[] = [];
  for (const site of input) {
    if (!site || !Number.isFinite(site.x) || !Number.isFinite(site.y)) continue;
    const p: Point2D = [site.x, site.y];
    if (ring.length < 3) {
      fitted.push({ ...site, outside: false });
      continue;
    }
    const outside = !pointInPolygon(p, ring) || distanceToPolygon(p, ring) < inset;
    const moved = outside ? insetInside(p, ring, inset) : p;
    fitted.push({ ...site, x: moved[0], y: moved[1], outside });
  }
  if (ring.length < 3 || fitted.length < 2) return fitted;

  for (let iteration = 0; iteration < 20; iteration++) {
    let movedAny = false;
    for (let i = 0; i < fitted.length; i++) {
      for (let j = i + 1; j < fitted.length; j++) {
        const a = fitted[i];
        const b = fitted[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (!Number.isFinite(distance) || distance >= spacing) continue;
        let ux = 0;
        let uy = 0;
        let missing = spacing;
        if (distance > 1e-9) {
          ux = dx / distance;
          uy = dy / distance;
          missing = spacing - distance;
        } else {
          const angle = (((i * 137 + j * 31) % 360) * Math.PI) / 180;
          ux = Math.cos(angle);
          uy = Math.sin(angle);
        }
        const half = missing / 2;
        const nextA = insetInside([a.x - ux * half, a.y - uy * half], ring, inset);
        const nextB = insetInside([b.x + ux * half, b.y + uy * half], ring, inset);
        a.x = nextA[0];
        a.y = nextA[1];
        b.x = nextB[0];
        b.y = nextB[1];
        a.outside = a.outside || !pointInPolygon([a.x, a.y], ring);
        b.outside = b.outside || !pointInPolygon([b.x, b.y], ring);
        movedAny = true;
      }
    }
    if (!movedAny) break;
  }
  return fitted;
}
