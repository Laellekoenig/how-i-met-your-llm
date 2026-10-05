import * as THREE from 'three';
import type { CharacterDef, Look } from './characters';
import type { Emotion, Gesture } from '../script/types';
import { toon, mesh, cyl } from '../engine/materials';
import { plaid, tweed, denim, tieWeave, kitchenPrint, wardrobePrint } from '../engine/textures';
import { Profile, limb, ellipsoid, surface, smoothstep } from '../engine/shapes';
import { buildHairGeometry } from './hair';
import { clamp, damp, dampAngle, angleDiff, noise1, rand, lerp } from '../util';

type V3 = [number, number, number];

interface Pose {
  lSh: V3; rSh: V3; lEl: number; rEl: number;
  lHip: number; rHip: number; lKnee: number; rKnee: number;
  /** Hip splay (z) and knee fold sideways (z), for sitting cross-legged. */
  lHipZ: number; rHipZ: number; lKneeZ: number; rKneeZ: number;
  spine: V3; head: V3;
}

const zeroPose = (): Pose => ({
  lSh: [0, 0, 0], rSh: [0, 0, 0], lEl: 0, rEl: 0,
  lHip: 0, rHip: 0, lKnee: 0, rKnee: 0,
  lHipZ: 0, rHipZ: 0, lKneeZ: 0, rKneeZ: 0,
  spine: [0, 0, 0], head: [0, 0, 0],
});

/** How someone sits: upright, cross-legged hugging whatever is in their lap, or slouched with an arm along the backrest. */
export type SitPose = 'upright' | 'cross_legged' | 'sprawl';

interface Face {
  browY: number; browTilt: number; browAsym: number;
  smile: number; mouthBase: number; headTilt: number; headDown: number;
}

const FACES: Record<Emotion, Face> = {
  neutral:   { browY: 0,     browTilt: 0,    browAsym: 0,    smile: 0.1,  mouthBase: 0,    headTilt: 0,     headDown: 0 },
  happy:     { browY: 0.008, browTilt: -0.1, browAsym: 0,    smile: 1,    mouthBase: 0.25, headTilt: 0.05,  headDown: -0.05 },
  sad:       { browY: 0.004, browTilt: -0.45, browAsym: 0,   smile: -0.8, mouthBase: 0,    headTilt: 0.08,  headDown: 0.22 },
  angry:     { browY: -0.01, browTilt: 0.5,  browAsym: 0,    smile: -0.6, mouthBase: 0.15, headTilt: 0,     headDown: 0.08 },
  surprised: { browY: 0.022, browTilt: -0.15, browAsym: 0,   smile: 0,    mouthBase: 0.8,  headTilt: 0,     headDown: -0.12 },
  smug:      { browY: 0.004, browTilt: 0,    browAsym: 0.016, smile: 0.7, mouthBase: 0,    headTilt: -0.1,  headDown: -0.1 },
  confused:  { browY: 0.006, browTilt: 0.15, browAsym: 0.014, smile: -0.2, mouthBase: 0.1, headTilt: 0.2,   headDown: 0 },
  excited:   { browY: 0.016, browTilt: -0.1, browAsym: 0,    smile: 1,    mouthBase: 0.55, headTilt: 0,     headDown: -0.1 },
  nervous:   { browY: 0.01,  browTilt: -0.35, browAsym: 0,   smile: -0.3, mouthBase: 0.1,  headTilt: 0.1,   headDown: 0.1 },
  flirty:    { browY: 0.004, browTilt: 0,    browAsym: 0.012, smile: 0.6, mouthBase: 0,    headTilt: 0.15,  headDown: 0.05 },
  bored:     { browY: -0.005, browTilt: 0.06, browAsym: 0.005, smile: -0.25, mouthBase: 0,  headTilt: 0.14,  headDown: 0.04 },
};

const GESTURE_DUR: Record<Gesture, number> = {
  none: 0, wave: 1.6, point: 1.5, shrug: 1.3, facepalm: 2.0, arms_crossed: 3.2, drink: 2.0, cheers: 1.6,
  thumbs_up: 1.4, high_five: 1.3, suit_up: 1.7, hands_up: 1.6, nod: 1.0, shake_head: 1.1, dance: 3.2,
  hug: 2.2, slap: 1.0, think: 2.2,
};

export class Actor {
  readonly def: CharacterDef;
  readonly root = new THREE.Group();
  readonly height: number;
  readonly legLen: number;
  readonly bodyMeshes: THREE.Mesh[] = [];

  private hips = new THREE.Group();
  private spine = new THREE.Group();
  private neck = new THREE.Group();
  private head = new THREE.Group();
  private lSh = new THREE.Group(); private rSh = new THREE.Group();
  private lEl = new THREE.Group(); private rEl = new THREE.Group();
  private lHip = new THREE.Group(); private rHip = new THREE.Group();
  private lKnee = new THREE.Group(); private rKnee = new THREE.Group();
  private eyes = new THREE.Group();
  private browL!: THREE.Mesh; private browR!: THREE.Mesh;
  private mouthOpen!: THREE.Mesh; private cornerL!: THREE.Mesh; private cornerR!: THREE.Mesh;
  private glass!: THREE.Mesh;
  private skirt: THREE.Group | null = null;
  private browY0 = 0;
  private headH: number;
  private torsoLen: number;

  // --- state ---
  facing = 0;
  targetFacing = 0;
  seatHeight: number | null = null;
  private sitBlend = 0;
  private sitPose: SitPose = 'upright';
  private lapProp: THREE.Object3D | null = null;
  private path: THREE.Vector3[] = [];
  private scooting = false;
  private onArrive: (() => void) | null = null;
  private walkPhase = 0;
  private walking = 0; // blend
  talking = false;
  /** How big the talking is: under 1 for a whisper, over 1 for a shout. */
  talkLevel = 1;
  private talkEnv = 0;
  emotion: Emotion = 'neutral';
  private face: Face = { ...FACES.neutral };
  lookAt: THREE.Vector3 | null = null;
  private gesture: { g: Gesture; t: number; dur: number } | null = null;
  holdingGlass = false;
  private blinkT = rand(1, 4);
  private accent = { t: 0, side: 1, dur: 0 };
  private seed = Math.random() * 100;
  private pose = zeroPose();
  private bounce = 0;
  private reactT = 0;
  onGestureBeat: ((g: Gesture) => void) | null = null;
  private gestureBeatFired = false;

  constructor(def: CharacterDef) {
    this.def = def;
    const L = def.look;
    const H = (this.height = L.height);
    this.headH = 0.14 * H;
    this.torsoLen = 0.31 * H;
    this.legLen = H - this.headH - 0.03 * H - this.torsoLen;
    this.build(L);
    this.root.name = def.id;
  }

  // ------------------------------------------------------------------ build

