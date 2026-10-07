import type { Emotion } from '../script/types';

// Facial expressions: what each emotion does to a face (and the body under it), and how long it lasts.

/**
 * Everything an emotion does to someone, face to feet. Faces have to read at 270 lines, so most of the work is done
 * by things that survive the pixels: narrowed or wide eyes, open mouths and teeth, colour in the cheeks, and the whole body's
 * silhouette (a slump, a lean, hands on hips).
 */
export interface Face {
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

export const FACES: Record<Emotion, Face> = {
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

export const lerpFace = (a: Face, b: Face, k: number) => {
  const f = { ...a };
  for (const key of Object.keys(f) as (keyof Face)[]) f[key] = a[key] + (b[key] - a[key]) * k;
  return f;
};

/** How long a look lasts before they relax back into their resting face (a drunk stays drunk all scene). */
export const HOLD: Partial<Record<Emotion, number>> = {
  surprised: 4, laughing: 4.5, excited: 6, angry: 9, sad: 12, crying: 14, bored: 15, smug: 10, proud: 10, drunk: Infinity,
};

/** What a listener's face picks up from the speaker's. */
export const MIRROR: Partial<Record<Emotion, Emotion>> = {
  happy: 'happy', excited: 'happy', laughing: 'happy', proud: 'happy', sad: 'sad', crying: 'sad', angry: 'nervous',
  scared: 'nervous', surprised: 'surprised',
};
