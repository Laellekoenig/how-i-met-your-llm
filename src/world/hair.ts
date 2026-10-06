import * as THREE from 'three';
import { Profile, curve, surface, smoothstep, ellipsoid } from '../engine/shapes';
import type { HairStyle } from './characters';

// Hair is a shell grown off the head surface between a per-style hairline and
// the crown, plus optional drapes (bob / long hair) and a ponytail.

interface ShellSpec {
  /** Lowest covered height (fraction of head height) at angle a (0 = front, ±π = back). */
  line: (a: number) => number;
  /** Thickness in head heights at (f, a). */
  thick: (f: number, a: number) => number;
  /** Thickness kept at the hairline (0 = melts into the scalp, 1 = full). */
  edge?: (a: number) => number;
  warp?: (f: number, a: number, v: number, p: THREE.Vector3) => void;
}

export interface HairCtx {
  head: Profile;
  hh: number;
  mat: THREE.Material;
  /** Head-space y of the neck base (shoulder line) — for hair that rests on the back. */
  neckBase: number;
}

export interface HairParts {
  head: THREE.BufferGeometry[];
  /** Pieces that hang on the back; in head space at rest, re-parented to the spine. */
  back: THREE.BufferGeometry[];
}

const sym = (knots: number[][]) => (a: number) => curve(knots, Math.abs(a))[0];
const front = (a: number, w = 0.9) => Math.exp(-((a / w) ** 2));
const gauss = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

function shell(c: HairCtx, spec: ShellSpec, seg = 32, rows = 16) {
  const { head, hh } = c;
  const center = new THREE.Vector3(0, 0.5 * hh, head.at(0.5 * hh).zc);
  const dir = new THREE.Vector3();
  return surface(seg, rows, (u, v, p) => {
    const a = -Math.PI + u * Math.PI * 2;
    const f0 = spec.line(a);
    const f = f0 + (1 - f0) * (1 - (1 - v) ** 1.3);
    head.point(f * hh, a, p);
    dir.copy(p).sub(center).normalize();
    const edge = spec.edge ? spec.edge(a) : 0.25;
    const th = spec.thick(f, a) * (edge + (1 - edge) * smoothstep(0, 0.22, v));
    p.addScaledVector(dir, th * hh);
    spec.warp?.(f, a, v, p);
  }, { closed: true });
}

interface DrapeSpec {
  top: number; // f
  bottom: number; // f (may be negative: below the chin)
  open: (f: number) => number; // half-angle of the face opening
  thick: number; // hh
  flare?: number; // extra radius at the bottom (hh)
  wave?: number; // hh
  back?: number; // push the lower part back (hh)
  curl?: number; // tuck the ends under (hh)
}

function drape(c: HairCtx, d: DrapeSpec, seg = 26, rows = 18) {
  const { head, hh } = c;
  return surface(seg, rows, (u, v, p) => {
    const f = d.top + (d.bottom - d.top) * v;
    const h = d.open(f);
    // go round the back: from +h through π to 2π - h
    const a = h + u * (Math.PI * 2 - 2 * h);
    const fr = Math.max(f, 0.5);
    const below = smoothstep(0.5, d.bottom, f);
    let inflate = d.thick * hh + (d.flare ?? 0) * hh * below;
    if (d.wave) inflate += d.wave * hh * Math.sin(f * 16) * below;
    if (d.curl) inflate -= d.curl * hh * smoothstep(0.85, 1, v);
    head.point(fr * hh, a, p, inflate);
    p.y = f * hh;
    p.z -= (d.back ?? 0) * hh * below;
  }, { closed: false });
}

/** A sheet of long hair lying on the upper back (head space at rest). */
function backSheet(c: HairCtx, top: number, len: number, wave: number) {
  const { head, hh } = c;
  const r = head.at(0.5 * hh);
  return surface(18, 14, (u, v, p) => {
    const y = top - len * v;
    const t = smoothstep(0, 0.35, v);
    const span = 1.25 + 0.15 * t;
    const a = Math.PI - span + u * span * 2;
    const rx = r.rx + 0.07 * hh + 0.05 * t + wave * Math.sin(v * 9) * 0.5;
    const rz = r.rz + 0.07 * hh + 0.035 * t;
    const zc = r.zc - 0.03 * t - 0.02 * v;
    p.set(rx * Math.sin(a), y, zc + rz * Math.cos(a));
  }, { closed: false });
}

