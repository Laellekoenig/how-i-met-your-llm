import * as THREE from 'three';

// Smooth, organic geometry for characters: parametric surfaces, lofts through
// keyed cross-sections, tapered capsules. Everything is built procedurally.

/** Signed power, used for superellipse cross-sections. */
const spow = (x: number, e: number) => Math.sign(x) * Math.pow(Math.abs(x), e);

/**
 * Cubic Hermite interpolation through keys `[x, v1, v2, ...]` (x ascending).
 * Returns the interpolated values (without x).
 */
export function curve(keys: number[][], x: number): number[] {
  const n = keys.length;
  if (x <= keys[0][0]) return keys[0].slice(1);
  if (x >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (i < n - 2 && x > keys[i + 1][0]) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(n - 1, i + 2)];
  const dx = p2[0] - p1[0];
  const t = (x - p1[0]) / dx;
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  const out: number[] = [];
  for (let k = 1; k < p1.length; k++) {
    const m1 = ((p2[k] - p0[k]) / (p2[0] - p0[0] || 1)) * dx;
    const m2 = ((p3[k] - p1[k]) / (p3[0] - p1[0] || 1)) * dx;
    out.push(h00 * p1[k] + h10 * m1 + h01 * p2[k] + h11 * m2);
  }
  return out;
}

export interface SurfaceOpts {
  /** u wraps around (first and last columns coincide); normals are welded across the seam. */
  closed?: boolean;
  /** UV scale in metres (for tiling fabric textures). */
  uv?: [number, number];
}

/** Grid surface from a parametric function. +u × +v is the outward side. */
export function surface(uSeg: number, vSeg: number, fn: (u: number, v: number, out: THREE.Vector3) => void, opts: SurfaceOpts = {}) {
  const cols = uSeg + 1, rows = vSeg + 1;
  const pos = new Float32Array(cols * rows * 3);
  const uv = new Float32Array(cols * rows * 2);
  const p = new THREE.Vector3();
  const [us, vs] = opts.uv ?? [1, 1];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      fn(i / uSeg, j / vSeg, p);
      const k = j * cols + i;
      pos.set([p.x, p.y, p.z], k * 3);
      uv.set([(i / uSeg) * us, (j / vSeg) * vs], k * 2);
    }
  const idx: number[] = [];
  for (let j = 0; j < vSeg; j++)
    for (let i = 0; i < uSeg; i++) {
      const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const n = g.attributes.normal as THREE.BufferAttribute;
  const avg = (ks: number[]) => {
    const s = new THREE.Vector3();
    for (const k of ks) s.x += n.getX(k), s.y += n.getY(k), s.z += n.getZ(k);
    if (s.lengthSq() < 1e-12) return;
    s.normalize();
    for (const k of ks) n.setXYZ(k, s.x, s.y, s.z);
  };
  // weld the seam
  if (opts.closed) for (let j = 0; j < rows; j++) avg([j * cols, j * cols + uSeg]);
  // weld collapsed rows (poles)
  for (const j of [0, rows - 1]) {
    let spread = 0;
    for (let i = 1; i < cols; i++) spread += Math.abs(pos[(j * cols + i) * 3] - pos[j * cols * 3]) + Math.abs(pos[(j * cols + i) * 3 + 2] - pos[j * cols * 3 + 2]);
    if (spread < 1e-6) avg(Array.from({ length: cols }, (_, i) => j * cols + i));
  }
  return g;
}

export interface LoftOpts {
  seg?: number;
  rows?: number;
  /** Superellipse exponent: 1 = ellipse, < 1 = boxier. */
  e?: number;
  /** Grow every cross-section by this much (for layered clothing). */
  inflate?: number;
  /** Half-angle of a front opening at height y (radians; 0 = closed tube). */
  open?: (y: number) => number;
  /** Only keep this angle range [a0, a1] (0 = front, +x = π/2). */
  arc?: [number, number];
  /** Trim to this y range. */
  y?: [number, number];
  uv?: [number, number];
  /** Per-vertex tweak after the point is computed (y, angle, point). */
  warp?: (y: number, a: number, p: THREE.Vector3) => void;
}

/**
 * A shape described by cross-sections keyed by height: `[y, rx, rz, zc?, xc?]`.
 * Rows are distributed by profile arc length, so rounded ends stay smooth.
 */
