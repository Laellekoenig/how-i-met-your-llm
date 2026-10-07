import type { Emotion, Gesture } from '../script/types';
import type { Idle } from './characters';

// How long gestures take, when they land, and the faces some of them bring.

/** Gestures, plus `give`: holding something out to someone (or reaching to take it). */
export type Motion = Gesture | 'give';

/** Sitting down and standing up are walks, not animations: the stage handles them. */
export const GESTURE_DUR: Record<Motion, number> = {
  none: 0, wave: 1.6, point: 1.5, shrug: 1.3, facepalm: 2.0, arms_crossed: 3.2, drink: 2.0, cheers: 1.6,
  thumbs_up: 1.4, high_five: 1.3, suit_up: 1.7, hands_up: 1.6, nod: 1.0, shake_head: 1.1, dance: 3.2,
  hug: 2.2, slap: 1.0, think: 2.2, kiss: 2.0, phone_call: 3.0, sit: 0, stand: 0, lean_in: 2.4, jaw_drop: 2.2,
  fist_bump: 1.4, spit_take: 2.0, give: 1.4, double_take: 1.7, eye_roll: 1.5, crack_up: 2.6, sob: 2.8, slow_clap: 3.2,
  hands_on_hips: 2.8, head_in_hands: 2.6, air_quotes: 1.5, fist_pump: 1.4, cover_mouth: 1.8, salute: 1.7,
};
export const gestureDuration = (g: Motion) => GESTURE_DUR[g] ?? 0;

/** Gestures that come with a face, unless the beat asks for another: when in the gesture it lands. */
const GESTURE_FACE: Partial<Record<Motion, { emotion: Emotion; at: number }>> = {
  crack_up: { emotion: 'laughing', at: 0 }, sob: { emotion: 'crying', at: 0 }, eye_roll: { emotion: 'bored', at: 0 },
  cover_mouth: { emotion: 'surprised', at: 0 }, fist_pump: { emotion: 'excited', at: 0 }, head_in_hands: { emotion: 'sad', at: 0 },
  double_take: { emotion: 'surprised', at: 0.5 }, jaw_drop: { emotion: 'surprised', at: 0 }, spit_take: { emotion: 'surprised', at: 0.45 },
};
export const impliedEmotion = (g: Motion) => GESTURE_FACE[g];

/** When a gesture's beat lands (the slap connects, the glass clinks): most have one, a slow clap has four. */
export const GESTURE_BEATS: Partial<Record<Motion, number[]>> = { slow_clap: [0.22, 0.42, 0.62, 0.82] };

/** Little things people do while they wait their turn. */
export const IDLE_DUR: Record<Idle, number> = { shift: 3.2, glance: 1.4, scratch_head: 2.4, lapels: 2.2, arms_crossed: 4.5, rub_hands: 2.6, hair: 2.2, sip: 2 };
