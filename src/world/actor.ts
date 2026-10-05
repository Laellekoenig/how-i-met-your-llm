import * as THREE from 'three';
import type { CharacterDef, Look } from './characters';
import type { Emotion, Gesture } from '../script/types';
import { toon, roundedBox, box, mesh, cyl } from '../engine/materials';
import { plaid } from '../engine/textures';
import { clamp, damp, dampAngle, angleDiff, noise1, rand, lerp } from '../util';

type V3 = [number, number, number];

interface Pose {
  lSh: V3; rSh: V3; lEl: number; rEl: number;
  lHip: number; rHip: number; lKnee: number; rKnee: number;
  spine: V3; head: V3;
}

const zeroPose = (): Pose => ({
  lSh: [0, 0, 0], rSh: [0, 0, 0], lEl: 0, rEl: 0,
  lHip: 0, rHip: 0, lKnee: 0, rKnee: 0,
  spine: [0, 0, 0], head: [0, 0, 0],
});

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
  private headH: number;
  private torsoLen: number;

  // --- state ---
  facing = 0;
  targetFacing = 0;
  seatHeight: number | null = null;
  private sitBlend = 0;
  private path: THREE.Vector3[] = [];
  private onArrive: (() => void) | null = null;
  private walkPhase = 0;
  private walking = 0; // blend
  talking = false;
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
    const H = L.height;
    const b = L.build;
    const W = 0.27 * H * b * (L.female ? 0.88 : 1);
    const D = 0.13 * H * b * (L.female ? 0.9 : 1);
    const armT = 0.055 * H * Math.sqrt(b);
    const legT = 0.075 * H * Math.pow(b, 0.6);
    const upper = 0.17 * H, fore = 0.15 * H;
    const thigh = this.legLen / 2, shin = this.legLen / 2;
    const tl = this.torsoLen;

    const skin = toon(L.skin);
    const skinDark = toon(new THREE.Color(L.skin).multiplyScalar(0.82));
    const topMat = L.plaid ? toon('#ffffff', { map: plaid(L.top, L.plaid[0], L.plaid[1]) }) : toon(L.top);
    const topDark = toon(new THREE.Color(L.top).multiplyScalar(0.7));
    const under = toon(L.under ?? L.top);
    const pants = toon(L.pants);
    const shoes = toon(L.shoes);
    const hairMat = toon(L.hair);
    const add = (parent: THREE.Object3D, m: THREE.Mesh, body = true) => {
      parent.add(m);
      if (body) this.bodyMeshes.push(m);
      return m;
    };

    this.root.add(this.hips);
    this.hips.position.y = this.legLen;

    // pelvis
    add(this.hips, mesh(roundedBox(W * 0.86, 0.16, D * 0.95, 0.03), pants, 0, -0.03, 0));

    // legs
    for (const side of [1, -1]) {
      const hip = side > 0 ? this.lHip : this.rHip;
      const knee = side > 0 ? this.lKnee : this.rKnee;
      hip.position.set(side * W * 0.22, -0.04, 0);
      this.hips.add(hip);
      add(hip, mesh(roundedBox(legT, thigh, legT * 1.08, 0.02), pants, 0, -thigh / 2 + 0.02, 0));
      knee.position.y = -thigh;
      hip.add(knee);
      add(knee, mesh(roundedBox(legT * 0.9, shin - 0.05, legT * 0.95, 0.02), pants, 0, -shin / 2 + 0.02, 0));
      add(knee, mesh(roundedBox(legT * 1.02, 0.08, 0.25, 0.02), shoes, 0, -shin + 0.04, 0.05));
    }

    // torso
    this.hips.add(this.spine);
    add(this.spine, mesh(roundedBox(W, tl, D, 0.045), topMat, 0, tl / 2, 0));
    const front = D / 2;
    switch (L.topStyle) {
      case 'suit': {
        add(this.spine, mesh(box(W * 0.26, tl * 0.42, 0.01), under, 0, tl * 0.77, front + 0.002));
        if (L.tie) {
          const tie = toon(L.tie);
          add(this.spine, mesh(box(0.045, tl * 0.55, 0.012), tie, 0, tl * 0.66, front + 0.008));
          add(this.spine, mesh(box(0.06, 0.04, 0.02), tie, 0, tl * 0.94, front + 0.01));
        }
        for (const s of [1, -1]) {
          const lapel = mesh(box(0.055, tl * 0.46, 0.012), topDark, s * W * 0.15, tl * 0.74, front + 0.007);
          lapel.rotation.z = s * 0.28;
          add(this.spine, lapel);
          add(this.spine, mesh(box(0.05, 0.04, 0.03), under, s * 0.05, tl + 0.005, front - 0.03));
        }
        add(this.spine, mesh(roundedBox(W * 1.02, 0.14, D * 1.04, 0.03), topMat, 0, 0.0, 0));
        if (L.extras?.includes('pocketsquare'))
          add(this.spine, mesh(box(0.06, 0.03, 0.01), toon('#f4f4f4'), W * 0.3, tl * 0.72, front + 0.004));
        add(this.spine, mesh(box(0.012, 0.012, 0.012), toon('#222'), 0, tl * 0.38, front + 0.006));
        break;
      }
      case 'sweater': {
        for (const s of [1, -1]) {
          const tip = mesh(box(0.06, 0.035, 0.012), under, s * 0.045, tl - 0.02, front + 0.002);
          tip.rotation.z = s * 0.5;
          add(this.spine, tip);
        }
        add(this.spine, mesh(roundedBox(W * 1.02, 0.07, D * 1.04, 0.02), topDark, 0, 0.03, 0));
        break;
      }
      case 'flannel': {
        add(this.spine, mesh(box(0.12, 0.06, 0.01), under, 0, tl - 0.04, front + 0.002));
        for (const s of [1, -1]) {
          const c = mesh(box(0.07, 0.04, 0.02), topDark, s * 0.07, tl - 0.01, front - 0.01);
          c.rotation.z = s * 0.4;
          add(this.spine, c);
        }
        break;
      }
      case 'cardigan': {
        add(this.spine, mesh(box(W * 0.3, tl * 0.85, 0.01), under, 0, tl * 0.56, front + 0.002));
        for (let i = 0; i < 3; i++) add(this.spine, mesh(box(0.015, 0.015, 0.01), toon('#e8d27a'), W * 0.17, tl * (0.25 + i * 0.18), front + 0.004));
        add(this.spine, mesh(roundedBox(W * 1.03, 0.14, D * 1.05, 0.03), topMat, 0, 0.0, 0));
        break;
      }
      case 'jacket': {
        // blue top shows in the middle, leather jacket hangs open
        add(this.spine, mesh(box(W * 0.36, tl * 0.92, 0.01), under, 0, tl * 0.5, front + 0.002));
        add(this.spine, mesh(box(W * 0.2, 0.05, 0.03), under, 0, tl - 0.01, front - 0.02));
        for (const s of [1, -1]) {
          const c = mesh(box(0.08, 0.05, 0.03), topDark, s * W * 0.25, tl - 0.01, front - 0.01);
          c.rotation.z = s * 0.35;
          add(this.spine, c);
        }
        add(this.spine, mesh(roundedBox(W * 1.03, 0.1, D * 1.05, 0.03), topMat, 0, 0.0, 0));
        break;
      }
      case 'polo': {
        for (const s of [1, -1]) {
          const c = mesh(box(0.07, 0.035, 0.02), topDark, s * 0.06, tl - 0.01, front - 0.005);
          c.rotation.z = s * 0.4;
          add(this.spine, c);
        }
        break;
      }
      case 'tee':
        break;
    }
    if (L.extras?.includes('apron')) {
      add(this.hips, mesh(box(W * 0.8, 0.42, 0.012), toon('#efe9dc'), 0, -0.14, D / 2 + 0.012));
      add(this.spine, mesh(box(W * 0.8, 0.03, D * 1.04), toon('#efe9dc'), 0, 0.04, 0));
    }

    // arms
    const shortSleeves = L.topStyle === 'tee' || L.topStyle === 'polo';
    for (const side of [1, -1]) {
      const sh = side > 0 ? this.lSh : this.rSh;
      const el = side > 0 ? this.lEl : this.rEl;
      sh.position.set(side * (W / 2 + armT / 2 - 0.015), tl - 0.06, 0);
      this.spine.add(sh);
      add(sh, mesh(roundedBox(armT, upper, armT, 0.02), topMat, 0, -upper / 2 + 0.03, 0));
      el.position.y = -upper + 0.02;
      sh.add(el);
      add(el, mesh(roundedBox(armT * 0.9, fore, armT * 0.9, 0.02), shortSleeves ? skin : topMat, 0, -fore / 2, 0));
      if (L.topStyle === 'suit') add(el, mesh(box(armT * 0.95, 0.03, armT * 0.95), under, 0, -fore + 0.02, 0));
      add(el, mesh(roundedBox(armT * 0.85, 0.1, armT * 0.55, 0.015), skin, 0, -fore - 0.04, 0.01));
    }
    // glass prop in right hand
    this.glass = mesh(cyl(0.035, 0.03, 0.12, 6), toon('#d9902a', { emissive: '#5a3008', emissiveIntensity: 0.6 }), 0, -fore - 0.05, 0.06);
    this.glass.visible = false;
    this.rEl.add(this.glass);

    // neck + head
    this.neck.position.y = tl;
    this.spine.add(this.neck);
    add(this.neck, mesh(cyl(armT * 0.55, armT * 0.6, 0.03 * H + 0.04, 6), skin, 0, 0.01, 0));
    this.head.position.y = 0.03 * H;
    this.neck.add(this.head);
    const hh = this.headH, hw = hh * 0.82, hd = hh * 0.92;
    add(this.head, mesh(roundedBox(hw, hh, hd, 0.035), skin, 0, hh / 2, 0));
    const fz = hd / 2;
    // ears + nose
    for (const s of [1, -1]) add(this.head, mesh(box(0.025, 0.05, 0.04), skinDark, s * (hw / 2 + 0.008), hh * 0.47, 0), false);
    add(this.head, mesh(box(0.032, 0.05, 0.035), skinDark, 0, hh * 0.43, fz + 0.012), false);
    // eyes
    this.eyes.position.set(0, hh * 0.56, fz + 0.004);
    this.head.add(this.eyes);
    const white = toon('#f4f1ea');
    const pupil = toon('#1a1210');
    for (const s of [1, -1]) {
      this.eyes.add(mesh(box(0.048, 0.04, 0.01), white, s * hw * 0.23, 0, 0, false));
      this.eyes.add(mesh(box(0.026, 0.034, 0.01), pupil, s * hw * 0.23 - s * 0.004, -0.002, 0.007, false));
    }
    // brows
    const browMat = toon(new THREE.Color(L.hair).multiplyScalar(0.6));
    this.browL = mesh(box(0.065, 0.016, 0.016), browMat, hw * 0.23, hh * 0.56 + 0.045, fz + 0.008, false);
    this.browR = mesh(box(0.065, 0.016, 0.016), browMat, -hw * 0.23, hh * 0.56 + 0.045, fz + 0.008, false);
    this.head.add(this.browL, this.browR);
    // mouth
    const lip = toon('#8a3a32');
    const mouth = new THREE.Group();
    mouth.position.set(0, hh * 0.24, fz + 0.004);
    this.head.add(mouth);
    this.mouthOpen = mesh(box(0.06, 0.04, 0.01), toon('#2a0e0c'), 0, -0.012, 0, false);
    mouth.add(this.mouthOpen);
    mouth.add(mesh(box(0.06, 0.012, 0.012), lip, 0, 0, 0.002, false));
    this.cornerL = mesh(box(0.024, 0.012, 0.012), lip, 0.036, 0, 0.002, false);
    this.cornerR = mesh(box(0.024, 0.012, 0.012), lip, -0.036, 0, 0.002, false);
    mouth.add(this.cornerL, this.cornerR);
    if (L.extras?.includes('mustache')) add(this.head, mesh(box(0.08, 0.022, 0.02), hairMat, 0, hh * 0.33, fz + 0.012), false);
    if (L.extras?.includes('stubble')) add(this.head, mesh(box(hw * 0.86, hh * 0.32, 0.01), toon(new THREE.Color(L.skin).multiplyScalar(0.72)), 0, hh * 0.2, fz + 0.001), false);

    this.buildHair(L, hh, hw, hd, hairMat);
    if (L.extras?.includes('cap')) {
      const capMat = toon('#141418');
      add(this.head, mesh(cyl(hw * 0.62, hw * 0.6, 0.09, 8), capMat, 0, hh + 0.03, 0));
      add(this.head, mesh(box(hw * 0.8, 0.015, 0.09), capMat, 0, hh - 0.005, fz + 0.03));
    }

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  private buildHair(L: Look, hh: number, hw: number, hd: number, mat: THREE.Material) {
    const h = (w: number, ht: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
      const m = mesh(roundedBox(w, ht, d, Math.min(0.015, w / 3, ht / 3, d / 3)), mat, x, y, z);
      m.rotation.set(rx, ry, rz);
      this.head.add(m);
      this.bodyMeshes.push(m);
      return m;
    };
    const fz = hd / 2;
    const cap = (t: number) => h(hw + 0.03, t, hd + 0.03, 0, hh - t / 2 + 0.025, -0.003);
    const back = (frac: number, thick = 0.035) => h(hw + 0.03, hh * frac, thick, 0, hh - (hh * frac) / 2 + 0.01, -fz - thick / 2 + 0.01);
    const sides = (frac: number, thick = 0.03, depth = 0.8) => {
      for (const s of [1, -1]) h(thick, hh * frac, hd * depth, s * (hw / 2 + thick / 2 - 0.004), hh - (hh * frac) / 2 + 0.01, -hd * 0.08);
    };
    switch (L.hairStyle) {
      case 'swoop':
        cap(0.07); back(0.62); sides(0.38);
        h(hw * 0.95, 0.075, 0.1, 0.015, hh + 0.035, fz - 0.03, -0.4, 0, -0.06);
        break;
      case 'messy':
        cap(0.06); back(0.58); sides(0.36);
        for (let i = 0; i < 6; i++) h(0.065, 0.045, 0.065, rand(-hw * 0.35, hw * 0.35), hh + 0.04, rand(-hd * 0.3, hd * 0.35), rand(-0.4, 0.4), rand(0, 1), rand(-0.4, 0.4));
        h(hw * 0.9, 0.045, 0.04, 0, hh - 0.01, fz, -0.2, 0, 0.05);
        break;
      case 'neat':
        cap(0.055); back(0.5); sides(0.3);
        h(hw * 0.62, 0.05, 0.07, -hw * 0.12, hh + 0.03, fz - 0.03, -0.25, 0, 0.08);
        break;
      case 'bob':
        cap(0.06); back(0.95, 0.06); sides(0.92, 0.045, 0.95);
        h(hw + 0.02, hh * 0.24, 0.035, 0, hh - hh * 0.12, fz + 0.012);
        break;
      case 'long':
        cap(0.06); back(1.95, 0.06); sides(1.6, 0.045, 0.62);
        h(hw * 0.75, 0.06, 0.035, hw * 0.15, hh - 0.02, fz + 0.012, 0, 0, 0.3);
        break;
      case 'ponytail':
        cap(0.06); back(0.6); sides(0.32);
        h(0.075, 0.26, 0.075, 0, hh * 0.5, -fz - 0.06, 0.35);
        h(hw * 0.7, 0.04, 0.03, -hw * 0.1, hh - 0.01, fz + 0.008, 0, 0, -0.15);
        break;
      case 'buzz':
        cap(0.03); back(0.42, 0.02); sides(0.25, 0.015);
        break;
      case 'short':
        cap(0.045); back(0.45); sides(0.3);
        break;
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

  get isWalking() {
    return this.path.length > 0;
  }

  get isSitting() {
    return this.seatHeight !== null;
  }

  place(pos: THREE.Vector3, facing: number, seatHeight: number | null) {
    this.root.position.copy(pos);
    this.facing = this.targetFacing = facing;
    this.seatHeight = seatHeight;
    this.sitBlend = seatHeight !== null ? 1 : 0;
    this.path = [];
    this.onArrive = null;
    this.gesture = null;
    this.lookAt = null;
    this.talking = false;
  }

  /** Walk along waypoints; resolves when arrived. */
  walk(points: THREE.Vector3[], final: { facing: number; seat: number | null }) {
    return new Promise<void>((resolve) => {
      if (this.onArrive) this.onArrive();
      this.path = points.map((p) => p.clone());
      this.seatHeight = null; // stand up first
      this.onArrive = () => {
        this.onArrive = null;
        this.targetFacing = final.facing;
        this.seatHeight = final.seat;
        resolve();
      };
      if (!this.path.length) this.onArrive();
    });
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

  update(dt: number, t: number) {
    if (!this.root.visible) return;
    const p = this.pose;
    const target = zeroPose();

    // --- locomotion
    const sitting = this.seatHeight !== null;
    this.sitBlend += ((sitting ? 1 : 0) - this.sitBlend) * damp(7, dt);
    let moving = false;
    if (this.path.length && this.sitBlend < 0.3) {
      const next = this.path[0];
      const pos = this.root.position;
      const dx = next.x - pos.x, dz = next.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const speed = 1.45;
      if (dist < 0.05) {
        pos.x = next.x;
        pos.z = next.z;
        this.path.shift();
        if (!this.path.length) this.onArrive?.();
      } else {
        const step = Math.min(dist, speed * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        this.targetFacing = Math.atan2(dx, dz);
        moving = true;
      }
    }
    this.walking += ((moving ? 1 : 0) - this.walking) * damp(10, dt);
    if (moving) this.walkPhase += dt * 8.2;
    this.facing = dampAngle(this.facing, this.targetFacing, moving ? 10 : 6, dt);
    this.root.rotation.y = this.facing;

    const ph = this.walkPhase;
    const w = this.walking;
    const sb = this.sitBlend;
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
    const s = this.seed;
    target.spine = [0.02 + noise1(t * 0.3 + s) * 0.02, noise1(t * 0.2 + s * 2) * 0.04, noise1(t * 0.25 + s) * 0.025];
    this.spine.scale.y = 1 + Math.sin(t * 1.6 + s) * 0.008;

    // --- face & emotion
    const fTarget = FACES[this.emotion];
    const k = damp(6, dt);
    for (const key of Object.keys(fTarget) as (keyof Face)[]) this.face[key] += (fTarget[key] - this.face[key]) * k;
    const f = this.face;
    target.head = [f.headDown, 0, f.headTilt];
    if (this.emotion === 'excited' && !moving) this.bounce = Math.max(0, Math.sin(t * 9)) * 0.025 * (1 - sb);
    else this.bounce *= 1 - damp(10, dt);
    if (this.emotion === 'nervous') target.spine[1] += Math.sin(t * 7) * 0.04;

    // --- talking
    this.talkEnv += ((this.talking ? 1 : 0) - this.talkEnv) * damp(14, dt);
    let mouth = f.mouthBase;
    if (this.talkEnv > 0.01) {
      const flap = Math.max(0, noise1(t * 13 + s)) * 0.8 + Math.max(0, Math.sin(t * 21 + s)) * 0.45;
      mouth = Math.max(mouth, flap * this.talkEnv);
      target.head[0] += noise1(t * 2.7 + s) * 0.08 * this.talkEnv;
      target.head[2] += noise1(t * 1.9 + s * 3) * 0.06 * this.talkEnv;
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
    this.browL.position.y = this.headH * 0.56 + 0.045 + f.browY + f.browAsym;
    this.browR.position.y = this.headH * 0.56 + 0.045 + f.browY;
    this.browL.rotation.z = f.browTilt;
    this.browR.rotation.z = -f.browTilt;

    // blink
    this.blinkT -= dt;
    if (this.blinkT < 0) this.blinkT = rand(2, 5.5);
    this.eyes.scale.y = this.blinkT < 0.12 ? 0.1 : this.emotion === 'surprised' ? 1.25 : 1;

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
    const lam = damp(14, dt);
    const mix3 = (a: V3, b: V3) => {
      a[0] += (b[0] - a[0]) * lam; a[1] += (b[1] - a[1]) * lam; a[2] += (b[2] - a[2]) * lam;
    };
    mix3(p.lSh, target.lSh); mix3(p.rSh, target.rSh); mix3(p.spine, target.spine); mix3(p.head, target.head);
    p.lEl += (target.lEl - p.lEl) * lam; p.rEl += (target.rEl - p.rEl) * lam;
    const legLam = damp(18, dt);
    p.lHip += (target.lHip - p.lHip) * legLam; p.rHip += (target.rHip - p.rHip) * legLam;
    p.lKnee += (target.lKnee - p.lKnee) * legLam; p.rKnee += (target.rKnee - p.rKnee) * legLam;

    this.lSh.rotation.set(...p.lSh);
    this.rSh.rotation.set(...p.rSh);
    this.lEl.rotation.x = p.lEl;
    this.rEl.rotation.x = p.rEl;
    this.lHip.rotation.x = p.lHip;
    this.rHip.rotation.x = p.rHip;
    this.lKnee.rotation.x = p.lKnee;
    this.rKnee.rotation.x = p.rKnee;
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