export class Profile {
  private keys: number[][];
  private s: number[] = [];
  private sk: number[][];
  constructor(keys: number[][]) {
    this.keys = keys.map((k) => [k[0], k[1], k[2], k[3] ?? 0, k[4] ?? 0]);
    let acc = 0;
    this.keys.forEach((k, i) => {
      if (i) acc += Math.hypot(k[0] - this.keys[i - 1][0], k[1] - this.keys[i - 1][1]);
      this.s.push(acc);
    });
    this.sk = this.keys.map((k, i) => [this.s[i] / (acc || 1), k[0]]);
  }
  get yMin() { return this.keys[0][0]; }
  get yMax() { return this.keys[this.keys.length - 1][0]; }
  /** [rx, rz, zc, xc] at height y. */
  at(y: number) {
    const v = curve(this.keys, y);
    return { rx: Math.max(0, v[0]), rz: Math.max(0, v[1]), zc: v[2], xc: v[3] };
  }
  /** Height at normalised arc-length t. */
  yAt(t: number) {
    return curve(this.sk, t)[0];
  }
  /** Surface point at height y, angle a (0 = front/+z, π/2 = +x). */
  point(y: number, a: number, out = new THREE.Vector3(), inflate = 0, e = 1) {
    const r = this.at(y);
    const rx = r.rx > 1e-5 ? r.rx + inflate : 0, rz = r.rz > 1e-5 ? r.rz + inflate : 0;
    return out.set(r.xc + rx * spow(Math.sin(a), e), y, r.zc + rz * spow(Math.cos(a), e));
  }
  /** Front surface depth at (x, y) for a cross-section with exponent e. */
  frontZ(x: number, y: number, e = 1) {
    const r = this.at(y);
    const q = Math.min(1, Math.abs(x - r.xc) / (r.rx || 1));
    const sa = Math.pow(q, 1 / e);
    return r.zc + r.rz * Math.pow(Math.sqrt(1 - sa * sa), e);
  }

  geometry(o: LoftOpts = {}) {
    const seg = o.seg ?? 16, rows = o.rows ?? 16, e = o.e ?? 1, inf = o.inflate ?? 0;
    let t0 = 0, t1 = 1;
    if (o.y) {
      // find arc-length range covering the y range
      const find = (y: number) => {
        let lo = 0, hi = 1;
        for (let i = 0; i < 30; i++) {
          const m = (lo + hi) / 2;
          if (this.yAt(m) < y) lo = m;
          else hi = m;
        }
        return (lo + hi) / 2;
      };
      t0 = o.y[0] <= this.yMin ? 0 : find(o.y[0]);
      t1 = o.y[1] >= this.yMax ? 1 : find(o.y[1]);
    }
    const closed = !o.open && !o.arc;
    return surface(seg, rows, (u, v, p) => {
      const y = this.yAt(t0 + (t1 - t0) * v);
      let a: number;
      if (o.arc) a = o.arc[0] + (o.arc[1] - o.arc[0]) * u;
      else if (o.open) {
        const h = o.open(y);
        a = h + u * (Math.PI * 2 - 2 * h);
      } else a = -Math.PI + u * Math.PI * 2;
      this.point(y, a, p, inf, e);
      o.warp?.(y, a, p);
    }, { closed, uv: o.uv });
  }
}

/** Tapered capsule hanging down from the origin (joint at the top sphere centre). */
export function limb(r1: number, r2: number, len: number, o: { bulge?: number; bulgeAt?: number; zScale?: number; seg?: number; e?: number; uv?: boolean } = {}) {
  const keys: number[][] = [];
  const zs = o.zScale ?? 1;
  const bulge = o.bulge ?? 0, at = o.bulgeAt ?? 0.4;
  for (let i = 0; i <= 4; i++) {
    const th = (i / 4) * (Math.PI / 2);
    keys.push([-len - r2 * Math.cos(th), r2 * Math.sin(th), r2 * Math.sin(th) * zs]);
  }
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const r = r2 + (r1 - r2) * t + bulge * Math.exp(-(((1 - t) - at) ** 2) / 0.06);
    keys.push([-len * (1 - t), r, r * zs]);
  }
  for (let i = 0; i <= 4; i++) {
    const th = Math.PI / 2 - (i / 4) * (Math.PI / 2);
    keys.push([r1 * Math.cos(th), r1 * Math.sin(th), r1 * Math.sin(th) * zs]);
  }
  const circ = Math.PI * (r1 + r2);
  return new Profile(keys).geometry({ seg: o.seg ?? 12, rows: 18, e: o.e, uv: o.uv ? [circ, len + r1 + r2] : undefined });
}

export function ellipsoid(rx: number, ry: number, rz: number, seg = 14, rows = 10) {
  return new THREE.SphereGeometry(1, seg, rows).scale(rx, ry, rz);
}