function ponytail(c: HairCtx, len: number) {
  const { head, hh } = c;
  const fy = 0.66 * hh;
  const bz = head.at(fy).zc - head.at(fy).rz;
  const k = new Profile([
    [fy - len, 0, 0, bz - 0.03],
    [fy - len + 0.03, 0.022, 0.02, bz - 0.05],
    [fy - len * 0.55, 0.042, 0.036, bz - 0.07],
    [fy - 0.06, 0.04, 0.034, bz - 0.06],
    [fy - 0.01, 0.028, 0.026, bz - 0.03],
    [fy + 0.015, 0, 0, bz - 0.01],
  ]);
  return k.geometry({ seg: 10, rows: 14 });
}

const shortLine = sym([[0, 0.83], [0.5, 0.8], [0.95, 0.7], [1.25, 0.64], [1.5, 0.63], [1.85, 0.6], [2.3, 0.3], [Math.PI, 0.22]]);

export function buildHairGeometry(style: HairStyle, c: HairCtx): HairParts {
  const hh = c.hh;
  const top = (f: number) => smoothstep(0.8, 0.98, f);
  // short cuts hug the head at the sides and back, fuller on top
  const taper = (f: number) => 0.5 + 0.5 * smoothstep(0.62, 0.92, f);
  const out: HairParts = { head: [], back: [] };
  switch (style) {
    case 'brushed': {
      // Barney's close-cut sides and textured, brushed-up forelock. A shallow
      // off-centre part and swept ridges keep this distinct from a smooth cap.
      const line = sym([[0, 0.82], [0.4, 0.85], [0.7, 0.87], [1.0, 0.75],
        [1.23, 0.59], [1.4, 0.61], [1.8, 0.57], [2.25, 0.3], [Math.PI, 0.22]]);
      out.head.push(shell(c, {
        line: a => line(a) + 0.015 * gauss(a, -0.5, 0.16),
        thick: (f, a) => {
          const lift = front(a, 1.15) * smoothstep(0.82, 0.91, f);
          const ridges = 0.014 * (0.5 + 0.5 * Math.sin(a * 24 + f * 30));
          return (0.028 + 0.065 * lift + 0.025 * top(f) + ridges * lift)
            * (1 - 0.5 * gauss(a, -0.55, 0.075)) * taper(f);
        },
        edge: a => 0.2 + 0.35 * front(a),
        warp: (f, a, _v, p) => {
          const lift = front(a, 1.2) * smoothstep(0.83, 0.95, f);
          p.x += 0.035 * hh * lift;
          p.y += 0.035 * hh * lift;
          p.z -= 0.018 * hh * lift;
        },
      }, 64, 26));
      break;
    }
    case 'tousled': {
      // Ted's irregular, lifted waves: short at the ears, full at the crown,
      // with an off-centre forelock and tapered sideburns (see the S05E01 still).
      const line = sym([[0, 0.81], [0.45, 0.8], [0.9, 0.73], [1.1, 0.64],
        [1.22, 0.45], [1.34, 0.44], [1.48, 0.61], [1.85, 0.53], [2.3, 0.25], [Math.PI, 0.18]]);
      out.head.push(shell(c, {
        line: a => line(a) - 0.035 * gauss(a, -0.2, 0.3),
        thick: (f, a) => (0.05 + 0.055 * top(f) + 0.045 * front(a) * smoothstep(0.79, 0.91, f)
          + 0.016 * Math.sin(a * 8 + f * 19) + 0.01 * Math.cos(a * 13 - f * 11)) * taper(f),
        edge: a => 0.45 + 0.35 * front(a) - 0.3 * gauss(Math.abs(a), 1.29, 0.14),
        warp: (f, a, _v, p) => {
          const lift = front(a, 1.15) * smoothstep(0.82, 0.97, f);
          p.x -= 0.065 * hh * lift;
          p.y += 0.015 * hh * lift;
        },
      }, 48, 22));
      // Flattened locks overlap the shell, breaking up its silhouette without
      // becoming spikes or floating curls. All remain attached to the head rig.
      for (const [x, y, z, rx, ry, rz, tilt] of [
        [-0.18, 0.9, 0.19, 0.12, 0.105, 0.145, -0.45],
        [-0.035, 0.97, 0.16, 0.135, 0.085, 0.15, -0.4],
        [0.13, 0.92, 0.18, 0.11, 0.11, 0.13, -0.3],
      ]) {
        const lock = ellipsoid(rx * hh, ry * hh, rz * hh, 12, 8);
        lock.rotateZ(tilt);
        lock.translate(x * hh, y * hh, z * hh);
        out.head.push(lock);
      }
      break;
    }
    case 'updo': {
      // Victoria's swept, lifted crown and low bun, with a loose curl beside each ear.
      out.head.push(shell(c, {
        line: sym([[0, 0.84], [0.55, 0.82], [1.0, 0.68], [1.5, 0.52], [Math.PI, 0.22]]),
        thick: (f, a) => 0.06 + 0.11 * front(a) * smoothstep(0.8, 0.94, f) + 0.035 * top(f),
        edge: () => 0.35,
        warp: (f, a, _v, p) => { p.x -= 0.04 * hh * front(a) * top(f); },
      }));
      const bun = ellipsoid(0.25 * hh, 0.24 * hh, 0.2 * hh, 16, 10);
      bun.translate(0, 0.34 * hh, -0.38 * hh);
      out.head.push(bun);
      for (const sg of [-1, 1]) {
        const curl = ellipsoid(0.045 * hh, 0.22 * hh, 0.06 * hh, 10, 12);
        curl.rotateZ(sg * 0.2); curl.translate(sg * 0.31 * hh, 0.44 * hh, 0.03 * hh);
        out.head.push(curl);
      }
      break;
    }
    case 'curly': {
      // Judy's high crown and full auburn curls, with the face kept clear.
      out.head.push(shell(c, {
        line: sym([[0, 0.84], [0.65, 0.81], [1.0, 0.67], [1.5, 0.54], [Math.PI, 0.46]]),
        thick: (f, a) => 0.1 + 0.09 * top(f) + 0.055 * front(a) + 0.022 * Math.sin(a * 12 + f * 16),
        edge: () => 0.6,
      }));
      const curls = drape(c, { top: 0.84, bottom: -0.7, open: () => 1.06, thick: 0.13, flare: 0.26, wave: 0.09, back: 0.02 });
      const positions = curls.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        const angle = Math.atan2(x, z);
        const ripple = 0.022 * hh * Math.sin(angle * 18 + y / hh * 25);
        positions.setXYZ(i, x + Math.sin(angle) * ripple, y, z + Math.cos(angle) * ripple);
      }
      curls.computeVertexNormals();
      out.head.push(curls);
      out.back.push(backSheet(c, c.neckBase + 0.06, 0.35 * (hh / 0.24), 0.028));
      break;
    }
    case 'swoop':
      // Ted: medium length, pushed up at the front and swept to his right
      out.head.push(shell(c, {
        line: sym([[0, 0.82], [0.45, 0.8], [0.95, 0.69], [1.25, 0.63], [1.5, 0.61], [1.85, 0.57], [2.3, 0.27], [Math.PI, 0.19]]),
        thick: (f, a) => (0.06 + 0.05 * front(a) * smoothstep(0.8, 0.9, f) * (1 - 0.6 * smoothstep(0.93, 1, f)) + 0.025 * top(f) + 0.01 * Math.sin(a * 7 + f * 9)) * taper(f),
        edge: (a) => 0.3 + 0.55 * front(a, 0.7),
        warp: (f, a, _v, p) => {
          const k = front(a, 1.1) * smoothstep(0.8, 0.95, f);
          p.x -= 0.07 * hh * k;
          p.y += 0.025 * hh * k;
        },
      }));
      break;
    case 'neat':
      // Barney: short, side-parted, combed over with a bit of lift
      out.head.push(shell(c, {
        line: sym([[0, 0.84], [0.5, 0.82], [0.95, 0.7], [1.3, 0.64], [1.6, 0.63], [1.9, 0.6], [2.3, 0.3], [Math.PI, 0.22]]),
        thick: (f, a) => (0.045 + 0.045 * front(a) * smoothstep(0.82, 0.92, f) + 0.02 * top(f)) * (1 - 0.6 * gauss(a, -0.6, 0.1) * smoothstep(0.84, 0.88, f)) * taper(f),
        edge: (a) => 0.3 + 0.35 * front(a, 0.6),
        warp: (f, a, _v, p) => {
          p.x += 0.035 * hh * front(a) * smoothstep(0.84, 0.95, f);
        },
      }));
      break;
    case 'shaggy':
    case 'messy':
      // Marshall: thick, shaggy, over the tops of the ears, with sideburns
      out.head.push(shell(c, {
        line: sym([[0, 0.76], [0.5, 0.74], [0.95, 0.64], [1.12, 0.6], [1.22, 0.44], [1.36, 0.44], [1.5, 0.58], [1.85, 0.54], [2.3, 0.2], [Math.PI, 0.12]]),
        thick: (f, a) => 0.075 + 0.022 * Math.sin(a * 9 + f * 11) + 0.035 * top(f) - 0.04 * gauss(Math.abs(a), 1.29, 0.12),
        edge: (a) => 0.55 - 0.4 * gauss(Math.abs(a), 1.29, 0.15),
        warp: (f, a, v, p) => {
          p.y -= 0.03 * hh * front(a, 0.8) * (1 - v) * smoothstep(0.7, 0.8, f);
          p.x -= 0.02 * hh * front(a, 0.8) * (1 - v);
        },
      }));
      break;
    case 'slick':
      // Carl: short, slicked back, receding at the temples
      out.head.push(shell(c, {
        line: sym([[0, 0.86], [0.35, 0.88], [0.6, 0.9], [0.9, 0.78], [1.25, 0.64], [1.6, 0.62], [1.9, 0.58], [2.3, 0.3], [Math.PI, 0.22]]),
        thick: (f) => (0.035 + 0.02 * top(f)) * taper(f),
        edge: () => 0.2,
      }));
      break;
    case 'balding':
      // Mickey's bare crown with a narrow horseshoe of hair at the temples and back.
      out.head.push(surface(28, 8, (u, v, p) => {
        const a = 1.15 + u * (Math.PI * 2 - 2.3);
        const low = 0.52 - 0.27 * Math.sin((a - 1.15) / (Math.PI * 2 - 2.3) * Math.PI);
        c.head.point((low + (0.84 - low) * v) * hh, a, p, 0.004);
      }));
      break;
    case 'receding':
      // Ranjit: close-cropped, high forehead
      out.head.push(shell(c, {
        line: sym([[0, 0.9], [0.4, 0.92], [0.7, 0.94], [1.0, 0.8], [1.3, 0.65], [1.6, 0.6], [1.9, 0.56], [2.3, 0.3], [Math.PI, 0.22]]),
        thick: (f) => (0.03 + 0.01 * top(f)) * taper(f),
        edge: () => 0.2,
      }));
      break;
    case 'buzz':
      out.head.push(shell(c, { line: shortLine, thick: () => 0.022, edge: () => 0.4 }));
      break;
    case 'short':
      out.head.push(shell(c, {
        line: shortLine,
        thick: (f, a) => (0.05 + 0.03 * top(f) + 0.02 * front(a) * smoothstep(0.82, 0.9, f)) * taper(f),
        edge: () => 0.3,
      }));
      break;
    case 'ponytail':
      // Wendy: pulled back tight into a ponytail
      out.head.push(shell(c, {
        line: sym([[0, 0.83], [0.5, 0.81], [1.0, 0.66], [1.5, 0.52], [2.0, 0.32], [Math.PI, 0.14]]),
        thick: (f, a) => 0.04 + 0.015 * top(f) + 0.015 * front(a) * smoothstep(0.82, 0.9, f),
        edge: (a) => 0.25 + 0.3 * front(a, 0.6),
        warp: (f, a, _v, p) => {
          p.x += 0.025 * hh * front(a, 0.8) * smoothstep(0.82, 0.95, f);
        },
      }));
      out.head.push(ponytail(c, 0.3 * (hh / 0.23)));
      break;
    case 'bob': {
      // Shoulder-length bob with side-swept bangs.
      const line = sym([[0, 0.78], [0.6, 0.76], [1.0, 0.64], [1.5, 0.56], [Math.PI, 0.5]]);
      out.head.push(shell(c, {
        line: (a) => line(a) - 0.1 * gauss(a, 0.3, 0.38),
        thick: (f, a) => 0.065 + 0.02 * top(f) + 0.02 * gauss(a, 0.3, 0.5),
        edge: (a) => 0.55 + 0.3 * front(a),
        warp: (_f, a, v, p) => {
          const k = gauss(a, 0.25, 0.6) * (1 - v);
          p.x -= 0.05 * hh * k;
          p.y += 0.01 * hh * k;
        },
      }));
      out.head.push(drape(c, { top: 0.82, bottom: -0.2, open: (f) => 0.95 + 0.25 * smoothstep(0.5, -0.2, f), thick: 0.06, flare: 0.1, back: 0.08, curl: 0.04 }));
      break;
    }
    case 'feathered': {
      // Lily in S08E17: off-centre part, smooth crown and long tapered auburn
      // layers. Face-framing locks turn with her head; the back rests on her shoulders.
      const line = sym([[0, 0.85], [0.45, 0.83], [0.85, 0.71], [1.2, 0.58], [1.7, 0.5], [Math.PI, 0.43]]);
      out.head.push(shell(c, {
        line: a => line(a) - 0.05 * gauss(a, 0.5, 0.35),
        thick: (f, a) => (0.055 + 0.026 * top(f) + 0.018 * gauss(a, 0.5, 0.6)
          + 0.006 * Math.sin(a * 21 + f * 12)) * (1 - 0.6 * gauss(a, -0.3, 0.06)),
        edge: () => 0.55,
      }, 56, 24));
      out.head.push(drape(c, { top: 0.85, bottom: -0.3,
        open: f => 0.98 + 0.2 * smoothstep(0.5, -0.2, f),
        thick: 0.065, flare: 0.11, wave: 0.012, back: 0.05 }, 40, 22));
      const back = backSheet(c, c.neckBase + 0.11, 0.3 * (hh / 0.24), 0.009);
      // A soft, uneven hem instead of a straight curtain across the back.
      const positions = back.getAttribute('position');
      const uv = back.getAttribute('uv');
      for (let i = 0; i < positions.count; i++) {
        const u = uv.getX(i), v = uv.getY(i);
        positions.setY(i, positions.getY(i) + 0.022 * Math.cos(u * Math.PI * 6) * v * v);
      }
      back.computeVertexNormals(); out.back.push(back);
      for (const sg of [-1, 1]) for (let layer = 0; layer < 3; layer++) {
        out.head.push(surface(12, 22, (u, v, p) => {
          const a = u * Math.PI * 2;
          const taper = Math.pow(Math.sin(Math.PI * v), 0.65);
          const x = sg * (0.31 + (0.09 + layer * 0.045) * smoothstep(0, 0.35, v)
            + 0.065 * Math.sin(v * Math.PI) - 0.03 * v);
          const y = 0.58 - (1.56 - layer * 0.1) * v;
          const z = 0.035 + 0.52 * smoothstep(0.1, 0.75, v) - layer * 0.065;
          p.set((x + Math.cos(a) * 0.066 * taper) * hh,
            y * hh, (z + Math.sin(a) * 0.052 * taper) * hh);
        }, { closed: true }));
      }
      break;
    }
    case 'long': {
      // Robin: long, dark, loose waves, parted slightly off-centre
      const line = sym([[0, 0.8], [0.6, 0.77], [1.0, 0.64], [1.5, 0.54], [Math.PI, 0.46]]);
      out.head.push(shell(c, {
        line,
        thick: (f, a) => (0.06 + 0.025 * top(f)) * (1 - 0.5 * gauss(a, 0.25, 0.08) * smoothstep(0.84, 0.9, f)),
        edge: (a) => 0.45 + 0.25 * front(a),
      }));
      out.head.push(drape(c, { top: 0.82, bottom: -0.45, open: (f) => 0.92 + 0.35 * smoothstep(0.55, -0.3, f), thick: 0.06, flare: 0.16, wave: 0.03, back: 0.12 }));
      out.back.push(backSheet(c, c.neckBase + 0.06, 0.3 * (hh / 0.24), 0.012));
      break;
    }
    case 'waves': {
      // Penny: fuller, centre-parted waves that fall forward over the shoulders, past the collarbone
      const line = sym([[0, 0.81], [0.6, 0.78], [1.0, 0.65], [1.5, 0.55], [Math.PI, 0.46]]);
      out.head.push(shell(c, {
        line,
        thick: (f, a) => (0.07 + 0.03 * top(f) + 0.008 * Math.sin(a * 6 + f * 10)) * (1 - 0.55 * gauss(a, 0, 0.07) * smoothstep(0.86, 0.92, f)),
        edge: (a) => 0.5 + 0.25 * front(a),
      }));
      out.head.push(drape(c, { top: 0.84, bottom: -0.85, open: (f) => 0.86 + 0.2 * smoothstep(0.55, -0.1, f) - 0.12 * smoothstep(-0.2, -0.8, f), thick: 0.075, flare: 0.24, wave: 0.055, back: 0.02, curl: 0.03 }));
      out.back.push(backSheet(c, c.neckBase + 0.06, 0.4 * (hh / 0.24), 0.02));
      break;
    }
    case 'mop':
      // Luke: a thick teenage mop, full on top and pushed forward and to one side, over the tops of the ears
      out.head.push(shell(c, {
        line: sym([[0, 0.79], [0.5, 0.76], [0.95, 0.66], [1.2, 0.58], [1.5, 0.57], [1.85, 0.52], [2.3, 0.26], [Math.PI, 0.18]]),
        thick: (f, a) => 0.07 + 0.04 * top(f) + 0.035 * front(a) * smoothstep(0.78, 0.9, f) + 0.012 * Math.sin(a * 8 + f * 12),
        edge: (a) => 0.45 + 0.35 * front(a, 0.7),
        warp: (f, a, v, p) => {
          const k = front(a, 0.9) * smoothstep(0.76, 0.92, f);
          p.x += 0.04 * hh * k;
          p.y -= 0.02 * hh * k * (1 - v);
        },
      }));
      break;
  }
  return out;
}