  private build(L: Look) {
    const H = L.height, s = H / 1.8, b = L.build, fem = L.female;
    const tl = this.torsoLen, hh = this.headH;
    const thigh = (this.legLen - 0.04) / 2, shin = thigh;
    const upper = 0.17 * H, fore = 0.15 * H;
    const bx = s * b, bz = s * Math.pow(b, 0.8), ba = s * Math.sqrt(b);
    const DS = THREE.DoubleSide;
    const E = 0.85; // torso cross-section squareness

    // ---- materials
    const shade = (c: string, f: number) => new THREE.Color(c).multiplyScalar(f);
    const fabric = (tex: THREE.Texture, tile: number, side?: THREE.Side) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1 / tile, 1 / tile);
      return toon('#ffffff', { map: tex, side });
    };
    const skin = toon(L.skin);
    const outer = (side?: THREE.Side) =>
      L.plaid ? fabric(plaid(L.top, L.plaid[0], L.plaid[1]), 0.075, side)
      : L.stripes ? fabric(wardrobePrint(L.top, 'stripes', L.stripes), 0.22, side)
      : L.print ? fabric(wardrobePrint(L.top, L.print), 0.28, side)
      : L.topStyle === 'denim' ? fabric(denim(L.top), 0.09, side)
      : L.tweed ? fabric(tweed(L.top), 0.07, side) : toon(L.top, { side });
    const topMat = outer();
    const topDS = outer(DS);
    const topDark = toon(shade(L.top, 0.72), { side: DS });
    const underMat = toon(L.under ?? L.top);
    const underDS = toon(L.under ?? L.top, { side: DS });
    const collarDS = L.collar ? toon(L.collar, { side: DS }) : underDS;
    const pantsMat = L.jeans ? fabric(denim(L.pants), 0.06) : toon(L.pants);
    const legMat = L.legs ? toon(L.legs) : pantsMat;
    const shoeMat = toon(L.shoes);
    const soleMat = toon(shade(L.shoes, 0.5));
    const hairMat = toon(L.hair, { side: DS });
    const dark = toon('#1c1a1a');
    const add = (parent: THREE.Object3D, m: THREE.Mesh, body = true) => {
      parent.add(m);
      if (body) this.bodyMeshes.push(m);
      return m;
    };

    const style = L.topStyle;
    const jacketed = style === 'suit' || style === 'blazer' || style === 'leather' || style === 'cardigan' || style === 'hoodie' || style === 'denim';
    const untucked = style === 'flannel' || style === 'sweater' || style === 'polo' || style === 'tee' || style === 'hoodie';
    const shortSleeves = style === 'tee' || style === 'polo';
    const sleeveless = style === 'dress';
    const rolled = L.sleeves === 'rolled' || (style === 'shirt' && L.sleeves !== 'long');

    this.root.add(this.hips);
    this.hips.position.y = this.legLen;

    // ---- pelvis + legs
    const hipR = (fem ? 0.168 : 0.156) * bx;
    const pelvis = new Profile([
      [-0.15 * s, 0, 0], [-0.14 * s, 0.05 * bx, 0.05 * bz], [-0.1 * s, hipR * 0.88, 0.094 * bz],
      [-0.04 * s, hipR, 0.1 * bz], [0.06 * s, hipR * 0.97, 0.096 * bz], [0.1 * s, hipR * 0.6, 0.07 * bz], [0.11 * s, 0, 0],
    ]);
    add(this.hips, mesh(pelvis.geometry({ seg: 20, rows: 14, e: 0.9, uv: [0.9, 0.3] }), L.skirt ? legMat : pantsMat));
    if (!untucked && !L.skirt && style !== 'suit' && style !== 'cardigan')
      add(this.hips, mesh(pelvis.geometry({ seg: 20, rows: 2, e: 0.9, y: [0.025 * s, 0.06 * s], inflate: 0.006 }), toon('#2a1f18')));

    const hx = (fem ? 0.088 : 0.085) * bx;
    for (const side of [1, -1]) {
      const hip = side > 0 ? this.lHip : this.rHip;
      const knee = side > 0 ? this.lKnee : this.rKnee;
      hip.position.set(side * hx, -0.04, 0);
      this.hips.add(hip);
      add(hip, mesh(limb(0.082 * bx, 0.056 * ba, thigh, { bulge: 0.006, bulgeAt: 0.3, uv: true }), legMat));
      knee.position.y = -thigh;
      hip.add(knee);
      add(knee, mesh(limb(0.056 * ba, 0.04 * s, shin - 0.075 * s, { bulge: 0.009 * ba, bulgeAt: 0.3, uv: true }), L.boots ? shoeMat : legMat));
      if (L.boots) {
        const rim = mesh(new THREE.TorusGeometry(0.058 * ba, 0.008, 6, 14), soleMat, 0, -0.07, 0);
        rim.rotation.x = Math.PI / 2;
        add(knee, rim, false);
      }
      if (L.socks) add(knee, mesh(new THREE.CylinderGeometry(0.048 * s, 0.044 * s, 0.09 * s, 12), toon(L.socks), 0, -shin + 0.09 * s, 0));
      const foot = new THREE.Group();
      foot.position.y = -shin;
      knee.add(foot);
      const flat = fem && !L.boots;
      add(foot, mesh(ellipsoid(0.046 * s, (flat ? 0.03 : 0.042) * s, 0.122 * s), shoeMat, 0, (flat ? 0.028 : 0.04) * s, 0.045 * s));
      add(foot, mesh(ellipsoid(0.05 * s, 0.013 * s, 0.128 * s), soleMat, 0, 0.011, 0.045 * s), false);
    }

    // ---- torso
    this.hips.add(this.spine);
    const T = (fem
      ? [[-0.24, 0.182, 0.122, 0], [-0.08, 0.166, 0.11, 0], [0.1, 0.128, 0.09, 0], [0.4, 0.136, 0.096, 0.006], [0.63, 0.152, 0.12, 0.022], [0.84, 0.16, 0.1, 0], [0.94, 0.15, 0.082, -0.012], [1.0, 0.095, 0.06, -0.01], [1.05, 0, 0, -0.006]]
      : [[-0.24, 0.184, 0.118, 0], [-0.08, 0.174, 0.11, 0], [0.1, 0.15, 0.1, 0], [0.4, 0.153, 0.1, 0.002], [0.66, 0.16, 0.103, 0.004], [0.84, 0.166, 0.098, 0], [0.94, 0.156, 0.084, -0.01], [1.0, 0.102, 0.064, -0.012], [1.05, 0, 0, -0.008]]
    ).map(([y, rx, rz, zc]) => [y * tl, rx * bx, rz * bz, zc * bz]);
    const torso = new Profile(T);
    // Tailored jackets hang straight from the chest instead of following the waist in.
    const chestY = 0.66 * tl, chest = torso.at(chestY);
    const drape = new Profile(T.map(([y, rx, rz, zc]) => y >= chestY ? [y, rx, rz, zc] : [y, Math.max(rx, 0.97 * chest.rx), Math.max(rz, chest.rz), chest.zc]));
    const circ = Math.PI * 2 * 0.16 * bx;
    const hem = untucked ? -0.17 * tl : L.skirt ? -0.04 * tl : 0.07 * s;
    add(this.spine, mesh(torso.geometry({ seg: 26, rows: 20, e: E, y: [hem, torso.yMax], uv: [circ, tl] }), jacketed ? underMat : topMat));

    const nr = (fem ? 0.044 : 0.052) * s * Math.sqrt(b);
    const ramp = (a: number, b: number, y: number) => clamp((y - a) / (b - a), 0, 1);
    const onTorso = (y: number, a: number, inflate: number, prof = torso) => prof.point(y, a, new THREE.Vector3(), inflate, E);
    /** A band around the neck rising from the shoulders (collars, neckbands). */
    const collar = (open: number, inflate: number, height: number, mat: THREE.Material, flare = 0.012) =>
      mesh(surface(20, 3, (u, v, p) => {
        const a = open + u * (Math.PI * 2 - 2 * open);
        const y0 = 0.965 * tl;
        const r = torso.at(y0);
        const k = smoothstep(0, 1, v);
        const rx = (r.rx + inflate) * (1 - k) + (nr + flare + 0.008) * k;
        const rz = (r.rz + inflate) * (1 - k) + (nr + flare + 0.012) * k;
        p.set(rx * Math.sin(a), y0 + (tl * 0.035 + height) * v, (r.zc * (1 - k) - 0.008 * k) + rz * Math.cos(a));
      }), mat);
    /** Strip down the chest, between angles ±w(y). */
    const placket = (y0: number, y1: number, w: (y: number) => number, inflate: number, mat: THREE.Material) =>
      mesh(surface(6, 8, (u, v, p) => {
        const y = y0 + (y1 - y0) * v;
        torso.point(y, (u * 2 - 1) * w(y), p, inflate, E);
      }), mat);
    const buttons = (ys: number[], inflate: number, mat: THREE.Material, a = 0, prof = torso) => {
      for (const y of ys) {
        const m = mesh(ellipsoid(0.008 * s, 0.008 * s, 0.004 * s, 6, 4), mat);
        m.position.copy(onTorso(y, a, inflate, prof));
        add(this.spine, m, false);
      }
    };

    const shirtCollar = (mat: THREE.Material, inflate: number, open = 0.3) => {
      add(this.spine, collar(open, inflate, 0.02 * s, mat));
      for (const sg of [1, -1]) {
        const tip = mesh(ellipsoid(0.03 * s, 0.011 * s, 0.004 * s, 8, 4), mat);
        tip.position.copy(onTorso(0.965 * tl, sg * 0.26, inflate + 0.003));
        tip.rotation.set(-0.35, sg * 0.25, sg * 1.0);
        add(this.spine, tip, false);
      }
    };
    const tie = () => {
      const tieMat = L.tiePattern
        ? toon('#ffffff', { side: DS, map: tieWeave(L.tie!, L.tieAccent ?? '#ddd1b0', L.tiePattern) })
        : toon(L.tie!, { side: DS });
      const y0 = 0.4 * tl, y1 = 0.955 * tl;
      add(this.spine, mesh(surface(4, 10, (u, v, p) => {
        const y = y0 + (y1 - y0) * v;
        const w = (0.012 + 0.016 * (1 - v)) * s * smoothstep(0, 0.08, v);
        const x = (u * 2 - 1) * w;
        p.set(x, y, torso.frontZ(x, y, E) + 0.009);
      }), tieMat), false);
      add(this.spine, mesh(ellipsoid(0.017 * s, 0.015 * s, 0.01 * s, 8, 6), tieMat, 0, y1, torso.frontZ(0, y1, E) + 0.012), false);
    };
    /** Jacket / cardigan / vest body: an inflated torso shell with a front opening. */
    const shell = (inflate: number, y0: number, y1: number, open: (y: number) => number, mat: THREE.Material, prof = torso) =>
      add(this.spine, mesh(prof.geometry({ seg: 28, rows: 20, e: E, inflate, y: [y0, y1], open, uv: [circ, tl] }), mat));
    /** Front opening given by its half-width in metres rather than by angle, so it stays neck-wide at the top. */
    const byWidth = (prof: Profile, inflate: number, w: (y: number) => number) => (y: number) =>
      Math.asin(Math.pow(clamp(w(y) / (prof.at(y).rx + inflate), 0, 1), 1 / E));
    /** Opening angle for a jacket collar whose front edges meet a V of half-width w. */
    const collarOpen = (w: number, inflate: number) => Math.asin(clamp(w / (torso.at(0.965 * tl).rx + inflate), 0, 1));
    const lapels = (inflate: number, open: (y: number) => number, yb: number, wMax: number, mat: THREE.Material, prof = torso) => {
      for (const sg of [1, -1])
        add(this.spine, mesh(surface(4, 12, (u, v, p) => {
          const y = yb + (0.965 * tl - yb) * v;
          const w = wMax * smoothstep(0, 0.55, v) * (1 - 0.45 * smoothstep(0.78, 0.86, v));
          prof.point(y, sg * (open(y) + u * w), p, inflate + 0.004 + 0.006 * (1 - u), E);
        }), mat), false);
    };

    switch (style) {
      case 'suit': {
        const yb = 0.42 * tl;
        shirtCollar(collarDS, 0.004, 0.24);
        if (L.tie) tie();
        if (L.vest) {
          shell(0.008, -0.07 * tl, 0.97 * tl, (y) => 0.03 + 0.4 * smoothstep(0.55 * tl, 0.97 * tl, y), toon(L.vest, { side: DS }));
          buttons([0.12 * tl, 0.25 * tl, 0.38 * tl, 0.5 * tl], 0.011, dark);
        }
        // straight V from the button up to the neck; below the button the fronts curve apart
        const vTop = nr + 0.014 * s;
        const open = byWidth(drape, 0.016, (y) => (y > yb ? lerp(0.008 * s, vTop, ramp(yb, 0.97 * tl, y)) : 0.008 * s + 0.05 * s * smoothstep(yb, -0.22 * tl, y)));
        shell(0.016, -0.22 * tl, drape.yMax, open, topDS, drape);
        lapels(0.016, open, yb, 0.3, toon(shade(L.top, 0.8), { side: DS }), drape);
        add(this.spine, collar(collarOpen(vTop, 0.018), 0.018, 0.012 * s, topDS, 0.02));
        buttons([yb], 0.02, dark, 0, drape);
        if (L.extras?.includes('pocketsquare')) {
          const sq = mesh(ellipsoid(0.03 * s, 0.014 * s, 0.006 * s, 8, 4), toon(L.pocketSquare ?? '#f4f4f4'));
          sq.position.copy(onTorso(0.72 * tl, 0.62, 0.024, drape));
          add(this.spine, sq, false);
        }
        break;
      }
      case 'blazer': {
        shirtCollar(underDS, 0.004, 0.28);
        add(this.spine, placket(0.84 * tl, 0.99 * tl, (y) => 0.2 * ramp(0.84 * tl, 0.99 * tl, y), 0.002, skin), false);
        const vTop = nr + 0.016 * s;
        const open = byWidth(drape, 0.015, (y) => lerp(0.03 * s, vTop, ramp(0.4 * tl, 0.97 * tl, y)));
        shell(0.015, -0.22 * tl, drape.yMax, open, topDS, drape);
        lapels(0.015, open, 0.4 * tl, 0.3, toon(shade(L.top, 0.78), { side: DS }), drape);
        add(this.spine, collar(collarOpen(vTop, 0.017), 0.017, 0.012 * s, topDS, 0.02));
        if (L.extras?.includes('brass')) {
          // double-breasted yachting blazer: two rows of gold buttons
          const brass = toon('#d4a83a', { emissive: '#3a2a08', emissiveIntensity: 0.5 });
          for (const a of [0.3, -0.3]) buttons([0.2 * tl, 0.3 * tl, 0.4 * tl], 0.02, brass, a, drape);
        } else buttons([0.3 * tl, 0.38 * tl], 0.02, toon('#2a1a12'), 0.3, drape);
        break;
      }
      case 'denim':
      case 'leather': {
        const open = (y: number) => 0.32 + 0.35 * smoothstep(0.5 * tl, 0.97 * tl, y);
        shell(0.016, -0.06 * tl, 0.98 * tl, open, topDS);
        shell(0.02, -0.06 * tl, 0.0, open, topDark); // waistband
        lapels(0.016, open, 0.55 * tl, 0.42, toon(shade(L.top, 0.85), { side: DS }));
        add(this.spine, collar(0.7, 0.018, 0.02 * s, topDS, 0.03));
        // scoop neckline
        add(this.spine, placket(0.87 * tl, 0.99 * tl, (y) => 0.45 * Math.sqrt(ramp(0.87 * tl, 0.99 * tl, y)), 0.002, skin), false);
        if (style === 'denim') {
          const stitch = toon('#d3d8cf', { side: DS });
          for (const sg of [-1, 1]) {
            const pocket = mesh(surface(6, 6, (u, v, p) => torso.point((0.56 + 0.18 * v) * tl, sg * (0.8 + u * 0.45), p, 0.026, E)), topDark);
            add(this.spine, pocket, false);
            const button = mesh(ellipsoid(0.008, 0.008, 0.004, 6, 4), stitch);
            button.position.copy(onTorso(0.71 * tl, sg * 1.01, 0.03)); add(this.spine, button, false);
          }
        }
        break;
      }
      case 'cardigan': {
        add(this.spine, placket(0.88 * tl, 0.99 * tl, (y) => 0.4 * Math.sqrt(ramp(0.88 * tl, 0.99 * tl, y)), 0.002, skin), false);
        const open = (y: number) => 0.06 + 0.55 * smoothstep(0.45 * tl, 0.97 * tl, y);
        shell(0.011, 0.04 * tl, 0.98 * tl, open, topDS);
        shell(0.015, 0.04 * tl, 0.11 * tl, open, topDark); // ribbed hem
        for (const y of [0.15, 0.27, 0.39]) {
          const btn = mesh(ellipsoid(0.009 * s, 0.009 * s, 0.005 * s, 6, 4), toon('#efe0b0'));
          btn.position.copy(onTorso(y * tl, 0.11, 0.016));
          add(this.spine, btn, false);
        }
        break;
      }
      case 'flannel':
        add(this.spine, placket(0.86 * tl, 0.99 * tl, (y) => 0.2 * ramp(0.86 * tl, 0.99 * tl, y), 0.003, underMat), false);
        add(this.spine, collar(0.32, 0.006, 0.025 * s, topDS));
        buttons([0.05, 0.22, 0.4, 0.58, 0.74].map((y) => y * tl), 0.004, dark);
        for (const sg of [1, -1]) {
          const flap = mesh(ellipsoid(0.04 * s, 0.014 * s, 0.006 * s, 8, 4), topDark);
          flap.position.copy(onTorso(0.72 * tl, sg * 0.5, 0.004));
          flap.rotation.y = sg * 0.4;
          add(this.spine, flap, false);
        }
        break;
      case 'shirt':
        // buttoned to the top under a tie, open-necked without one; a waistcoat goes over it (waiters, bartenders)
        if (L.tie) tie();
        else add(this.spine, placket(0.86 * tl, 0.99 * tl, (y) => 0.2 * ramp(0.86 * tl, 0.99 * tl, y), 0.002, skin), false);
        add(this.spine, collar(L.tie ? 0.24 : 0.28, 0.005, 0.022 * s, topDS));
        if (L.vest) {
          shell(0.008, -0.07 * tl, 0.97 * tl, (y) => 0.03 + 0.4 * smoothstep(0.55 * tl, 0.97 * tl, y), toon(L.vest, { side: DS }));
          buttons([0.12 * tl, 0.25 * tl, 0.38 * tl, 0.5 * tl], 0.011, dark);
        } else buttons([0.15, 0.32, 0.5, 0.68].map((y) => y * tl), 0.004, toon(shade(L.top, 1.6)));
        break;
      case 'sweater':
        if (L.neckline === 'v') {
          // A visible crew-neck undershirt inside the V, not a shirt collar.
          add(this.spine, placket(0.78 * tl, torso.yMax, y => 0.45 * ramp(0.78 * tl, 0.99 * tl, y), 0.004, underDS), false);
          add(this.spine, mesh(new THREE.CylinderGeometry(nr + 0.004, nr + 0.009, 0.014 * s, 16, 1, true), underDS, 0, tl + 0.004 * s, -0.01 * s), false);
        } else if (L.neckline === 'turtleneck') {
          add(this.spine, collar(0, 0.007, 0.044 * s, topDS, 0.002));
        } else {
          if (L.under) shirtCollar(underDS, 0.006, 0.3);
          add(this.spine, collar(0, 0.006, 0.006 * s, topDark));
        }
        shell(0.006, hem, -0.1 * tl, () => 0, topDark);
        break;
      case 'dress':
        // Victoria's scoop-neck plum dress, with folded ruffles along both shoulder straps.
        add(this.spine, placket(0.73 * tl, 0.99 * tl, y => 0.75 * Math.sqrt(ramp(0.73 * tl, 0.99 * tl, y)), 0.003, skin), false);
        add(this.spine, mesh(torso.geometry({ seg: 26, rows: 3, e: E, y: [0.975 * tl, torso.yMax], inflate: 0.004 }), skin), false);
        if (L.dressRuffles !== false) for (const sg of [-1, 1]) add(this.spine, mesh(surface(6, 24, (u, v, p) => {
          const y = (0.74 + 0.25 * v) * tl;
          const edge = 0.75 * Math.sqrt(ramp(0.73 * tl, 0.99 * tl, y));
          torso.point(y, sg * (edge + 0.03 + u * 0.34), p, 0.006 + Math.sin(u * Math.PI) * (0.014 + 0.013 * Math.sin(v * Math.PI * 8)), E);
        }), topDS), false);
        break;
      case 'polo':
        add(this.spine, collar(0.3, 0.005, 0.016 * s, topDS));
        buttons([0.86 * tl, 0.92 * tl], 0.004, dark);
        break;
      case 'tee':
        add(this.spine, collar(0, 0.004, 0.004 * s, topDark));
        break;
      case 'hoodie': {
        // a polo underneath (its collar can be a contrast color), then the open zip-up hoodie over it
        const collarMat = toon(L.collar ?? L.under ?? L.top, { side: DS });
        add(this.spine, collar(0.3, 0.005, 0.016 * s, collarMat));
        add(this.spine, placket(0.8 * tl, 0.97 * tl, () => 0.05, 0.004, collarMat), false);
        buttons([0.85 * tl, 0.91 * tl], 0.006, toon('#f4f2ea'));
        const open = (y: number) => 0.3 + 0.32 * smoothstep(0.55 * tl, 0.97 * tl, y);
        shell(0.018, -0.2 * tl, 0.97 * tl, open, topDS);
        shell(0.022, -0.2 * tl, -0.12 * tl, open, topDark); // ribbed waistband
        // zipper tape down both edges of the opening
        const zip = toon(shade(L.top, 0.6), { side: DS });
        for (const sg of [1, -1])
          add(this.spine, mesh(surface(2, 12, (u, v, p) => {
            const y = -0.19 * tl + 1.15 * tl * v;
            torso.point(y, sg * (open(y) + u * 0.05), p, 0.021, E);
          }), zip), false);
        // the hood bunched up behind the neck, and its drawstrings
        add(this.spine, collar(0.75, 0.024, 0.05 * s, topDS, 0.05));
        const hood = mesh(ellipsoid(0.13 * s, 0.075 * s, 0.07 * s, 12, 8), topDS, 0, 0.99 * tl, torso.at(0.95 * tl).zc - torso.at(0.95 * tl).rz - 0.02 * s);
        hood.rotation.x = 0.35;
        add(this.spine, hood);
        const cord = toon('#e8e6e0');
        for (const sg of [1, -1]) {
          const c = mesh(cyl(0.004, 0.004, 0.16 * s, 4), cord, 0, 0, 0);
          c.position.copy(onTorso(0.86 * tl, sg * 0.42, 0.026));
          c.rotation.z = sg * 0.06;
          add(this.spine, c, false);
          const tip = mesh(cyl(0.006, 0.006, 0.02, 4), cord, 0, 0, 0);
          tip.position.copy(onTorso(0.785 * tl, sg * 0.43, 0.028));
          add(this.spine, tip, false);
        }
        break;
      }
    }

    if (L.scarf) {
      const mat = fabric(wardrobePrint(L.scarf, 'floral'), 0.2, DS);
      add(this.spine, collar(0, 0.03, 0.035 * s, mat, 0.035));
      add(this.spine, placket(0.5 * tl, 0.94 * tl, () => 0.28, 0.037, mat), false);
    }
    if (L.beads) {
      const beads = toon(L.beads);
      for (let i = 0; i < 19; i++) {
        const a = Math.PI * i / 18, x = Math.cos(a) * 0.084 * s;
        const y = (0.98 - 0.38 * Math.sin(a)) * tl;
        add(this.spine, mesh(ellipsoid(0.011 * s, 0.012 * s, 0.011 * s, 6, 4), beads, x, y, torso.frontZ(x, y, E) + 0.03), false);
      }
    }
    if (L.boutonniere) {
      const flower = toon(L.boutonniere);
      const pos = onTorso(0.77 * tl, 0.65, 0.038, drape);
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        add(this.spine, mesh(ellipsoid(0.012, 0.013, 0.009, 6, 4), flower, pos.x + Math.cos(a) * 0.012, pos.y + Math.sin(a) * 0.012, pos.z), false);
      }
    }
    if (L.belt) {
      shell(0.027, -0.01 * tl, 0.07 * tl, () => 0, toon(L.belt, { side: DS }));
      add(this.spine, mesh(new THREE.BoxGeometry(0.044 * s, 0.04 * s, 0.014 * s), toon('#d9bd69'), 0, 0.028 * tl, torso.frontZ(0, 0.028 * tl, E) + 0.036), false);
    }

    // ---- skirt + apron hang from a pivot at hip-joint height that follows the thighs
    const apron = L.extras?.includes('apron');
    if (L.skirt || apron) {
      this.skirt = new THREE.Group();
      this.skirt.position.y = -0.04;
      this.hips.add(this.skirt);
    }
    if (L.skirt) {
      const sk = new Profile([[-thigh * 0.86, 0.205 * bx, 0.17 * bz], [-thigh * 0.5, 0.188 * bx, 0.152 * bz], [0, hipR * 1.04, 0.114 * bz], [0.1 * s, hipR * 0.93, 0.1 * bz], [0.13 * s, hipR * 0.82, 0.088 * bz]]);
      const skirtMat = L.print ? fabric(wardrobePrint(L.skirt, L.print), 0.28, DS)
        : style === 'denim' ? fabric(denim(L.skirt), 0.09, DS) : toon(L.skirt, { side: DS });
      add(this.skirt!, mesh(sk.geometry({ seg: 24, rows: 12, e: 0.9, uv: [circ, thigh] }), skirtMat));
    }
    if (apron) {
      const r = Math.max(hipR, torso.at(hem).rx) + 0.014;
      const ap = new Profile([[-0.36 * s, r * 1.1, r * 0.8], [-0.1 * s, r * 1.05, r * 0.76], [0.06 * s, r, r * 0.74]]);
      const apMat = L.apron?.patterned ? toon('#ffffff', { side: DS, map: kitchenPrint() }) : toon('#ece6d8', { side: DS });
      add(this.skirt!, mesh(ap.geometry({ seg: 12, rows: 8, arc: [-1.2, 1.2] }), apMat));
      add(this.skirt!, mesh(new Profile([[0.03 * s, r * 1.02, r * 0.75], [0.07 * s, r, r * 0.74]]).geometry({ seg: 20, rows: 1 }), apMat), false);
      if (L.apron?.bib) {
        add(this.spine, placket(0.02 * tl, 0.84 * tl, y => lerp(0.83, 0.57, y / tl), 0.017, apMat));
        for (const sg of [-1, 1]) add(this.spine, mesh(surface(2, 8, (u, v, p) => {
          torso.point((0.8 + 0.2 * v) * tl, sg * (0.48 + u * 0.13), p, 0.019, E);
        }), toon('#ece6d8', { side: DS })), false);
      }
    }

    // ---- arms
    const shY = tl - (fem ? 0.065 : 0.078) * s;
    const shX = torso.at(shY).rx - (fem ? 0.014 : 0.02) * s;
    for (const side of [1, -1]) {
      const sh = side > 0 ? this.lSh : this.rSh;
      const el = side > 0 ? this.lEl : this.rEl;
      sh.position.set(side * shX, shY, -0.005);
      this.spine.add(sh);
      const ur = 0.05 * ba, er = 0.041 * ba, wr = 0.031 * s;
      add(sh, mesh(limb(ur, er, upper - 0.03, { uv: true }), shortSleeves || sleeveless ? skin : topMat, 0, 0.0, 0));
      if (shortSleeves) {
        const sleeve = new Profile([[-upper * 0.45, ur + 0.012, ur + 0.012], [-upper * 0.2, ur + 0.01, ur + 0.01], [0, ur + 0.008, ur + 0.008], [0.035 * s, ur * 0.8, ur * 0.8], [0.06 * s, 0, 0]]);
        add(sh, mesh(sleeve.geometry({ seg: 12, rows: 8 }), topDS));
      }
      el.position.y = -upper + 0.03;
      sh.add(el);
      const bare = shortSleeves || sleeveless || rolled;
      add(el, mesh(limb(er * 0.98, wr, fore - 0.04, { bulge: 0.005 * ba, bulgeAt: 0.25, uv: true }), bare ? skin : topMat));
      if (rolled) add(el, mesh(new Profile([[-0.06 * s, er + 0.008, er + 0.008], [0.0, er + 0.012, er + 0.012], [0.01, er + 0.009, er + 0.009]]).geometry({ seg: 12, rows: 3 }), topDS));
      if (style === 'hoodie') add(el, mesh(new THREE.CylinderGeometry(wr + 0.008, wr + 0.009, 0.04, 12, 1, true), topDark, 0, -fore + 0.06, 0), false);
      if (L.bangles) for (let i = 0; i < 5; i++) {
        const ring = mesh(new THREE.TorusGeometry(wr + 0.005, 0.006 * s, 5, 12), toon(L.bangles[i % 2]), 0, -fore + (0.045 + i * 0.014) * s, 0);
        ring.rotation.x = Math.PI / 2; add(el, ring, false);
      }
      if (style === 'suit' || style === 'blazer' || (style === 'sweater' && L.under && !L.neckline)) {
        const cuff = mesh(new THREE.CylinderGeometry(wr + 0.006, wr + 0.007, 0.022, 12, 1, true), underDS, 0, -fore + 0.05, 0);
        add(el, cuff, false);
      }
      // hand: palm faces the thigh, thumb forward
      add(el, mesh(ellipsoid(0.018 * s, 0.05 * s, 0.037 * s, 10, 8), skin, 0, -fore - 0.008, 0.004));
      const thumb = mesh(ellipsoid(0.012 * s, 0.026 * s, 0.012 * s, 8, 6), skin, -side * 0.006, -fore + 0.008, 0.034 * s);
      thumb.rotation.x = 0.55;
      add(el, thumb, false);
    }
    // glass prop in right hand
    this.glass = mesh(cyl(0.035, 0.03, 0.12, 10), toon('#d9902a', { emissive: '#5a3008', emissiveIntensity: 0.6 }), 0, -fore - 0.04, 0.06);
    this.glass.visible = false;
    this.rEl.add(this.glass);

    // ---- neck + head
    this.neck.position.y = tl;
    this.spine.add(this.neck);
    const neckTop = 0.02 * H + 0.2 * hh;
    add(this.neck, mesh(limb(nr, nr * 1.12, neckTop, {}), skin, 0, neckTop, -0.01 * s));
    this.head.position.y = 0.02 * H;
    this.neck.add(this.head);
    this.buildHead(L, skin, hairMat);

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  private buildHead(L: Look, skin: THREE.Material, hairMat: THREE.Material) {
    const F = L.face ?? {};
    const hh = this.headH;
    const hy = hh * (F.long ?? 1);
    const jaw = F.jaw ?? 1, nose = F.nose ?? 1, brow = F.brow ?? 1;
    const narrow = L.female ? 0.95 : 1;
    const keys = [
      [0.0, 0.0, 0.0, 0.15], [0.012, 0.075, 0.06, 0.16], [0.05, 0.15, 0.13, 0.15], [0.15, 0.23, 0.24, 0.1],
      [0.32, 0.3, 0.34, 0.035], [0.52, 0.325, 0.395, -0.01], [0.72, 0.32, 0.41, -0.035], [0.88, 0.265, 0.35, -0.05],
      [0.96, 0.17, 0.24, -0.055], [0.995, 0.06, 0.09, -0.055], [1.0, 0, 0, -0.055],
    ].map(([f, rx, rz, zc]) => [f * hy, rx * hh * narrow * (1 + (jaw - 1) * (1 - smoothstep(0.3, 0.6, f))), rz * hh, zc * hh]);
    const head = new Profile(keys);
    const add = (m: THREE.Mesh, body = false) => {
      this.head.add(m);
      if (body) this.bodyMeshes.push(m);
      return m;
    };
    add(mesh(head.geometry({ seg: 28, rows: 22 }), skin), true);
    const fy = (f: number) => f * hy;
    const fz = (x: number, y: number) => head.frontZ(x, y);

    // ears
    for (const sg of [1, -1]) {
      const r = head.at(fy(0.47));
      const ear = add(mesh(ellipsoid(0.045 * hh, 0.115 * hh, 0.075 * hh, 10, 8), skin, sg * (r.rx + 0.012 * hh), fy(0.47), r.zc - 0.05 * hh));
      ear.rotation.set(0, -sg * 0.35, sg * 0.1);
    }
    // nose: bridge, tip, wings
    const ny = fy(0.43);
    const bridge = add(mesh(ellipsoid(0.04 * hh * nose, 0.11 * hh * nose, 0.05 * hh * nose, 10, 8), skin, 0, ny, fz(0, ny) - 0.002 * hh));
    bridge.rotation.x = -0.22;
    const ty = fy(0.365);
    add(mesh(ellipsoid(0.04 * hh * nose, 0.036 * hh * nose, 0.04 * hh * nose, 10, 8), skin, 0, ty, fz(0, ty) + 0.028 * hh * nose));
    for (const sg of [1, -1]) add(mesh(ellipsoid(0.026 * hh, 0.024 * hh, 0.024 * hh, 8, 6), skin, sg * 0.036 * hh * nose, ty - 0.006 * hh, fz(0.036 * hh, ty) + 0.002 * hh));

    // eyes
    const ey = fy(0.53), ex = 0.125 * hh;
    this.eyes.position.set(0, ey, 0);
    this.head.add(this.eyes);
    const white = toon('#f4f1ea');
    const iris = toon(new THREE.Color(L.eyes ?? '#3a2a1c').multiplyScalar(0.7));
    const ez = fz(ex, ey);
    for (const sg of [1, -1]) {
      const w = mesh(ellipsoid(0.066 * hh, (L.female ? 0.052 : 0.047) * hh, 0.03 * hh, 12, 8), white, sg * ex, 0, ez - 0.014 * hh, false);
      w.rotation.y = sg * 0.3;
      this.eyes.add(w);
      const ir = mesh(ellipsoid(0.037 * hh, 0.043 * hh, 0.02 * hh, 10, 8), iris, sg * (ex - 0.006 * hh), -0.002 * hh, ez + 0.004 * hh, false);
      ir.rotation.y = sg * 0.3;
      this.eyes.add(ir);
      if (L.female) {
        const lash = mesh(ellipsoid(0.072 * hh, 0.011 * hh, 0.02 * hh, 10, 6), toon('#1a1210'), sg * ex, 0.038 * hh, ez - 0.004 * hh, false);
        lash.rotation.set(0, sg * 0.3, -sg * 0.12);
        this.eyes.add(lash);
      }
    }
    // brows
    const browMat = toon(new THREE.Color(L.hair).multiplyScalar(0.62));
    this.browY0 = ey + 0.09 * hh;
    const bz = fz(ex, this.browY0) + 0.006 * hh;
    const browGeo = ellipsoid(0.078 * hh, (L.female ? 0.013 : 0.018) * hh * brow, 0.022 * hh, 10, 6);
    this.browL = mesh(browGeo, browMat, ex, this.browY0, bz, false);
    this.browR = mesh(browGeo, browMat, -ex, this.browY0, bz, false);
    this.browL.rotation.order = this.browR.rotation.order = 'YXZ';
    this.browL.rotation.y = 0.3;
    this.browR.rotation.y = -0.3;
    this.head.add(this.browL, this.browR);

    // mouth
    const my = fy(0.24);
    const mouth = new THREE.Group();
    mouth.position.set(0, my, fz(0, my) - 0.006 * hh);
    this.head.add(mouth);
    const lip = toon(new THREE.Color(L.skin).lerp(new THREE.Color(L.female ? '#a8323a' : '#7a3a34'), L.female ? 0.55 : 0.5));
    this.mouthOpen = mesh(ellipsoid(0.07 * hh, 0.05 * hh, 0.02 * hh, 10, 6), toon('#2a0e0c'), 0, -0.02 * hh, 0, false);
    mouth.add(this.mouthOpen);
    mouth.add(mesh(ellipsoid(0.08 * hh, 0.016 * hh, 0.02 * hh, 10, 6), lip, 0, 0, 0.006 * hh, false));
    if (L.female) mouth.add(mesh(ellipsoid(0.055 * hh, 0.016 * hh, 0.018 * hh, 10, 6), lip, 0, -0.03 * hh, 0.002 * hh, false));
    const cornerGeo = ellipsoid(0.03 * hh, 0.012 * hh, 0.018 * hh, 8, 6);
    this.cornerL = mesh(cornerGeo, lip, 0.072 * hh, 0, -0.008 * hh, false);
    this.cornerR = mesh(cornerGeo, lip, -0.072 * hh, 0, -0.008 * hh, false);
    mouth.add(this.cornerL, this.cornerR);

    // facial hair
    const beard = toon(new THREE.Color(L.hair).multiplyScalar(0.7));
    if (L.extras?.includes('stubble'))
      add(mesh(head.geometry({ seg: 16, rows: 8, y: [fy(0.015), fy(0.31)], arc: [-1.35, 1.35], inflate: 0.0035 }), toon(new THREE.Color(L.skin).lerp(new THREE.Color(L.hair), 0.35))));
    if (L.extras?.includes('beard')) {
      // Follow the jaw and cheeks while leaving the animated mouth uncovered.
      add(mesh(surface(28, 10, (u, v, p) => {
        const a = (u * 2 - 1) * 1.65;
        const upper = 0.15 + 0.36 * smoothstep(0.22, 0.85, Math.abs(a));
        head.point(fy(0.015 + (upper - 0.015) * v), a, p, 0.006);
      }), beard));
    }
    if (L.extras?.includes('mustache') || L.extras?.includes('beard')) add(mesh(ellipsoid(0.1 * hh, 0.026 * hh, 0.03 * hh, 10, 6), beard, 0, fy(0.3), fz(0, fy(0.3)) + 0.008 * hh));
    if (L.extras?.includes('goatee')) add(mesh(ellipsoid(0.07 * hh, 0.07 * hh, 0.04 * hh, 10, 6), beard, 0, fy(0.09), fz(0, fy(0.09))));
    if (L.extras?.includes('earrings')) for (const sg of [-1, 1]) {
      const silver = toon('#d8dce4');
      add(mesh(ellipsoid(0.021 * hh, 0.025 * hh, 0.02 * hh, 8, 6), silver, sg * 0.34 * hh, fy(0.34), 0));
      add(mesh(ellipsoid(0.033 * hh, 0.07 * hh, 0.025 * hh, 8, 6), silver, sg * 0.34 * hh, fy(0.24), 0));
    }

    // glasses: thin frames in front of the eyes, temples back to the ears
    if (L.extras?.includes('glasses')) {
      const frame = toon('#5a4a3a');
      const rimR = 0.08 * hh, gz = ez + 0.034 * hh;
      const bar = (a: THREE.Vector3, b: THREE.Vector3) => {
        const m = add(mesh(cyl(0.007 * hh, 0.007 * hh, a.distanceTo(b), 5), frame, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2));
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      };
      for (const sg of [1, -1]) {
        const rim = add(mesh(new THREE.TorusGeometry(rimR, 0.008 * hh, 4, 16), frame, sg * ex, ey, gz));
        rim.rotation.y = sg * 0.3;
        rim.scale.y = 0.8;
        const ear = head.at(fy(0.5));
        const hinge = new THREE.Vector3(sg * (ex + rimR * Math.cos(0.3)), ey + 0.01 * hh, gz - rimR * Math.sin(0.3));
        bar(hinge, new THREE.Vector3(sg * (ear.rx + 0.01 * hh), fy(0.5), ear.zc - 0.04 * hh));
      }
      bar(new THREE.Vector3(-(ex - rimR * 0.95), ey + 0.02 * hh, gz + 0.02 * hh), new THREE.Vector3(ex - rimR * 0.95, ey + 0.02 * hh, gz + 0.02 * hh));
    }

    // hair
    const parts = buildHairGeometry(L.hairStyle, { head, hh: hy, mat: hairMat, neckBase: -0.02 * L.height });
    for (const g of parts.head) add(mesh(g, hairMat), true);
    for (const g of parts.back) {
      const m = mesh(g, hairMat, 0, this.torsoLen + 0.02 * L.height, 0);
      this.spine.add(m);
      this.bodyMeshes.push(m);
    }
    if (L.beanie) {
      const knit = toon(L.beanie);
      const hat = new Profile([[fy(0.73), 0.4 * hh, 0.45 * hh, -0.015], [fy(0.96), 0.42 * hh, 0.46 * hh, -0.02], [fy(1.2), 0.3 * hh, 0.34 * hh, -0.04], [fy(1.28), 0, 0, -0.04]]);
      add(mesh(hat.geometry({ seg: 24, rows: 12 }), knit), true);
      add(mesh(hat.geometry({ seg: 24, rows: 3, y: [fy(0.73), fy(0.86)], inflate: 0.004 }), toon(new THREE.Color(L.beanie).multiplyScalar(0.8))), true);
    }
    if (L.bow) {
      const mat = toon(L.bow);
      for (const sg of [-1, 1]) {
        const wing = add(mesh(ellipsoid(0.14 * hh, 0.1 * hh, 0.045 * hh, 8, 6), mat, (-0.24 + sg * 0.11) * hh, fy(1.05), 0.18 * hh), true);
        wing.rotation.z = sg * -0.45;
      }
      add(mesh(ellipsoid(0.055 * hh, 0.055 * hh, 0.055 * hh, 8, 6), mat, -0.24 * hh, fy(1.05), 0.2 * hh), true);
    }
    if (L.extras?.includes('cap')) {
      const r = head.at(fy(0.85));
      const capMat = toon('#141418');
      const cap = new Profile([[fy(0.76), r.rx + 0.07 * hh, r.rz + 0.07 * hh, r.zc], [fy(0.95), r.rx + 0.06 * hh, r.rz + 0.06 * hh, r.zc], [fy(1.07), r.rx * 0.7, r.rz * 0.75, r.zc], [fy(1.09), 0, 0, r.zc]]);
      add(mesh(cap.geometry({ seg: 18, rows: 8 }), capMat), true);
      const brim = add(mesh(ellipsoid(r.rx * 0.9, 0.014 * hh, 0.22 * hh, 12, 4), capMat, 0, fy(0.79), r.zc + r.rz + 0.1 * hh));
      brim.rotation.x = 0.12;
    }
    if (L.extras?.includes('captainhat')) {
      // white-topped yachting cap: navy band, crown flaring out over it, black visor and a gold badge
      const r = head.at(fy(0.85));
      const p = (f: number, k: number): number[] => [fy(f), r.rx * k + 0.06 * hh, r.rz * k + 0.06 * hh, r.zc];
      const band = new Profile([p(0.76, 1), p(0.9, 1)]);
      add(mesh(band.geometry({ seg: 18, rows: 2 }), toon('#141a2c', { side: THREE.DoubleSide })), true);
      const crown = new Profile([p(0.88, 1), p(0.97, 1.12), p(1.04, 1.16), p(1.08, 1.1), [fy(1.1), 0, 0, r.zc]]);
      add(mesh(crown.geometry({ seg: 18, rows: 8 }), toon('#f2f0ea')), true);
      const front = r.zc + r.rz + 0.06 * hh;
      const visor = add(mesh(ellipsoid(r.rx * 0.85, 0.014 * hh, 0.2 * hh, 12, 4), toon('#101014'), 0, fy(0.78), front + 0.06 * hh));
      visor.rotation.x = 0.28;
      add(mesh(ellipsoid(0.05 * hh, 0.035 * hh, 0.012 * hh, 8, 4), toon('#d4a83a', { emissive: '#3a2a08', emissiveIntensity: 0.5 }), 0, fy(0.84), front + 0.006 * hh));
    }
  }

  // ------------------------------------------------------------- controls

  get position() {
    return this.root.position;
  }

  get headWorld() {
    const v = new THREE.Vector3();
    this.head.getWorldPosition(v);
    v.y += this.headH * 0.55;
    return v;
  }

  get remainingPath() {
    return this.path.map(p => p.clone());
  }

  get isWalking() {
    return this.path.length > 0;
  }

  get isSitting() {
    return this.seatHeight !== null;
  }

  place(pos: THREE.Vector3, facing: number, seatHeight: number | null, opts: { pose?: SitPose; prop?: THREE.Object3D } = {}) {
    this.root.position.copy(pos);
    this.root.rotation.y = facing;
    this.facing = this.targetFacing = facing;
    this.seatHeight = seatHeight;
    this.sitBlend = seatHeight !== null ? 1 : 0;
    this.sitPose = seatHeight !== null ? opts.pose ?? 'upright' : 'upright';
    this.setLapProp(opts.prop ?? null);
    this.path = [];
    this.scooting = false;
    this.onArrive = null;
    this.gesture = null;
    this.lookAt = null;
    this.talking = false;
    this.talkLevel = 1;
    this.walking = 0;
    this.update(0, 0, true);
    this.root.updateWorldMatrix(true, true);
  }

  /** Walk along waypoints; resolves when arrived. With `scoot`, slide along them sitting down (there's no standing up in a car). */
  walk(points: THREE.Vector3[], final: { facing: number; seat: number | null; scoot?: boolean; pose?: SitPose; prop?: THREE.Object3D }) {
    return new Promise<void>((resolve) => {
      if (this.onArrive) this.onArrive();
      this.path = points.map((p) => p.clone());
      this.scooting = !!final.scoot;
      this.seatHeight = final.scoot ? final.seat ?? this.seatHeight ?? 0.42 : null; // stand up first
      this.sitPose = 'upright';
      this.setLapProp(null);
      this.onArrive = () => {
        this.onArrive = null;
        this.scooting = false;
        this.targetFacing = final.facing;
        this.seatHeight = final.seat;
        this.sitPose = final.pose ?? 'upright';
        this.setLapProp(final.prop ?? null);
        resolve();
      };
      if (!this.path.length) this.onArrive();
    });
  }

  /** Something held in the lap (a pillow to hug), carried by the hips. */
  private setLapProp(o: THREE.Object3D | null) {
    if (this.lapProp === o) return;
    if (this.lapProp) this.hips.remove(this.lapProp);
    this.lapProp = o;
    if (o) this.hips.add(o);
  }

  setEmotion(e: Emotion | undefined) {
    if (e && FACES[e]) this.emotion = e;
  }

  doGesture(g: Gesture | undefined) {
    if (!g || g === 'none' || !(g in GESTURE_DUR)) return 0;
    this.gesture = { g, t: 0, dur: GESTURE_DUR[g] };
    this.gestureBeatFired = false;
    return GESTURE_DUR[g];
  }

  /** Small flinch, e.g. after being slapped. */
  react() {
    this.reactT = 0.6;
  }

  faceTowards(p: THREE.Vector3, cheat = 0.25) {
    const dx = p.x - this.root.position.x;
    const dz = p.z - this.root.position.z;
    if (dx * dx + dz * dz < 0.01) return;
    const a = Math.atan2(dx, dz);
    // "cheat out" toward the audience (+z) like sitcom actors do
    this.targetFacing = a + angleDiff(a, 0) * cheat;
  }

  // --------------------------------------------------------------- update

  update(dt: number, t: number, snap = false) {
    if (!this.root.visible && !snap) return;
    const p = this.pose;
    const target = zeroPose();

    // --- locomotion
    const sitting = this.seatHeight !== null;
    this.sitBlend += ((sitting ? 1 : 0) - this.sitBlend) * damp(7, dt);
    let moving = false;
    if (this.path.length && (this.sitBlend < 0.3 || this.scooting)) {
      const next = this.path[0];
      const pos = this.root.position;
      const dx = next.x - pos.x, dz = next.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const speed = this.scooting ? 0.9 : 1.45;
      if (dist < 0.05) {
        pos.x = next.x;
        pos.z = next.z;
        this.path.shift();
        if (!this.path.length) this.onArrive?.();
      } else {
        const step = Math.min(dist, speed * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        if (!this.scooting) {
          this.targetFacing = Math.atan2(dx, dz);
          moving = true;
        }
      }
    }
    this.walking += ((moving ? 1 : 0) - this.walking) * damp(10, dt);
    if (moving) this.walkPhase += dt * 8.2;
    this.facing = dampAngle(this.facing, this.targetFacing, moving ? 10 : 6, dt);
    this.root.rotation.y = this.facing;

    const ph = this.walkPhase;
    const w = this.walking;
    const sb = this.sitBlend;
    const s = this.seed;
    target.lHip = lerp(-Math.sin(ph) * 0.55 * w, -Math.PI / 2, sb);
    target.rHip = lerp(Math.sin(ph) * 0.55 * w, -Math.PI / 2, sb);
    target.lKnee = lerp(Math.max(0, Math.cos(ph)) * 0.9 * w, Math.PI / 2, sb);
    target.rKnee = lerp(Math.max(0, -Math.cos(ph)) * 0.9 * w, Math.PI / 2, sb);
    const seat = this.seatHeight ?? 0.45;
    this.hips.position.y = lerp(this.legLen + Math.abs(Math.cos(ph)) * 0.035 * w, seat + 0.06, sb) + this.bounce;
    // shift hips back onto the seat when sitting
    this.hips.position.z = -0.12 * sb;

    // arms: rest pose / walk swing / sitting
    target.lSh = [Math.sin(ph) * 0.45 * w - 0.35 * sb, 0, 0.09];
    target.rSh = [-Math.sin(ph) * 0.45 * w - 0.35 * sb, 0, -0.09];
    target.lEl = -0.15 - 0.25 * w - 0.75 * sb;
    target.rEl = -0.15 - 0.25 * w - 0.75 * sb;

    // idle life
    target.spine = [0.02 + noise1(t * 0.3 + s) * 0.02, noise1(t * 0.2 + s * 2) * 0.04, noise1(t * 0.25 + s) * 0.025];
    this.spine.scale.y = 1 + Math.sin(t * 1.6 + s) * 0.008;

    if (this.sitPose === 'cross_legged') {
      // knees splayed out over the cushion, shins folded in and crossed in front, arms wrapped around the lap prop
      const k = sb;
      target.lHip = lerp(target.lHip, -Math.PI / 2 + 0.12, k);
      target.rHip = lerp(target.rHip, -Math.PI / 2 + 0.2, k);
      target.lHipZ = 0.88 * k;
      target.rHipZ = -0.88 * k;
      target.lKnee = lerp(target.lKnee, 0, k);
      target.rKnee = lerp(target.rKnee, 0, k);
      target.lKneeZ = -2.6 * k;
      target.rKneeZ = 2.6 * k;
      this.hips.position.y += 0.02 * k;
      target.lSh = [lerp(target.lSh[0], -0.62, k), 0, lerp(target.lSh[2], -0.3, k)];
      target.rSh = [lerp(target.rSh[0], -0.62, k), 0, lerp(target.rSh[2], 0.3, k)];
      target.lEl = lerp(target.lEl, -1.5, k);
      target.rEl = lerp(target.rEl, -1.5, k);
      // a little forward hunch over the pillow; fidgets
      target.spine[0] += 0.1 * k;
      target.spine[1] += noise1(t * 0.13 + s) * 0.06 * k;
    } else if (this.sitPose === 'sprawl') {
      // slid down and forward on the seat, leaning back, one knee up, one arm along the backrest
      const k = sb;
      this.hips.position.z += 0.12 * k;
      target.lHip = lerp(target.lHip, -Math.PI / 2 - 0.5, k);
      target.lHipZ = 0.55 * k;
      target.lKnee = lerp(target.lKnee, Math.PI / 2 + 0.85, k);
      target.rHip = lerp(target.rHip, -Math.PI / 2 + 0.1, k);
      target.rHipZ = -0.22 * k;
      target.rKnee = lerp(target.rKnee, Math.PI / 2 - 0.15, k);
      target.lSh = [lerp(target.lSh[0], 0.3, k), 0, lerp(target.lSh[2], 1.45, k)];
      target.lEl = lerp(target.lEl, -0.45, k);
      target.rSh = [lerp(target.rSh[0], -0.45, k), 0, lerp(target.rSh[2], -0.12, k)];
      target.rEl = lerp(target.rEl, -0.9, k);
      // ...and listing toward the arm on the backrest
      target.spine[0] -= 0.42 * k;
      target.spine[2] -= 0.16 * k;
    }

    // --- face & emotion
    const fTarget = FACES[this.emotion];
    const k = damp(6, dt);
    for (const key of Object.keys(fTarget) as (keyof Face)[]) this.face[key] += (fTarget[key] - this.face[key]) * k;
    const f = this.face;
    target.head = [f.headDown, 0, f.headTilt];
    // a slouch tips the head back; chin comes forward again to keep looking ahead
    if (this.sitPose === 'sprawl') {
      target.head[0] += 0.34 * sb;
      target.head[2] += 0.08 * sb;
    }
    if (this.emotion === 'excited' && !moving) this.bounce = Math.max(0, Math.sin(t * 9)) * 0.025 * (1 - sb);
    else this.bounce *= 1 - damp(10, dt);
    if (this.emotion === 'nervous') target.spine[1] += Math.sin(t * 7) * 0.04;

    // --- talking
    this.talkEnv += ((this.talking ? 1 : 0) - this.talkEnv) * damp(14, dt);
    let mouth = f.mouthBase;
    if (this.talkEnv > 0.01) {
      const flap = Math.max(0, noise1(t * 13 + s)) * 0.8 + Math.max(0, Math.sin(t * 21 + s)) * 0.45;
      const level = this.talkLevel;
      mouth = Math.max(mouth, Math.min(1.25, flap * level) * this.talkEnv);
      target.head[0] += noise1(t * 2.7 + s) * 0.08 * level * this.talkEnv;
      target.head[2] += noise1(t * 1.9 + s * 3) * 0.06 * level * this.talkEnv;
      // shouting leans in, whispering hunches toward the listener
      target.spine[0] += (level > 1 ? 0.1 * (level - 1) : 0.12 * (1 - level)) * this.talkEnv;
      // conversational hand accents
      this.accent.t -= dt;
      if (this.accent.t < -rand(0.4, 1.4) && !this.gesture && !moving) {
        this.accent = { t: rand(0.7, 1.3), side: Math.random() < 0.5 ? 1 : -1, dur: 0 };
        this.accent.dur = this.accent.t;
      }
      if (this.accent.t > 0 && !this.gesture) {
        const a = Math.sin((1 - this.accent.t / this.accent.dur) * Math.PI) * this.talkEnv;
        if (this.accent.side > 0) {
          target.lSh[0] -= 0.55 * a; target.lEl -= 0.9 * a; target.lSh[2] += 0.1 * a;
        } else {
          target.rSh[0] -= 0.55 * a; target.rEl -= 0.9 * a; target.rSh[2] -= 0.1 * a;
        }
      }
    }
    this.mouthOpen.scale.y = 0.05 + clamp(mouth, 0, 1) * 1.1;
    this.mouthOpen.scale.x = 0.7 + clamp(mouth, 0, 1) * 0.2;
    this.cornerL.rotation.z = f.smile * 0.6;
    this.cornerR.rotation.z = -f.smile * 0.6;
    this.cornerL.position.y = this.cornerR.position.y = f.smile * 0.006;
    this.browL.position.y = this.browY0 + f.browY + f.browAsym;
    this.browR.position.y = this.browY0 + f.browY;
    this.browL.rotation.z = f.browTilt;
    this.browR.rotation.z = -f.browTilt;

    // blink
    this.blinkT -= dt;
    if (this.blinkT < 0) this.blinkT = rand(2, 5.5);
    this.eyes.scale.y = this.blinkT < 0.12 ? 0.1 : this.emotion === 'surprised' ? 1.25 : this.emotion === 'bored' ? 0.62 : 1;

    // --- look at
    if (this.lookAt) {
      const hp = this.root.position;
      const yaw = angleDiff(this.facing, Math.atan2(this.lookAt.x - hp.x, this.lookAt.z - hp.z));
      const yawC = clamp(yaw, -1.2, 1.2);
      // seated people twist their torso a bit
      target.spine[1] += yawC * 0.3;
      target.head[1] += yawC * 0.7;
      // when standing and the target is far around, turn the body
      // ...but never turn their back fully on the audience
      if (!this.isSitting && !moving && Math.abs(yaw) > 1.0 && !this.talking) {
        const turned = this.facing + yaw * 0.6;
        if (Math.abs(angleDiff(0, turned)) < 1.9) this.targetFacing = turned;
      }
    }

    // --- gesture overrides
    this.glass.visible = this.holdingGlass;
    if (this.gesture) {
      const gs = this.gesture;
      gs.t += dt;
      const u = gs.t / gs.dur;
      if (u >= 1) this.gesture = null;
      else {
        const env = Math.min(1, gs.t / 0.22, (gs.dur - gs.t) / 0.25);
        this.applyGesture(gs.g, gs.t, u, env, target);
        if (!this.gestureBeatFired && u > 0.45) {
          this.gestureBeatFired = true;
          this.onGestureBeat?.(gs.g);
        }
      }
    }
    if (this.reactT > 0) {
      this.reactT -= dt;
      target.head[1] += Math.sin(this.reactT * 10) * 0.5 * this.reactT;
      target.spine[2] += 0.1 * this.reactT;
    }

    // --- apply pose with smoothing
    const lam = snap ? 1 : damp(14, dt);
    const mix3 = (a: V3, b: V3) => {
      a[0] += (b[0] - a[0]) * lam; a[1] += (b[1] - a[1]) * lam; a[2] += (b[2] - a[2]) * lam;
    };
    mix3(p.lSh, target.lSh); mix3(p.rSh, target.rSh); mix3(p.spine, target.spine); mix3(p.head, target.head);
    p.lEl += (target.lEl - p.lEl) * lam; p.rEl += (target.rEl - p.rEl) * lam;
    const legLam = snap ? 1 : damp(18, dt);
    p.lHip += (target.lHip - p.lHip) * legLam; p.rHip += (target.rHip - p.rHip) * legLam;
    p.lKnee += (target.lKnee - p.lKnee) * legLam; p.rKnee += (target.rKnee - p.rKnee) * legLam;
    p.lHipZ += (target.lHipZ - p.lHipZ) * legLam; p.rHipZ += (target.rHipZ - p.rHipZ) * legLam;
    p.lKneeZ += (target.lKneeZ - p.lKneeZ) * legLam; p.rKneeZ += (target.rKneeZ - p.rKneeZ) * legLam;

    this.lSh.rotation.set(...p.lSh);
    this.rSh.rotation.set(...p.rSh);
    this.lEl.rotation.x = p.lEl;
    this.rEl.rotation.x = p.rEl;
    this.lHip.rotation.set(p.lHip, 0, p.lHipZ);
    this.rHip.rotation.set(p.rHip, 0, p.rHipZ);
    this.lKnee.rotation.set(p.lKnee, 0, p.lKneeZ);
    this.rKnee.rotation.set(p.rKnee, 0, p.rKneeZ);
    // the skirt follows both thighs, so it drapes over the lap when sitting
    if (this.skirt) this.skirt.rotation.x = ((p.lHip + p.rHip) / 2) * 0.92;
    this.spine.rotation.set(...p.spine);
    this.head.rotation.set(p.head[0] * 0.7, p.head[1] * 0.75, p.head[2]);
    this.neck.rotation.set(p.head[0] * 0.3, p.head[1] * 0.25, 0);
  }

  private applyGesture(g: Gesture, s: number, u: number, env: number, T: Pose) {
    const set = (key: 'lSh' | 'rSh', v: V3) => {
      T[key] = [lerp(T[key][0], v[0], env), lerp(T[key][1], v[1], env), lerp(T[key][2], v[2], env)];
    };
    const el = (key: 'lEl' | 'rEl', v: number) => {
      T[key] = lerp(T[key], v, env);
    };
    switch (g) {
      case 'wave':
        set('rSh', [-0.2, 0, -2.5 + 0.3 * Math.sin(s * 12)]); el('rEl', -0.35);
        break;
      case 'point':
        set('rSh', [-1.5, 0, -0.05]); el('rEl', -0.05);
        break;
      case 'shrug':
        set('lSh', [-0.35, 0, 0.5]); set('rSh', [-0.35, 0, -0.5]); el('lEl', -1.35); el('rEl', -1.35);
        T.head[2] += 0.18 * env; T.spine[0] -= 0.05 * env;
        break;
      case 'facepalm':
        set('rSh', [-2.05, 0, 0.35]); el('rEl', -2.25); T.head[0] += 0.35 * env;
        break;
      case 'arms_crossed':
        set('lSh', [-0.6, 0, -0.35]); set('rSh', [-0.6, 0, 0.35]); el('lEl', -1.95); el('rEl', -1.95);
        T.head[0] -= 0.06 * env;
        break;
      case 'drink': {
        this.glass.visible = true;
        const sip = Math.sin(clamp((u - 0.15) / 0.7, 0, 1) * Math.PI);
        set('rSh', [-0.75 - 0.4 * sip, 0, 0.25]); el('rEl', -1.9 - 0.4 * sip); T.head[0] -= 0.3 * sip * env;
        break;
      }
      case 'cheers':
        this.glass.visible = true;
        set('rSh', [-2.3, 0, -0.25]); el('rEl', -0.6);
        break;
      case 'thumbs_up':
        set('rSh', [-1.05, 0, -0.15]); el('rEl', -1.1); T.head[2] -= 0.1 * env;
        break;
      case 'high_five':
        set('rSh', [-2.75, 0, -0.3]); el('rEl', -0.25);
        break;
      case 'suit_up': {
        const tug = Math.sin(s * 9) * 0.1;
        set('lSh', [-0.7 + tug, 0, -0.25]); set('rSh', [-0.7 + tug, 0, 0.25]); el('lEl', -1.8); el('rEl', -1.8);
        T.spine[0] -= 0.08 * env; T.head[0] -= 0.12 * env;
        break;
      }
      case 'hands_up':
        set('lSh', [-2.8, 0, 0.3]); set('rSh', [-2.8, 0, -0.3]); el('lEl', -0.2); el('rEl', -0.2);
        T.head[0] -= 0.2 * env;
        break;
      case 'nod':
        T.head[0] += Math.sin(s * 10) * 0.28 * env;
        break;
      case 'shake_head':
        T.head[1] += Math.sin(s * 11) * 0.4 * env;
        break;
      case 'dance': {
        const b = Math.sin(s * 8);
        set('lSh', [-1.5 + 0.8 * b, 0, 0.6]); set('rSh', [-1.5 - 0.8 * b, 0, -0.6]); el('lEl', -1.2); el('rEl', -1.2);
        T.spine[2] += 0.15 * b * env; T.head[2] -= 0.12 * b * env;
        if (!this.isSitting) this.bounce = Math.abs(Math.sin(s * 8)) * 0.05 * env;
        break;
      }
      case 'hug':
        set('lSh', [-1.4, 0, -0.5]); set('rSh', [-1.4, 0, 0.5]); el('lEl', -0.6); el('rEl', -0.6);
        break;
      case 'slap': {
        const swing = clamp((u - 0.2) / 0.35, 0, 1);
        set('rSh', [-1.5, 0, -1.3 + 1.9 * swing]); el('rEl', -0.35);
        T.spine[1] += 0.3 * swing * env;
        break;
      }
      case 'think':
        set('rSh', [-1.15, 0, 0.35]); el('rEl', -2.35); T.head[2] += 0.12 * env; T.head[0] -= 0.12 * env;
        set('lSh', [-0.5, 0, -0.3]); el('lEl', -1.6);
        break;
      case 'none':
        break;
    }
  }
}
