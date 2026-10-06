import * as THREE from 'three';
import type { CharacterDef, Idle, Look, TalkStyle } from './characters';
import type { LipTrack } from './lipsync';
import type { Emotion, Gesture, Prop } from '../script/types';
import { toon, mesh, cyl } from '../engine/materials';
import { plaid, tweed, denim, tieWeave, kitchenPrint, wardrobePrint, shirtStripes } from '../engine/textures';
import { Profile, limb, ellipsoid, surface, smoothstep } from '../engine/shapes';
import { buildHairGeometry } from './hair';
import { buildProp, GRIP } from './props';
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
export type SitPose = 'upright' | 'cross_legged' | 'sprawl' | 'driving';

/**
 * Everything an emotion does to someone, face to feet. Faces have to read at 270 lines, so most of the work is done
 * by things that survive the pixels: narrowed or wide eyes, open mouths and teeth, colour in the cheeks, and the whole body's
 * silhouette (a slump, a lean, hands on hips).
 */
interface Face {
  // brows and mouth: the tilt runs inner-end-up (worried) to inner-end-down (cross); `smirk` lifts the left corner
  browY: number; browTilt: number; browAsym: number;
  smile: number; mouthBase: number; smirk: number; teeth: number; round: number;
  // eyes: `lid` from wide (-0.5) through half-closed (0.3) to shut (1); `squint` narrows them too;
  // `side` turns the head away from whoever they're looking at, so only the eyes stay on them
  lid: number; squint: number; side: number;
  blush: number; flush: number; tears: number;
  headTilt: number; headDown: number;
  // body: lean forward (+) or back (-), slumped shoulders, shoulders up round the ears, weight shifting from foot
  // to foot, bouncing on their toes, shaking (with laughter or sobs), fidgeting
  lean: number; slump: number; shrug: number; sway: number; hop: number; shake: number; fidget: number;
  // arms, while they're standing still and not talking with their hands
  hips: number; fists: number; clasp: number; hug: number;
}

const FACE0: Face = {
  browY: 0, browTilt: 0, browAsym: 0, smile: 0, mouthBase: 0, smirk: 0, teeth: 0, round: 0,
  lid: 0, squint: 0, side: 0, blush: 0, flush: 0, tears: 0, headTilt: 0, headDown: 0,
  lean: 0, slump: 0, shrug: 0, sway: 0, hop: 0, shake: 0, fidget: 0, hips: 0, fists: 0, clasp: 0, hug: 0,
};
const face = (f: Partial<Face>): Face => ({ ...FACE0, ...f });

const FACES: Record<Emotion, Face> = {
  neutral:     face({ smile: 0.1 }),
  happy:       face({ browY: 0.008, browTilt: -0.1, smile: 1, mouthBase: 0.25, teeth: 0.6, squint: 0.3, headTilt: 0.05, headDown: -0.05, lean: -0.02 }),
  sad:         face({ browY: 0.004, browTilt: -0.45, smile: -0.8, lid: 0.15, headTilt: 0.08, headDown: 0.22, slump: 1, lean: 0.04 }),
  angry:       face({ browY: -0.01, browTilt: 0.5, smile: -0.6, mouthBase: 0.15, teeth: 0.5, squint: 0.35, lid: 0.1, flush: 0.6, headDown: 0.08, lean: 0.1, shrug: 0.25, fists: 1 }),
  surprised:   face({ browY: 0.022, browTilt: -0.15, mouthBase: 0.8, round: 0.7, lid: -0.5, headDown: -0.12, lean: -0.08, shrug: 0.4 }),
  smug:        face({ browY: 0.004, browAsym: 0.016, smile: 0.7, smirk: 1, lid: 0.2, headTilt: -0.1, headDown: -0.1, lean: -0.08, hips: 1 }),
  confused:    face({ browY: 0.006, browTilt: 0.15, browAsym: 0.014, smile: -0.2, mouthBase: 0.1, smirk: -0.5, headTilt: 0.2, shrug: 0.3 }),
  excited:     face({ browY: 0.016, browTilt: -0.1, smile: 1, mouthBase: 0.55, teeth: 1, lid: -0.25, headDown: -0.1, lean: 0.05, shrug: 0.2, hop: 1 }),
  nervous:     face({ browY: 0.01, browTilt: -0.35, smile: -0.3, mouthBase: 0.12, teeth: 0.8, lid: -0.15, headTilt: 0.1, headDown: 0.1, shrug: 0.7, fidget: 1, clasp: 1 }),
  flirty:      face({ browY: 0.004, browAsym: 0.012, smile: 0.6, smirk: 0.5, lid: 0.25, blush: 0.6, headTilt: 0.15, headDown: 0.05, lean: 0.06 }),
  bored:       face({ browY: -0.005, browTilt: 0.06, browAsym: 0.005, smile: -0.25, lid: 0.32, headTilt: 0.14, headDown: 0.04, slump: 0.4, sway: 1 }),
  embarrassed: face({ browY: 0.008, browTilt: -0.3, smile: 0.3, mouthBase: 0.08, teeth: 0.5, lid: 0.2, blush: 1, side: 0.7, headTilt: 0.12, headDown: 0.25, slump: 0.3, shrug: 0.5, clasp: 0.6 }),
  disgusted:   face({ browY: -0.006, browTilt: 0.35, browAsym: 0.01, smile: -0.7, mouthBase: 0.1, smirk: -0.6, teeth: 0.4, squint: 0.6, side: 0.5, headTilt: -0.08, headDown: -0.06, lean: -0.14 }),
  scared:      face({ browY: 0.02, browTilt: -0.4, smile: -0.4, mouthBase: 0.45, teeth: 0.6, lid: -0.5, headDown: 0.04, lean: -0.12, shrug: 1, shake: 0.35, hug: 1 }),
  suspicious:  face({ browY: -0.004, browTilt: 0.2, browAsym: 0.014, smile: -0.1, smirk: -0.3, lid: 0.3, squint: 0.45, side: 0.8, headDown: 0.06, lean: -0.04 }),
  proud:       face({ browY: 0.006, browTilt: -0.05, smile: 0.8, smirk: 0.2, lid: 0.12, headDown: -0.18, lean: -0.12, hips: 1 }),
  laughing:    face({ browY: 0.012, browTilt: -0.2, smile: 1, mouthBase: 0.7, teeth: 1, lid: 0.25, squint: 1, headDown: -0.15, lean: 0.05, shake: 1 }),
  crying:      face({ browY: 0.01, browTilt: -0.55, smile: -1, mouthBase: 0.3, teeth: 0.5, lid: 0.35, squint: 0.6, flush: 0.25, tears: 1, headDown: 0.25, slump: 0.8, shake: 0.5 }),
  drunk:       face({ browY: 0.006, browTilt: -0.1, browAsym: 0.01, smile: 0.55, smirk: 0.6, mouthBase: 0.1, lid: 0.4, blush: 0.7, flush: 0.2, headTilt: 0.12, sway: 1.8 }),
};

const lerpFace = (a: Face, b: Face, k: number) => {
  const f = { ...a };
  for (const key of Object.keys(f) as (keyof Face)[]) f[key] = a[key] + (b[key] - a[key]) * k;
  return f;
};

/** How long a look lasts before they relax back into their resting face (a drunk stays drunk all scene). */
const HOLD: Partial<Record<Emotion, number>> = {
  surprised: 4, laughing: 4.5, excited: 6, angry: 9, sad: 12, crying: 14, bored: 15, smug: 10, proud: 10, drunk: Infinity,
};

/** What a listener's face picks up from the speaker's. */
const MIRROR: Partial<Record<Emotion, Emotion>> = {
  happy: 'happy', excited: 'happy', laughing: 'happy', proud: 'happy', sad: 'sad', crying: 'sad', angry: 'nervous',
  scared: 'nervous', surprised: 'surprised',
};

