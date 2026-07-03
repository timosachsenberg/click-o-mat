import type { Vec2 } from './types';
import { closestPointOnSegment, dist, lerpVec, pointInPolygon, segmentsIntersect } from './geometry';

const OFFSET = 5; // how far graph nodes are pushed off polygon corners
const SAMPLE_STEP = 10; // px between inside-checks along a candidate segment

/**
 * A walkable floor: one boundary polygon minus obstacle polygons ("holes").
 * Pathfinding runs on a visibility graph built from polygon corners.
 */
export class WalkArea {
  private nodes: Vec2[] = [];
  private edges: Vec2[][] = []; // every boundary/hole edge as [a, b]

  constructor(
    private boundary: Vec2[],
    private holes: Vec2[][] = []
  ) {
    const polys = [boundary, ...holes];
    for (const poly of polys) {
      for (let i = 0; i < poly.length; i++) {
        this.edges.push([poly[i], poly[(i + 1) % poly.length]]);
      }
    }
    // Graph nodes: polygon corners nudged into the walkable region so that
    // paths can round both concave boundary corners and hole corners.
    for (const poly of polys) {
      const n = poly.length;
      for (let i = 0; i < n; i++) {
        const v = poly[i];
        const prev = poly[(i + n - 1) % n];
        const next = poly[(i + 1) % n];
        for (const c of cornerCandidates(v, prev, next)) {
          if (this.contains(c)) this.nodes.push(c);
        }
      }
    }
  }

  contains(p: Vec2): boolean {
    if (!pointInPolygon(p, this.boundary)) return false;
    for (const hole of this.holes) {
      if (pointInPolygon(p, hole)) return false;
    }
    return true;
  }

  /** Nearest walkable point to p (p itself if already walkable). */
  clamp(p: Vec2): Vec2 {
    if (this.contains(p)) return p;
    let best: Vec2 = p;
    let bestD = Infinity;
    for (const [a, b] of this.edges) {
      const q = closestPointOnSegment(p, a, b);
      // Nudge perpendicular to the edge; keep whichever side is walkable.
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const len = Math.hypot(ex, ey) || 1;
      const nx = (-ey / len) * 2;
      const ny = (ex / len) * 2;
      for (const cand of [
        { x: q.x + nx, y: q.y + ny },
        { x: q.x - nx, y: q.y - ny },
      ]) {
        if (!this.contains(cand)) continue;
        const d = dist(p, cand);
        if (d < bestD) {
          bestD = d;
          best = cand;
        }
      }
    }
    return best;
  }

  /** A straight segment is usable if it crosses no edge and stays inside. */
  private clear(a: Vec2, b: Vec2): boolean {
    for (const [e1, e2] of this.edges) {
      if (segmentsIntersect(a, b, e1, e2)) return false;
    }
    const steps = Math.max(2, Math.ceil(dist(a, b) / SAMPLE_STEP));
    for (let i = 1; i < steps; i++) {
      if (!this.contains(lerpVec(a, b, i / steps))) return false;
    }
    return true;
  }

  /**
   * Shortest path between two points (both clamped into the area first).
   * Returns a list of waypoints starting at `from`, or null if unreachable.
   */
  findPath(fromRaw: Vec2, toRaw: Vec2): Vec2[] | null {
    const from = this.clamp(fromRaw);
    const to = this.clamp(toRaw);
    if (dist(from, to) < 1) return [from, to];
    if (this.clear(from, to)) return [from, to];

    const pts = [from, ...this.nodes, to];
    const n = pts.length;
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this.clear(pts[i], pts[j])) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    }

    // Dijkstra (node counts are tiny, no heap needed).
    const distArr = new Array<number>(n).fill(Infinity);
    const prev = new Array<number>(n).fill(-1);
    const done = new Array<boolean>(n).fill(false);
    distArr[0] = 0;
    for (;;) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        if (!done[i] && distArr[i] < best) {
          best = distArr[i];
          u = i;
        }
      }
      if (u === -1) break;
      if (u === n - 1) break;
      done[u] = true;
      for (const v of adj[u]) {
        const nd = distArr[u] + dist(pts[u], pts[v]);
        if (nd < distArr[v]) {
          distArr[v] = nd;
          prev[v] = u;
        }
      }
    }
    if (distArr[n - 1] === Infinity) return null;

    const path: Vec2[] = [];
    for (let cur = n - 1; cur !== -1; cur = prev[cur]) path.unshift(pts[cur]);
    return path;
  }
}

function cornerCandidates(v: Vec2, prev: Vec2, next: Vec2): Vec2[] {
  const da = norm({ x: v.x - prev.x, y: v.y - prev.y });
  const db = norm({ x: v.x - next.x, y: v.y - next.y });
  const out: Vec2[] = [];
  const bis = da && db ? norm({ x: da.x + db.x, y: da.y + db.y }) : null;
  if (bis) {
    out.push({ x: v.x + bis.x * OFFSET, y: v.y + bis.y * OFFSET });
    out.push({ x: v.x - bis.x * OFFSET, y: v.y - bis.y * OFFSET });
  }
  // Perpendicular fallback covers near-collinear corners.
  const edge = norm({ x: next.x - prev.x, y: next.y - prev.y });
  if (edge) {
    out.push({ x: v.x - edge.y * OFFSET, y: v.y + edge.x * OFFSET });
    out.push({ x: v.x + edge.y * OFFSET, y: v.y - edge.x * OFFSET });
  }
  return out;
}

function norm(v: Vec2): Vec2 | null {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return null;
  return { x: v.x / len, y: v.y / len };
}