/** Arm poses, for the left arm (the right mirrors them): [shoulder x, y, z, elbow]. Solved against Ted's proportions. */
type ArmPose = readonly [number, number, number, number];
/** The hands while talking: their own style, or the mood's (rubbing the back of the neck, wringing them). */
type Accent = TalkStyle | 'neck' | 'wring';
const TMP = new THREE.Vector3();
const FLUSH = new THREE.Color('#d8443a');
const ARM = {
  hips: [1.07, -0.72, 0.98, -1.28],
  clasp: [0.22, -0.88, 0.33, -1.08],
  hug: [-0.44, -1.38, 0.2, -2.02],
  face: [-1.33, -0.38, -0.06, -2.21],
  mouth: [-1.45, -0.58, -0.16, -2.09],
  clapIn: [-0.26, -0.65, 0.26, -1.61],
  clapOut: [-0.04, -0.11, 0.31, -1.91],
  quotes: [-1.2, 0.18, 1.06, -2.19],
  pumpUp: [-1.27, 0.02, 1.01, -2.21],
  pumpDown: [0.26, 0.04, 0.23, -1.93],
  shield: [-1.28, -0.46, 0.21, -2.18],
  neck: [-2.43, -0.72, 0.47, -2.48],
  scratch: [-1.85, -0.79, 1.17, -1.75],
  finger: [-0.56, -0.02, 0.27, -2.13],
  belly: [0.35, -0.67, 0.4, -1.51],
  crossed: [-0.6, 0, -0.35, -1.95],
  lapels: [-0.7, 0, -0.25, -1.8],
} as const satisfies Record<string, ArmPose>;

/** Gestures that come with a face, unless the beat asks for another: when in the gesture it lands. */
const GESTURE_FACE: Partial<Record<Motion, { emotion: Emotion; at: number }>> = {
  crack_up: { emotion: 'laughing', at: 0 }, sob: { emotion: 'crying', at: 0 }, eye_roll: { emotion: 'bored', at: 0 },
  cover_mouth: { emotion: 'surprised', at: 0 }, fist_pump: { emotion: 'excited', at: 0 }, head_in_hands: { emotion: 'sad', at: 0 },
  double_take: { emotion: 'surprised', at: 0.5 }, jaw_drop: { emotion: 'surprised', at: 0 }, spit_take: { emotion: 'surprised', at: 0.45 },
};
export const impliedEmotion = (g: Motion) => GESTURE_FACE[g];
export const gestureDuration = (g: Motion) => GESTURE_DUR[g] ?? 0;

/** When a gesture's beat lands (the slap connects, the glass clinks): most have one, a slow clap has four. */
const GESTURE_BEATS: Partial<Record<Motion, number[]>> = { slow_clap: [0.22, 0.42, 0.62, 0.82] };

/** Little things people do while they wait their turn. */
const IDLE_DUR: Record<Idle, number> = { shift: 3.2, glance: 1.4, scratch_head: 2.4, lapels: 2.2, arms_crossed: 4.5, rub_hands: 2.6, hair: 2.2, sip: 2 };

/** Gestures, plus `give`: holding something out to someone (or reaching to take it). */
export type Motion = Gesture | 'give';

/** Sitting down and standing up are walks, not animations: the stage handles them. */
const GESTURE_DUR: Record<Motion, number> = {
  none: 0, wave: 1.6, point: 1.5, shrug: 1.3, facepalm: 2.0, arms_crossed: 3.2, drink: 2.0, cheers: 1.6,
  thumbs_up: 1.4, high_five: 1.3, suit_up: 1.7, hands_up: 1.6, nod: 1.0, shake_head: 1.1, dance: 3.2,
  hug: 2.2, slap: 1.0, think: 2.2, kiss: 2.0, phone_call: 3.0, sit: 0, stand: 0, lean_in: 2.4, jaw_drop: 2.2,
  fist_bump: 1.4, spit_take: 2.0, give: 1.4, double_take: 1.7, eye_roll: 1.5, crack_up: 2.6, sob: 2.8, slow_clap: 3.2,
  hands_on_hips: 2.8, head_in_hands: 2.6, air_quotes: 1.5, fist_pump: 1.4, cover_mouth: 1.8,
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
  private eyeParts: { sg: number; iris: THREE.Mesh; rx: number; ry: number; rz: number; hh: number }[] = [];
  private browL!: THREE.Mesh; private browR!: THREE.Mesh;
  private mouth!: THREE.Group;
  private mouthOpen!: THREE.Mesh; private cornerL!: THREE.Mesh; private cornerR!: THREE.Mesh;
  private teeth!: THREE.Mesh;
  private faceSkin!: THREE.MeshToonMaterial;
  private skinColor = new THREE.Color();
  private blushMat!: THREE.MeshToonMaterial;
  private cheeks: THREE.Mesh[] = [];
  private tears: { mesh: THREE.Mesh; x: number; y0: number; y1: number; phase: number; z: (x: number, y: number) => number }[] = [];
  private shY0 = 0;
  private glass!: THREE.Mesh;
  /** Where hand props go (in the right hand), and where carried ones are held against the chest. */
  private hand = new THREE.Group();
  private chest = new THREE.Group();
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
  /** Their own face at rest (`neutral`), and the one they're wearing right now. */
  private restFace: Face;
  private face: Face;
  /** How long they've worn the current look; once it's held long enough they relax (slowly) back to rest. */
  private emotionAge = 0;
  private relaxing = false;
  /** Listening to someone talk: the odd nod, and a little of the speaker's mood on their face. */
  listening = false;
  private mirror: Emotion | null = null;
  private nodT = rand(1.5, 4);
  private nodding = 0;
  lookAt: THREE.Vector3 | null = null;
  /** Where the irises are pointed (radians off the head's forward), with little darts around it. */
  private gaze = { x: 0, y: 0 };
  private saccade = { x: 0, y: 0, t: rand(0.5, 2) };
  private lookYaw = 0;
  /** This frame's face extras from a gesture: eyes wide or narrowed, eyes pointed somewhere, shoulders lifted. */
  private fx = { wide: 0, lid: 0, gaze: null as { x: number; y: number } | null, away: 0, lift: 0 };
  /** The line being said, as mouth shapes, and how far into it we are. */
  private lip: LipTrack | null = null;
  private lipT = 0;
  private viseme = { open: 0, round: 0, wide: 0 };
  private idle: { kind: Idle; t: number; dur: number; side: number } | null = null;
  private idleT = rand(3, 9);
  private glance = 0;
  private shoulderLift = 0;
  /** Things to do a moment from now (a listener's reaction landing a beat after the line). */
  private pending: { t: number; fn: () => void }[] = [];
  /** `silent` gestures are their own idea (a sip while waiting): they don't fire the script's beat callbacks. */
  private gesture: { g: Motion; t: number; dur: number; partner: boolean; silent: boolean } | null = null;
  holdingGlass = false;
  /** What they're holding, if anything. */
  prop: Prop | null = null;
  private propObj: THREE.Object3D | null = null;
  /** The phone that appears for a phone call when they weren't already holding one. */
  private callPhone: THREE.Object3D | null = null;
  /** This frame's gesture extras: stepping in (kiss, lean in) and how far the jaw has dropped. */
  private gestureLean = 0;
  private jaw = 0;
  private spray: { drops: THREE.Group; vel: Float32Array; t: number } | null = null;
  private blinkT = rand(1, 4);
  /** The current talking hand gesture; `gap` is how long the hands rest after it before the next. */
  private accent = { t: 0, side: 1, dur: 0, gap: 0, kind: 'open' as Accent, amp: 1 };
  private seed = Math.random() * 100;
  private pose = zeroPose();
  private bounce = 0;
  private reactT = 0;
  onGestureBeat: ((g: Motion) => void) | null = null;
  private gestureBeatsFired = 0;

  constructor(def: CharacterDef) {
    this.def = def;
    const L = def.look;
    const H = (this.height = L.height);
    this.headH = 0.14 * H;
    this.torsoLen = 0.31 * H;
    this.legLen = H - this.headH - 0.03 * H - this.torsoLen;
    const rest = def.manner?.rest;
    this.restFace = rest ? lerpFace(FACES.neutral, FACES[rest.emotion], rest.amount) : { ...FACES.neutral };
    this.face = { ...this.restFace };
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
    const undershirt = (side?: THREE.Side) => L.underPlaid
      ? fabric(plaid(L.under ?? L.top, L.underPlaid[0], L.underPlaid[1]), 0.065, side)
      : L.underStripes ? fabric(shirtStripes(L.under ?? L.top, L.underStripes), 0.032, side)
      : toon(L.under ?? L.top, { side });
    const underMat = undershirt();
    const underDS = undershirt(DS);
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
    const slimSuit = style === 'suit' && L.suitFit === 'slim';
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
    // A slim suit follows the waist; the regular jacket hangs from the chest.
    const chestY = 0.66 * tl, chest = torso.at(chestY);
    const drape = new Profile(T.map(([y, rx, rz, zc]) => y >= chestY ? [y, rx, rz, zc]
      : slimSuit ? [y, rx * (1 - 0.04 * Math.sin(Math.PI * clamp(y / chestY, 0, 1))), rz, zc]
      : [y, Math.max(rx, 0.97 * chest.rx), Math.max(rz, chest.rz), chest.zc]));
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
      }, { uv: mat === underDS && (L.underPlaid || L.underStripes) ? [Math.PI * 2 * nr, tl * 0.035 + height] : undefined }), mat);
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
      if (slimSuit) {
        add(this.spine, mesh(surface(24, 3, (u, v, p) => {
          const a = open + u * (Math.PI * 2 - 2 * open);
          p.set((nr + 0.008 * s) * Math.sin(a), tl + (0.003 + v * 0.021) * s,
            -0.008 * s + (nr + 0.012 * s) * Math.cos(a));
        }, { uv: [Math.PI * 2 * nr, 0.021 * s] }), mat));
      } else add(this.spine, collar(open, inflate, 0.02 * s, mat));
      for (const sg of [1, -1]) {
        if (slimSuit) {
          const inner = onTorso(0.99 * tl, sg * 0.15, inflate + 0.006);
          const outer = onTorso(0.97 * tl, sg * 0.65, inflate + 0.006);
          const point = onTorso(0.87 * tl, sg * 0.33, inflate + 0.009);
          add(this.spine, mesh(surface(6, 6, (u, v, p) => {
            p.copy(inner).lerp(outer, u).lerp(point, v);
          }, { uv: [0.05 * s, 0.07 * s] }), mat), false);
          continue;
        }
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
      const y0 = (slimSuit ? 0.12 : 0.4) * tl, y1 = 0.955 * tl;
      add(this.spine, mesh(surface(4, 10, (u, v, p) => {
        const y = y0 + (y1 - y0) * v;
        const w = (0.012 + (slimSuit ? 0.011 : 0.016) * (1 - v)) * s * smoothstep(0, 0.08, v);
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
        const yb = (slimSuit ? 0.34 : 0.42) * tl;
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
        lapels(0.016, open, yb, slimSuit ? 0.26 : 0.3, toon(shade(L.top, 0.8), { side: DS }), drape);
        add(this.spine, collar(collarOpen(vTop, 0.018), 0.018, 0.012 * s, topDS, 0.02));
        buttons([yb], 0.02, dark, 0, drape);
        if (slimSuit) {
          buttons([0.17 * tl], 0.023, dark, 0.17, drape);
          // Flat pocket welts follow the jacket instead of floating in front.
          for (const [a, y, width] of [[-0.83, 0.12, 0.48], [0.83, 0.12, 0.48], [0.64, 0.71, 0.38]]) {
            add(this.spine, mesh(surface(8, 2, (u, v, p) => {
              drape.point((y + v * 0.019) * tl, a + (u - 0.5) * width, p, 0.024, E);
            }), topDark), false);
          }
        }
        if (L.extras?.includes('pocketsquare')) {
          const sq = mesh(slimSuit ? surface(8, 2, (u, v, p) => {
            drape.point((0.734 + v * 0.018 + u * 0.008) * tl, 0.46 + u * 0.36, p, 0.025, E);
          }) : ellipsoid(0.03 * s, 0.014 * s, 0.006 * s, 8, 4), toon(L.pocketSquare ?? '#f4f4f4', { side: DS }));
          if (!slimSuit) sq.position.copy(onTorso(0.72 * tl, 0.62, 0.024, drape));
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
          if (L.underPlaid) {
            // A close-fitting shirt collar folded over the crew neck. Keep the
            // checked fabric near the neck instead of spreading over the shoulders.
            add(this.spine, mesh(surface(20, 3, (u, v, p) => {
              const a = 0.3 + u * (Math.PI * 2 - 0.6);
              p.set((nr + 0.009 * s) * Math.sin(a), tl + (0.002 + v * 0.024) * s,
                -0.008 * s + (nr + 0.012 * s) * Math.cos(a));
            }, { uv: [Math.PI * 2 * nr, 0.024 * s] }), underDS));
            for (const sg of [-1, 1]) {
              const inner = new THREE.Vector3(sg * 0.016 * s, tl + 0.023 * s, 0.058 * s);
              const outer = new THREE.Vector3(sg * 0.061 * s, tl + 0.014 * s, 0.03 * s);
              const point = new THREE.Vector3(sg * 0.064 * s, 0.9 * tl, torso.frontZ(sg * 0.064 * s, 0.9 * tl, E) + 0.01);
              add(this.spine, mesh(surface(6, 6, (u, v, p) => {
                p.copy(inner).lerp(outer, u).lerp(point, v);
              }, { uv: [0.07 * s, 0.08 * s] }), underDS), false);
            }
          } else if (L.under) shirtCollar(underDS, 0.006, 0.3);
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
    this.shY0 = shY;
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
        const cuffGeo = new THREE.CylinderGeometry(wr + 0.006, wr + 0.007, 0.022, 12, 1, true);
        if (L.underPlaid || L.underStripes) {
          const uv = cuffGeo.getAttribute('uv');
          for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * (wr + 0.007), uv.getY(i) * 0.022);
        }
        const cuff = mesh(cuffGeo, underDS, 0, -fore + 0.05, 0);
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
    this.hand.position.set(0, -fore - 0.035, 0.035);
    this.rEl.add(this.hand);
    const carryY = 0.42 * tl, carry = torso.at(carryY);
    this.chest.position.set(0, carryY, carry.zc + carry.rz + 0.15);
    this.spine.add(this.chest);

    // ---- neck + head
    this.neck.position.y = tl;
    this.spine.add(this.neck);
    const neckTop = 0.02 * H + 0.2 * hh;
    // the face (and neck) get their own skin, so it can flush
    const faceSkin = (this.faceSkin = toon(L.skin, { key: '' }) as THREE.MeshToonMaterial);
    this.skinColor.set(L.skin);
    add(this.neck, mesh(limb(nr, nr * 1.12, neckTop, {}), faceSkin, 0, neckTop, -0.01 * s));
    this.head.position.y = 0.02 * H;
    this.neck.add(this.head);
    this.buildHead(L, faceSkin, hairMat);

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  private buildHead(L: Look, skin: THREE.Material, hairMat: THREE.Material) {
    const F = L.face ?? {};
    const hh = this.headH;
    const hy = hh * (F.long ?? 1);
    const jaw = F.jaw ?? 1, chin = F.chin ?? 1, nose = F.nose ?? 1, brow = F.brow ?? 1;
    const narrow = L.female ? 0.95 : 1;
    const keys = [
      [0.0, 0.0, 0.0, 0.15], [0.012, 0.075, 0.06, 0.16], [0.05, 0.15, 0.13, 0.15], [0.15, 0.23, 0.24, 0.1],
      [0.32, 0.3, 0.34, 0.035], [0.52, 0.325, 0.395, -0.01], [0.72, 0.32, 0.41, -0.035], [0.88, 0.265, 0.35, -0.05],
      [0.96, 0.17, 0.24, -0.055], [0.995, 0.06, 0.09, -0.055], [1.0, 0, 0, -0.055],
    ].map(([f, rx, rz, zc]) => [f * hy,
      rx * hh * narrow * (1 + (jaw - 1) * (1 - smoothstep(0.3, 0.6, f)))
        * (1 + (chin - 1) * (1 - smoothstep(0.05, 0.25, f))),
      rz * hh, zc * hh]);
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

    // eyes: whites, and irises that follow what they're looking at
    const ey = fy(0.53), ex = 0.125 * hh;
    this.eyes.position.set(0, ey, 0);
    this.head.add(this.eyes);
    const white = toon('#f4f1ea');
    const iris = toon(new THREE.Color(L.eyes ?? '#3a2a1c').multiplyScalar(0.7));
    const glint = toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 });
    const ez = fz(ex, ey);
    const rx = 0.066 * hh, ry = (L.female ? 0.052 : 0.047) * hh, rz = 0.03 * hh;
    for (const sg of [1, -1]) {
      const eye = new THREE.Group();
      eye.position.set(sg * ex, 0, ez - 0.014 * hh);
      eye.rotation.y = sg * 0.3;
      this.eyes.add(eye);
      eye.add(mesh(ellipsoid(rx, ry, rz, 12, 8), white, 0, 0, 0, false));
      const ir = mesh(ellipsoid(0.037 * hh, 0.043 * hh, 0.012 * hh, 10, 8), iris, 0, 0, 0, false);
      ir.add(mesh(ellipsoid(0.009 * hh, 0.009 * hh, 0.004 * hh, 6, 4), glint, sg * 0.012 * hh, 0.014 * hh, 0.011 * hh, false));
      eye.add(ir);
      if (L.female) {
        const lash = mesh(ellipsoid(0.072 * hh, 0.011 * hh, 0.02 * hh, 10, 6), toon('#1a1210'), sg * ex, 0.038 * hh, ez - 0.004 * hh, false);
        lash.rotation.set(0, sg * 0.3, -sg * 0.12);
        this.eyes.add(lash);
      }
      this.eyeParts.push({ sg, iris: ir, rx, ry, rz, hh });
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
    const mouth = (this.mouth = new THREE.Group());
    mouth.scale.x = F.mouth ?? 1;
    mouth.position.set(0, my, fz(0, my) - 0.006 * hh);
    this.head.add(mouth);
    // no lips: a dark line that opens into a mouth, with corners that curl up into a smile or down into a frown
    const dark = toon('#2a0e0c');
    this.mouthOpen = mesh(ellipsoid(0.07 * hh, 0.05 * hh, 0.02 * hh, 10, 6), dark, 0, -0.02 * hh, 0, false);
    mouth.add(this.mouthOpen);
    // a row of teeth along the top of the opening: a grin, a grimace, a laugh
    this.teeth = mesh(ellipsoid(0.07 * hh, 0.05 * hh, 0.012 * hh, 10, 4), toon('#f2eee4'), 0, -0.02 * hh, 0.011 * hh, false);
    this.teeth.visible = false;
    mouth.add(this.teeth);
    const cornerGeo = ellipsoid(0.026 * hh, 0.008 * hh, 0.016 * hh, 8, 6);
    this.cornerL = mesh(cornerGeo, dark, 0.066 * hh, -0.02 * hh, -0.002 * hh, false);
    this.cornerR = mesh(cornerGeo, dark, -0.066 * hh, -0.02 * hh, -0.002 * hh, false);
    mouth.add(this.cornerL, this.cornerR);

    // colour in the cheeks (flirting, embarrassment, drink) and tears running down them
    const blush = (this.blushMat = toon(new THREE.Color(L.skin).lerp(new THREE.Color('#e0485a'), 0.75), { key: '' }) as THREE.MeshToonMaterial);
    blush.transparent = true;
    blush.depthWrite = false;
    const cy = fy(0.37);
    for (const sg of [1, -1]) {
      const x = sg * 0.2 * hh;
      const c = mesh(ellipsoid(0.07 * hh, 0.042 * hh, 0.03 * hh, 10, 6), blush, x, cy, fz(x, cy) - 0.016 * hh, false);
      c.rotation.y = sg * 0.55;
      c.visible = false;
      this.head.add(c);
      this.cheeks.push(c);
      const tear = mesh(ellipsoid(0.024 * hh, 0.036 * hh, 0.014 * hh, 6, 4), toon('#cfeeff', { emissive: '#6aa8d8', emissiveIntensity: 0.9 }), 0, 0, 0, false);
      tear.visible = false;
      this.head.add(tear);
      this.tears.push({ mesh: tear, x: sg * 0.15 * hh, y0: ey - 0.07 * hh, y1: fy(0.2), phase: sg > 0 ? 0 : 0.45, z: (x: number, y: number) => fz(x, y) + 0.008 * hh });
    }

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
    this.lip = null;
    this.listening = false;
    this.mirror = null;
    this.idle = null;
    this.pending = [];
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
    if (!e || !FACES[e]) return;
    // a change of heart shows in a blink
    if (e !== this.emotion && this.blinkT > 0.3) this.blinkT = 0.12;
    this.emotion = e;
    this.emotionAge = 0;
    this.relaxing = false;
  }

  /** Back to their own resting face, straight away (a new scene). */
  resetFace() {
    this.emotion = 'neutral';
    this.emotionAge = 0;
    this.relaxing = false;
    this.face = { ...this.restFace };
  }

  /** Listening to someone (null: not any more), picking up a little of how they feel. */
  listen(speaker: Emotion | null) {
    this.listening = speaker !== null;
    this.mirror = speaker ? MIRROR[speaker] ?? null : null;
  }

  /** Start a line: the mouth follows its syllables (or just flaps, without a track). */
  speak(track: LipTrack | null) {
    this.lip = track;
    this.lipT = 0;
  }

  /** The voice has reached a word: pull the mouth back into step with it. */
  syncWord(charIndex: number) {
    if (!this.lip) return;
    const t = this.lip.wordAt(charIndex);
    if (Math.abs(t - this.lipT) > 0.12) this.lipT = t;
  }

  /** Do something a moment from now, on the actor's own clock (so it waits through a pause). */
  later(seconds: number, fn: () => void) {
    if (seconds <= 0) fn();
    else this.pending.push({ t: seconds, fn });
  }

  /**
   * Start a gesture; returns how long it takes. `partner` is for gestures done with someone (a kiss rather than
   * a blown one); `dur` stretches a held one, like a phone call that lasts a whole line.
   */
  doGesture(g: Motion | undefined, opts: { partner?: boolean; dur?: number; silent?: boolean } = {}) {
    if (!g || !GESTURE_DUR[g]) return 0;
    const dur = Math.max(GESTURE_DUR[g], opts.dur ?? 0);
    this.gesture = { g, t: 0, dur, partner: !!opts.partner, silent: !!opts.silent };
    this.gestureBeatsFired = 0;
    this.idle = null;
    return dur;
  }

  /** Pick something up, or put it down (null). Hand props go in the right hand; big ones are carried in both arms. */
  hold(kind: Prop | null) {
    if (this.prop === kind) return;
    this.propObj?.removeFromParent();
    this.propObj = null;
    this.prop = kind;
    if (!kind) return;
    const obj = buildProp(kind);
    const grip = GRIP[kind];
    if (grip === 'arms') this.chest.add(obj);
    else this.hand.add(grip === 'hand' ? upright(obj) : obj);
    this.propObj = grip === 'hand' ? obj.parent! : obj;
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

    if (this.sitPose === 'driving') {
      target.lSh = [-1.15 * sb, 0, 0.05];
      target.rSh = [-1.15 * sb, 0, -0.05];
      target.lEl = target.rEl = -0.55 * sb;
    } else if (this.sitPose === 'cross_legged') {
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

    // --- props: held up in front, or cradled in both arms
    const grip = this.prop ? GRIP[this.prop] : null;
    if (grip === 'hand') {
      target.rSh = [-0.32, 0, -0.1];
      target.rEl = -1.25;
    } else if (grip === 'arms') {
      target.lSh = [-0.85, 0, -0.3];
      target.rSh = [-0.85, 0, 0.3];
      target.lEl = target.rEl = -1.3;
    }

    // --- anything due on their own clock (a reaction landing a beat late)
    if (this.pending.length && dt > 0) {
      for (const job of this.pending) job.t -= dt;
      const due = this.pending.filter((j) => j.t <= 0);
      if (due.length) this.pending = this.pending.filter((j) => j.t > 0);
      for (const j of due) j.fn();
    }

    // --- face & emotion: a look holds a while, then they relax (slowly) back into their own resting face
    this.emotionAge += dt;
    if (this.emotion !== 'neutral' && !this.talking && !this.gesture && this.emotionAge > (HOLD[this.emotion] ?? 7)) {
      this.emotion = 'neutral';
      this.relaxing = true;
    }
    let fTarget = this.emotion === 'neutral' ? this.restFace : FACES[this.emotion];
    if (this.mirror && this.listening && this.emotion === 'neutral') {
      const m = FACES[this.mirror], n = FACES.neutral;
      fTarget = { ...fTarget };
      for (const key of ['browY', 'browTilt', 'smile', 'mouthBase', 'teeth', 'lid'] as const) fTarget[key] += (m[key] - n[key]) * 0.3;
    }
    const k = damp(this.relaxing ? 1.6 : 6, dt);
    for (const key of Object.keys(fTarget) as (keyof Face)[]) this.face[key] += (fTarget[key] - this.face[key]) * k;
    const f = this.face;
    target.head = [f.headDown, 0, f.headTilt];
    // a slouch tips the head back; chin comes forward again to keep looking ahead
    if (this.sitPose === 'sprawl') {
      target.head[0] += 0.34 * sb;
      target.head[2] += 0.08 * sb;
    }
    // only the dance action hops; let it settle once the dance ends
    this.bounce *= 1 - damp(10, dt);
    this.talkEnv += ((this.talking ? 1 : 0) - this.talkEnv) * damp(14, dt);

    // --- the body follows the mood: posture first...
    const standing = (1 - sb) * (1 - w);
    target.spine[0] += f.lean * (1 - 0.5 * sb) + 0.14 * f.slump;
    target.lSh[0] -= 0.08 * f.slump;
    target.rSh[0] -= 0.08 * f.slump;
    target.spine[1] += Math.sin(t * 7) * 0.04 * f.fidget;
    if (f.shake > 0.01) {
      target.spine[0] += Math.sin(t * 15 + s) * 0.03 * f.shake;
      target.head[0] += Math.sin(t * 15 + s + 1) * 0.03 * f.shake;
    }
    // weight from foot to foot; a drunk sways a lot further, and their head wobbles
    const swayX = Math.sin(t * 0.8 + s) * f.sway;
    this.hips.position.x = 0.02 * swayX * (1 - sb);
    target.spine[2] -= 0.04 * swayX;
    target.head[2] += 0.03 * swayX + Math.max(0, f.sway - 1) * noise1(t * 0.9 + s) * 0.15;
    if (!this.gesture) this.hips.position.y += Math.abs(Math.sin(t * 6.5 + s)) * 0.012 * f.hop * standing;
    let lift = 0.025 * f.shrug - 0.012 * f.slump;
    // ...then, standing still with their hands free and not talking with them, the arms
    const armsFree = grip === 'arms' ? 0 : standing;
    const quiet = 1 - 0.8 * this.talkEnv;
    for (const sd of grip === 'hand' ? [1] : [1, -1]) {
      this.arm(target, sd, ARM.hips, f.hips * armsFree * quiet);
      this.arm(target, sd, ARM.clasp, f.clasp * armsFree * quiet);
      this.arm(target, sd, ARM.hug, f.hug * armsFree * (1 - 0.5 * this.talkEnv));
      const fist = f.fists * armsFree;
      const sh = sd > 0 ? target.lSh : target.rSh;
      sh[0] -= 0.05 * fist;
      sh[2] += sd * 0.15 * fist;
      if (sd > 0) target.lEl -= 0.45 * fist;
      else target.rEl -= 0.45 * fist;
    }

    // --- talking: the mouth follows the line's syllables, and the hands talk in their own way (and the mood's)
    let vis = { open: 0, round: 0, wide: 0 };
    if (this.talking) {
      this.lipT += dt;
      if (this.lip && this.lipT < this.lip.duration) vis = this.lip.at(this.lipT);
      else {
        const flap = Math.max(0, noise1(t * 13 + s)) * 0.8 + Math.max(0, Math.sin(t * 21 + s)) * 0.45;
        vis = { open: Math.min(1.1, flap), round: 0, wide: 0.3 };
      }
    }
    const vk = snap ? 1 : damp(26, dt);
    this.viseme.open += (vis.open * this.talkLevel - this.viseme.open) * vk;
    this.viseme.round += (vis.round - this.viseme.round) * vk;
    this.viseme.wide += (vis.wide - this.viseme.wide) * vk;
    if (this.talkEnv > 0.01) {
      const level = this.talkLevel;
      target.head[0] += noise1(t * 2.7 + s) * 0.08 * level * this.talkEnv;
      target.head[2] += noise1(t * 1.9 + s * 3) * 0.06 * level * this.talkEnv;
      // shouting leans in, whispering hunches toward the listener
      target.spine[0] += (level > 1 ? 0.1 * (level - 1) : 0.12 * (1 - level)) * this.talkEnv;
      if (level < 0.6) {
        // a whisper goes behind a hand
        if (!this.gesture && grip !== 'arms') this.arm(target, grip === 'hand' ? 1 : -1, ARM.shield, 0.9 * this.talkEnv);
      } else {
        this.accent.t -= dt;
        // the hands talk now and then, not on every phrase: a gesture, then a rest in the lap or at the sides
        if (this.accent.t < -this.accent.gap && !this.gesture && !moving && grip !== 'arms') {
          // a hand holding something stays put
          const dur = rand(1.1, 1.7);
          this.accent = { t: dur, dur, gap: rand(1.6, 4), side: grip === 'hand' || Math.random() < 0.5 ? 1 : -1, kind: this.accentKind(level), amp: this.accentAmp() };
        }
        if (this.accent.t > 0 && !this.gesture) this.applyAccent(target, grip === 'hand', t);
      }
    }

    // --- listening: the odd nod
    if (this.listening && !this.talking && !this.gesture) {
      this.nodT -= dt;
      if (this.nodT < 0) {
        this.nodding = 0.55;
        this.nodT = rand(2, 5);
      }
    }
    if (this.nodding > 0) {
      this.nodding -= dt;
      target.head[0] += Math.sin((1 - Math.max(0, this.nodding) / 0.55) * Math.PI * 2) * 0.07 + 0.05 * Math.sin((1 - Math.max(0, this.nodding) / 0.55) * Math.PI);
    }

    // --- killing time: a weight shift, a glance away, their own little habits
    let glance = 0;
    // (not in a posed snapshot, like the main titles' photos)
    if (!snap) this.idleT -= dt;
    if (!this.idle && this.idleT < 0) {
      this.idleT = rand(8, 16);
      if (!this.talking && !this.gesture && !moving && this.talkEnv < 0.1) {
        // mostly just a weight shift or a glance; their habits are the occasional thing
        const pool: Idle[] = ['shift', 'shift', 'glance', 'glance', ...(this.def.manner?.idles ?? [])];
        if (this.holdingGlass && !this.prop) pool.push('sip', 'sip');
        let kind = pool[Math.floor(Math.random() * pool.length)];
        // sitting, there's no weight to shift; the habits need free hands, and a calm moment (nobody scratches
        // their head mid-sob)
        const habit = kind !== 'shift' && kind !== 'glance' && kind !== 'sip';
        if ((kind === 'shift' && sb > 0.5) || (habit && (grip || this.emotion !== 'neutral' || f.hips + f.clasp + f.hug > 0.5))) kind = 'glance';
        if (kind === 'sip') this.doGesture('drink', { silent: true });
        else this.idle = { kind, t: 0, dur: IDLE_DUR[kind], side: Math.random() < 0.5 ? 1 : -1 };
      }
    }
    if (this.idle && (this.talking || this.gesture || moving)) this.idle = null;
    if (this.idle) {
      const I = this.idle;
      I.t += dt;
      const u = I.t / I.dur;
      if (u >= 1) this.idle = null;
      else {
        const a = Math.sin(Math.PI * u), hold = smoothstep(0, 0.3, u) * (1 - smoothstep(0.7, 1, u));
        switch (I.kind) {
          case 'shift':
            this.hips.position.x += I.side * 0.03 * a * (1 - sb);
            target.spine[2] -= I.side * 0.05 * a;
            break;
          case 'glance':
            glance = I.side * 0.45 * hold;
            target.head[1] += I.side * 0.2 * hold;
            break;
          case 'scratch_head':
            this.arm(target, -1, ARM.scratch, hold);
            target.rEl += Math.sin(I.t * 11) * 0.05 * hold;
            target.head[2] -= 0.1 * hold;
            break;
          case 'hair':
            this.arm(target, 1, ARM.scratch, 0.85 * hold);
            target.head[2] -= 0.08 * hold;
            break;
          case 'lapels':
            for (const sd of [1, -1]) this.arm(target, sd, ARM.lapels, hold);
            target.lSh[0] += Math.sin(I.t * 5) * 0.04 * hold;
            target.rSh[0] += Math.sin(I.t * 5) * 0.04 * hold;
            target.spine[0] -= 0.05 * hold;
            break;
          case 'arms_crossed':
            for (const sd of [1, -1]) this.arm(target, sd, ARM.crossed, hold);
            break;
          case 'rub_hands':
            for (const sd of [1, -1]) this.arm(target, sd, ARM.clasp, hold);
            target.lSh[2] += Math.sin(I.t * 8) * 0.035 * hold;
            target.rSh[2] += Math.sin(I.t * 8) * 0.035 * hold;
            break;
          case 'sip':
            break;
        }
      }
    }

    this.glance = glance;

    // --- look at
    this.lookYaw = 0;
    if (this.lookAt) {
      const hp = this.root.position;
      const yaw = angleDiff(this.facing, Math.atan2(this.lookAt.x - hp.x, this.lookAt.z - hp.z));
      const yawC = clamp(yaw, -1.2, 1.2);
      this.lookYaw = yawC;
      // seated people twist their torso a bit; the head turns most of the rest, the eyes finish the job
      target.spine[1] += yawC * 0.3;
      target.head[1] += yawC * 0.5;
      // side-eye: the head turns away, the eyes stay on them
      target.head[1] -= (Math.sign(yawC) || 1) * 0.35 * f.side;
      // when standing and the target is far around, turn the body
      // ...but never turn their back fully on the audience
      if (!this.isSitting && !moving && Math.abs(yaw) > 1.0 && !this.talking) {
        const turned = this.facing + yaw * 0.6;
        if (Math.abs(angleDiff(0, turned)) < 1.9) this.targetFacing = turned;
      }
    } else target.head[1] -= 0.3 * f.side;

    // --- gesture overrides
    this.glass.visible = this.holdingGlass && !this.prop;
    this.gestureLean = this.jaw = 0;
    this.fx.wide = this.fx.lid = this.fx.away = this.fx.lift = 0;
    this.fx.gaze = null;
    if (this.gesture) {
      const gs = this.gesture;
      gs.t += dt;
      const u = gs.t / gs.dur;
      if (u >= 1) this.gesture = null;
      else {
        const env = Math.min(1, gs.t / 0.22, (gs.dur - gs.t) / 0.25);
        this.applyGesture(gs.g, gs.t, u, env, target, gs.partner);
        const beats = GESTURE_BEATS[gs.g] ?? [0.45];
        while (this.gestureBeatsFired < beats.length && u > beats[this.gestureBeatsFired]) {
          this.gestureBeatsFired++;
          if (gs.silent) continue;
          if (gs.g === 'spit_take') this.spit();
          this.onGestureBeat?.(gs.g);
        }
      }
    }
    const calling = this.gesture?.g === 'phone_call' && !this.prop;
    if (calling && !this.callPhone) this.hand.add(this.callPhone = upright(buildProp('phone')));
    else if (!calling && this.callPhone) {
      this.callPhone.removeFromParent();
      this.callPhone = null;
    }
    this.updateSpray(dt);
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
    mix3(p.spine, target.spine); mix3(p.head, target.head);
    // arms ease more softly when they're only talking or idling; gestures and walking keep the snappier rate
    const armLam = snap ? 1 : damp(this.gesture || moving ? 14 : 8, dt);
    const mixArm = (a: V3, b: V3) => {
      a[0] += (b[0] - a[0]) * armLam; a[1] += (b[1] - a[1]) * armLam; a[2] += (b[2] - a[2]) * armLam;
    };
    mixArm(p.lSh, target.lSh); mixArm(p.rSh, target.rSh);
    p.lEl += (target.lEl - p.lEl) * armLam; p.rEl += (target.rEl - p.rEl) * armLam;
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
    // stepping in for a kiss or a secret
    this.hips.position.z += this.gestureLean;
    lift += this.fx.lift;
    this.shoulderLift += (lift - this.shoulderLift) * (snap ? 1 : damp(10, dt));
    this.lSh.position.y = this.rSh.position.y = this.shY0 + this.shoulderLift;

    this.updateFace(dt, t, f, vis, snap);
  }

  /** Mouth, teeth, brows, eyes, colour in the cheeks: everything above the neck that isn't the head turning. */
  private updateFace(dt: number, t: number, f: Face, vis: { open: number; round: number; wide: number }, snap: boolean) {
    const hh = this.headH;
    // mouth: open for the line (or the face), rounded for "oo", wide for "ee"; teeth for a grin or a grimace
    const talk = this.talkEnv;
    let open = Math.max(f.mouthBase, f.teeth * 0.4, Math.min(1.25, this.viseme.open) * talk);
    const round = Math.max(f.round, this.viseme.round * talk * 0.8);
    const wide = this.viseme.wide * talk * (vis.open > 0 ? 1 : 0.6);
    open = clamp(Math.max(open, 1.18 * this.jaw), 0, 1.25);
    // big looks get a big mouth (a laugh, a gasp); talking stays the size it always was
    const big = clamp((f.mouthBase - 0.3) / 0.5, 0, 1);
    this.mouthOpen.scale.y = (0.2 + Math.min(1, open) * (1.1 + 0.35 * big) + Math.max(0, open - 1) * 0.6) * (1 + 0.25 * round);
    this.mouthOpen.scale.x = (0.7 + Math.min(1, open) * (0.2 + 0.3 * big) + 0.25 * this.jaw) * (1 - 0.35 * round) * (1 + 0.12 * wide + 0.3 * f.teeth * (f.smile < 0.2 ? 1 : 0.4));
    const teeth = clamp(Math.max(f.teeth, 0.45 * wide) * clamp(open * 2.5, 0, 1) * (1 - round), 0, 1);
    this.teeth.visible = teeth > 0.05;
    // tucked under the top edge of the opening, narrower than it so they stay inside, deeper the more there are
    const sy = this.mouthOpen.scale.y;
    this.teeth.scale.set(this.mouthOpen.scale.x * 0.6, sy * 0.38 * teeth, 1);
    this.teeth.position.y = (-0.02 + 0.05 * sy * (1 - 0.38 * teeth)) * hh;
    this.mouth.rotation.z = 0.14 * f.smirk;
    this.mouth.position.x = 0.012 * hh * f.smirk;
    this.cornerL.rotation.z = (f.smile + 0.5 * f.smirk) * 0.6;
    this.cornerR.rotation.z = -(f.smile - 0.4 * f.smirk) * 0.6;
    this.cornerL.position.y = this.cornerR.position.y = f.smile * 0.006 - 0.02 * hh;

    // brows, up with a gape or a widening of the eyes
    const up = 0.012 * Math.max(this.jaw, this.fx.wide);
    this.browL.position.y = this.browY0 + f.browY + f.browAsym + up;
    this.browR.position.y = this.browY0 + f.browY + up;
    this.browL.rotation.z = f.browTilt;
    this.browR.rotation.z = -f.browTilt;

    // blink (more, when they're on edge)
    this.blinkT -= dt;
    const jumpy = this.emotion === 'nervous' || this.emotion === 'scared';
    if (this.blinkT < 0) this.blinkT = jumpy ? rand(0.8, 2.2) : rand(2, 5.5);

    // eyes: pointed at whoever they're looking at (whatever the head turn didn't cover), darting around a little
    this.saccade.t -= dt;
    if (this.saccade.t < 0) {
      const center = Math.random() < 0.4;
      this.saccade = { x: center ? 0 : rand(-0.12, 0.12), y: center ? 0 : rand(-0.06, 0.05), t: this.listening ? rand(0.4, 1.4) : rand(0.8, 2.6) };
    }
    let gx = 0, gy = 0;
    if (this.lookAt) {
      if (snap) this.root.updateWorldMatrix(true, true);
      const v = this.head.worldToLocal(TMP.copy(this.lookAt)).sub(this.eyes.position);
      gx = Math.atan2(v.x, Math.max(0.05, v.z));
      gy = Math.atan2(v.y, Math.hypot(v.x, v.z));
    }
    gx = gx * (1 - this.fx.away) + this.saccade.x + this.glance;
    gy = gy * (1 - this.fx.away) + this.saccade.y;
    if (this.fx.gaze) {
      gx = this.fx.gaze.x;
      gy = this.fx.gaze.y;
    }
    const gk = snap ? 1 : damp(30, dt);
    this.gaze.x += (clamp(gx, -0.9, 0.9) - this.gaze.x) * gk;
    this.gaze.y += (clamp(gy, -0.5, 0.9) - this.gaze.y) * gk;
    const lid = clamp(f.lid + this.fx.lid - 0.6 * this.fx.wide - 0.5 * this.jaw, -0.6, 1);
    const rolling = this.fx.gaze !== null;
    for (const e of this.eyeParts) {
      const x = clamp((this.gaze.x - e.sg * 0.3) * 0.036 * e.hh, -0.026 * e.hh, 0.026 * e.hh);
      const y = clamp(this.gaze.y * 0.03 * e.hh, -0.012 * e.hh, (rolling ? 0.016 : 0.012) * e.hh) - 0.002 * e.hh;
      const z = e.rz * Math.sqrt(Math.max(0, 1 - (x / e.rx) ** 2 - (y / e.ry) ** 2));
      e.iris.position.set(x, y, z - 0.008 * e.hh);
    }
    // the eyes narrow (droopy, squinting) or open wide by squashing and stretching; a blink all but shuts them
    this.eyes.scale.y = this.blinkT < 0.12 ? 0.1 : clamp(1 - 1.2 * Math.max(0, lid) - 0.35 * clamp(f.squint, 0, 1) + 0.5 * Math.max(0, -lid), 0.25, 1.3);

    // colour: a blush in the cheeks, a flush all over the face, tears
    const blush = clamp(f.blush, 0, 1);
    this.blushMat.opacity = 0.7 * blush;
    for (const c of this.cheeks) c.visible = blush > 0.03;
    this.faceSkin.color.copy(this.skinColor).lerp(FLUSH, 0.3 * clamp(f.flush, 0, 1));
    const crying = f.tears > 0.3;
    for (const tear of this.tears) {
      tear.mesh.visible = crying;
      if (!crying) continue;
      const c = (t * 0.55 + tear.phase) % 1;
      const y = lerp(tear.y0, tear.y1, c);
      tear.mesh.position.set(tear.x, y, tear.z(tear.x, y));
      tear.mesh.scale.setScalar(1 - 0.45 * c);
    }
  }

  /** Pull an arm toward a pose (given for the left arm; the right one mirrors it). */
  private arm(T: Pose, side: number, pose: ArmPose, k: number) {
    if (k <= 0.001) return;
    const sh = side > 0 ? T.lSh : T.rSh;
    sh[0] = lerp(sh[0], pose[0], k);
    sh[1] = lerp(sh[1], side * pose[1], k);
    sh[2] = lerp(sh[2], side * pose[2], k);
    if (side > 0) T.lEl = lerp(T.lEl, pose[3], k);
    else T.rEl = lerp(T.rEl, pose[3], k);
  }

  /** How the hands go while talking: the mood first, then the delivery, then their own way of doing it. */
  private accentKind(level: number): Accent {
    const e = this.emotion;
    if (e === 'nervous' || e === 'scared' || e === 'embarrassed') return Math.random() < 0.5 ? 'neck' : 'wring';
    if (e === 'angry' || level > 1.3) return 'chop';
    if (e === 'excited' || level > 1.1 || (e === 'happy' && Math.random() < 0.3)) return 'big';
    const style = this.def.manner?.talk ?? 'open';
    return Math.random() < 0.55 ? style : 'open';
  }

  private accentAmp() {
    const e = this.emotion;
    if (e === 'sad' || e === 'bored' || e === 'crying' || e === 'drunk') return Math.random() < 0.5 ? 0 : 0.5;
    return e === 'excited' ? 1.25 : e === 'angry' ? 1.15 : 1;
  }

  private applyAccent(T: Pose, handBusy: boolean, t: number) {
    const A = this.accent;
    const p = 1 - A.t / A.dur;
    // ease out, hold the shape on the words, ease back
    const a = smoothstep(0, 0.3, p) * (1 - smoothstep(0.7, 1, p)) * this.talkEnv * A.amp;
    const sd = A.side;
    const sh = sd > 0 ? T.lSh : T.rSh;
    const bend = (v: number) => {
      if (sd > 0) T.lEl += v;
      else T.rEl += v;
    };
    switch (A.kind) {
      case 'open':
        sh[0] -= 0.35 * a; bend(-0.55 * a); sh[2] += sd * 0.06 * a;
        break;
      case 'big':
        // both hands out, palms up: the pitch
        T.lSh[0] -= 0.32 * a; T.lSh[2] += 0.18 * a; T.lEl -= 0.65 * a;
        if (!handBusy) { T.rSh[0] -= 0.32 * a; T.rSh[2] -= 0.18 * a; T.rEl -= 0.65 * a; }
        break;
      case 'finger':
        // "Actually..." one finger up, bobbing on the words
        this.arm(T, sd, ARM.finger, 0.85 * a);
        sh[0] += Math.sin(p * Math.PI * 4) * 0.03 * a;
        break;
      case 'chop': {
        const e = this.talkEnv * A.amp;
        const up = smoothstep(0, 0.35, p) * (1 - smoothstep(0.45, 0.6, p));
        const down = smoothstep(0.45, 0.6, p) * (1 - smoothstep(0.8, 1, p));
        sh[0] -= (0.6 * up + 0.2 * down) * e; bend(-(0.95 * up + 0.25 * down) * e); sh[2] += sd * 0.06 * up * e;
        break;
      }
      case 'neck':
        this.arm(T, sd, ARM.neck, a);
        T.head[0] += 0.08 * a;
        break;
      case 'wring':
        this.arm(T, 1, ARM.clasp, a);
        if (!handBusy) this.arm(T, -1, ARM.clasp, a);
        T.lSh[2] += Math.sin(t * 6) * 0.03 * a;
        break;
    }
  }

  /** A spray of whatever they were drinking, out across the room: droplets, so they pixelate like everything else. */
  private spit() {
    if (!this.spray) {
      const drops = new THREE.Group();
      const geo = ellipsoid(0.017, 0.017, 0.017, 5, 4), mat = toon('#f4ead0', { emissive: '#8a7a5a', emissiveIntensity: 0.6 });
      for (let i = 0; i < 28; i++) drops.add(new THREE.Mesh(geo, mat));
      this.root.add(drops);
      this.spray = { drops, vel: new Float32Array(28 * 3), t: 0 };
    }
    const s = this.spray;
    const mouth = this.root.worldToLocal(this.mouthOpen.getWorldPosition(new THREE.Vector3()));
    s.drops.children.forEach((d, i) => {
      d.position.set(mouth.x, mouth.y, mouth.z + 0.04);
      d.scale.setScalar(rand(0.6, 1.4));
      s.vel.set([rand(-0.45, 0.45), rand(-0.3, 0.6), rand(1.1, 2.6)], i * 3);
    });
    s.t = 0;
    s.drops.visible = true;
  }

  private updateSpray(dt: number) {
    const s = this.spray;
    if (!s?.drops.visible) return;
    s.t += dt;
    s.drops.children.forEach((d, i) => {
      s.vel[i * 3 + 1] -= 5 * dt;
      d.position.set(d.position.x + s.vel[i * 3] * dt, Math.max(0.02, d.position.y + s.vel[i * 3 + 1] * dt), d.position.z + s.vel[i * 3 + 2] * dt);
      d.scale.multiplyScalar(1 - 0.9 * dt);
    });
    if (s.t > 0.9) s.drops.visible = false;
  }

  private applyGesture(g: Motion, s: number, u: number, env: number, T: Pose, partner: boolean) {
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
        if (!this.prop) this.glass.visible = true;
        const sip = Math.sin(clamp((u - 0.15) / 0.7, 0, 1) * Math.PI);
        set('rSh', [-0.75 - 0.4 * sip, 0, 0.25]); el('rEl', -1.9 - 0.4 * sip); T.head[0] -= 0.3 * sip * env;
        break;
      }
      case 'cheers':
        if (!this.prop) this.glass.visible = true;
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
      case 'kiss':
        if (partner) {
          // step in, lean in, hands on their arms
          // seated, the lean has to do all the work
          this.gestureLean = this.isSitting ? 0.04 * env : 0.2 * env;
          T.spine[0] += (this.isSitting ? 0.38 : 0.2) * env; T.head[0] += 0.1 * env;
          set('lSh', [-0.75, 0, -0.15]); set('rSh', [-0.75, 0, 0.15]); el('lEl', -0.8); el('rEl', -0.8);
        } else {
          // fingertips to the lips, then blown off toward someone
          const out = smoothstep(0.45, 0.7, u);
          set('rSh', [lerp(-1.75, -1.45, out), 0, lerp(0.4, -0.1, out)]); el('rEl', lerp(-2.35, -0.35, out));
        }
        break;
      case 'phone_call':
        set('rSh', [-1.45, 0, -0.6]); el('rEl', -2.4); T.head[2] -= 0.14 * env;
        break;
      case 'lean_in':
        this.gestureLean = this.isSitting ? 0 : 0.1 * env;
        T.spine[0] += 0.26 * env; T.head[0] -= 0.06 * env;
        break;
      case 'jaw_drop':
        this.jaw = env;
        T.head[0] -= 0.14 * env; T.spine[0] -= 0.04 * env;
        set('lSh', [-0.25, 0, 0.32]); set('rSh', [-0.25, 0, -0.32]); el('lEl', -0.35); el('rEl', -0.35);
        break;
      case 'fist_bump': {
        // knuckles out, bump, then blow it up
        const blow = smoothstep(0.6, 0.75, u);
        set('rSh', [-1.35 - 0.35 * blow, 0, 0.12 - 0.4 * blow + Math.sin(s * 30) * 0.08 * blow]); el('rEl', -0.2 - 0.5 * blow);
        break;
      }
      case 'spit_take': {
        // a sip... then it all comes back out
        if (!this.prop) this.glass.visible = true;
        const sip = smoothstep(0.05, 0.3, u) * (1 - smoothstep(0.42, 0.52, u));
        const lurch = smoothstep(0.4, 0.48, u) * (1 - smoothstep(0.75, 1, u));
        set('rSh', [-0.75 - 0.4 * sip + 0.35 * lurch, 0, 0.25]); el('rEl', -1.9 - 0.4 * sip + 0.9 * lurch);
        T.head[0] += (-0.3 * sip + 0.3 * lurch) * env;
        T.spine[0] += 0.28 * lurch * env;
        this.jaw = 0.8 * lurch;
        break;
      }
      case 'give':
        set('rSh', [-1.15, 0, 0.05]); el('rEl', -0.35); T.spine[0] += 0.08 * env;
        break;
      case 'double_take': {
        // a glance at them, away as if nothing happened... and snap back, eyes wide
        const away = smoothstep(0.12, 0.26, u) * (1 - smoothstep(0.42, 0.48, u));
        const snap = smoothstep(0.42, 0.48, u) * env;
        T.head[1] -= (this.lookYaw * 0.5 + (Math.sign(this.lookYaw) || 1) * 0.35) * away * env;
        T.spine[1] -= this.lookYaw * 0.3 * away * env;
        this.fx.away = away;
        T.head[0] -= 0.14 * snap; T.spine[0] -= 0.07 * snap;
        this.fx.wide = snap;
        this.jaw = 0.3 * snap;
        break;
      }
      case 'eye_roll': {
        // eyes up and over, the head tipping back with them
        const a = Math.sin(Math.PI * u) * env;
        const over = Math.PI * (1 - smoothstep(0.12, 0.72, u));
        this.fx.gaze = { x: Math.cos(over) * 0.55, y: 0.35 + Math.sin(over) * 0.55 };
        this.fx.lid = 0.12 * smoothstep(0.6, 0.9, u);
        T.head[0] -= 0.14 * a; T.head[2] += 0.12 * a;
        break;
      }
      case 'crack_up': {
        // head thrown back, then doubled over, a hand on the stomach, the other slapping a thigh
        const back = smoothstep(0, 0.12, u) * (1 - smoothstep(0.25, 0.4, u));
        const fold = smoothstep(0.25, 0.45, u);
        T.head[0] -= 0.32 * back * env;
        T.spine[0] += (-0.1 * back + (this.isSitting ? 0.22 : 0.34) * fold + Math.sin(s * 16) * 0.035) * env;
        this.arm(T, 1, ARM.belly, env);
        set('rSh', [-0.35 + 0.3 * Math.sin(s * 9) * fold, 0, -0.18]); el('rEl', -0.45 - 0.3 * fold);
        this.fx.lift = 0.012 * Math.max(0, Math.sin(s * 16)) * env;
        break;
      }
      case 'sob':
        // face in both hands, shoulders heaving
        this.arm(T, 1, ARM.face, env); this.arm(T, -1, ARM.face, env);
        T.head[0] += 0.25 * env; T.spine[0] += (0.12 + Math.sin(s * 7) * 0.05) * env;
        this.fx.lift = (0.5 + 0.5 * Math.sin(s * 7)) * 0.018 * env;
        break;
      case 'slow_clap': {
        // ...clap. ...clap. ...clap.
        const together = Math.max(...GESTURE_BEATS.slow_clap!.map((b) => 1 - smoothstep(0, 0.07, Math.abs(u - b))));
        for (const sd of [1, -1]) {
          this.arm(T, sd, ARM.clapOut, env);
          this.arm(T, sd, ARM.clapIn, together * env);
        }
        T.head[0] -= 0.05 * env;
        break;
      }
      case 'hands_on_hips':
        if (!this.isSitting) { this.arm(T, 1, ARM.hips, env); this.arm(T, -1, ARM.hips, env); }
        T.spine[0] -= 0.06 * env; T.head[0] -= 0.06 * env;
        break;
      case 'head_in_hands':
        this.arm(T, 1, ARM.face, env); this.arm(T, -1, ARM.face, env);
        T.head[0] += 0.42 * env; T.spine[0] += (this.isSitting ? 0.3 : 0.16) * env;
        this.fx.lid = 0.5 * env;
        break;
      case 'air_quotes': {
        // both hands up by the head, fingers curling twice
        const curl = Math.max(0, Math.sin(clamp((u - 0.25) / 0.5, 0, 1) * Math.PI * 4));
        this.arm(T, 1, ARM.quotes, env); this.arm(T, -1, ARM.quotes, env);
        T.lEl -= 0.2 * curl * env; T.rEl -= 0.2 * curl * env;
        T.head[2] += 0.1 * env; T.head[0] -= 0.05 * env;
        break;
      }
      case 'fist_pump': {
        // fist up, and yank it down: yes!
        const down = smoothstep(0.38, 0.5, u);
        this.arm(T, -1, ARM.pumpUp, env * (1 - down));
        this.arm(T, -1, ARM.pumpDown, env * down);
        T.spine[0] += 0.14 * down * env; T.head[0] += 0.06 * down * env;
        if (!this.isSitting) this.bounce = -0.035 * down * env;
        break;
      }
      case 'cover_mouth':
        this.arm(T, -1, ARM.mouth, env);
        T.head[0] -= 0.08 * env; T.spine[0] -= 0.04 * env;
        this.fx.wide = 0.7 * env;
        break;
      case 'sit':
      case 'stand':
      case 'none':
        break;
    }
  }
}

/** Stand a hand prop up in the right hand: its +y along the thumb, +z along the fingers. */
function upright(o: THREE.Object3D) {
  const g = new THREE.Group();
  g.rotation.x = Math.PI / 2;
  g.add(o);
  return g;
}
