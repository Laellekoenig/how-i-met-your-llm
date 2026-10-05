import type { Gesture } from '../script/types';

/** Candid bar photographs, reframed on the beat. References: docs/intro-reference.md. */
export const GANG = ['ted', 'marshall', 'lily', 'robin', 'barney'] as const;
export type GangId = (typeof GANG)[number];

/** Open floor between the booth and bar. Each photo has its own arrangement. */
export const HUDDLE_AT: [number, number] = [2.15, -0.75];
export const HUDDLE: Record<GangId, [number, number]> = {
  marshall: [-0.76, 0.08], lily: [-0.4, 0.22], ted: [0, -0.02], barney: [0.41, -0.12], robin: [0.8, 0.1],
};

/** Shared with the original synthesized theme so muted playback keeps the same edit. */
export const TITLE_BEAT = 0.2;
export const TITLE_BEATS = 48;
export const TITLE_TAIL = 2.4;

export interface PhotoMotion {
  /** A small reframe of the still, not movement by the actors. */
  pan: [number, number];
  zoom: number;
  tilt: number;
}

export interface Burst extends PhotoMotion {
  who: readonly GangId[];
  layout: Partial<Record<GangId, [number, number]>>;
  dist: number;
  yaw: number;
  lift: number;
  fov: number;
  /** Headroom for the title, or a lower aim for a waist-up portrait. */
  aim: number;
  beats: number;
  card?: 'name' | 'creators';
  moves: [GangId, Gesture][];
  looks?: Partial<Record<GangId, GangId>>;
}

// A few legible snapshots with uneven holds, like the original: name early, creators on the final group shot.
export const BURSTS: Burst[] = [
  { who: GANG, layout: HUDDLE, dist: 1.5, yaw: -0.08, lift: 0.15, fov: 53, aim: -0.2,
    beats: 4, pan: [-1.1, 0.5], zoom: 0.035, tilt: -1.2,
    moves: [['ted', 'thumbs_up'], ['lily', 'thumbs_up']], looks: { robin: 'barney', marshall: 'lily' } },
  { who: ['barney', 'ted', 'robin'], layout: { barney: [-0.65, -0.05], ted: [0, 0.06], robin: [0.62, 0] },
    dist: 1.4, yaw: 0.06, lift: 0.04, fov: 55, aim: 0.22,
    beats: 10, card: 'name', pan: [1.3, -0.5], zoom: -0.025, tilt: 1.2,
    moves: [['barney', 'suit_up']], looks: { ted: 'robin', robin: 'ted' } },
  { who: ['marshall', 'lily'], layout: { marshall: [-0.29, -0.1], lily: [0.27, 0.1] },
    dist: 1.08, yaw: -0.12, lift: 0.08, fov: 55, aim: -0.1,
    beats: 6, pan: [-1.6, 0.6], zoom: 0.035, tilt: -1.6,
    moves: [['lily', 'wave']], looks: { marshall: 'lily' } },
  { who: ['ted', 'barney'], layout: { ted: [-0.3, 0.08], barney: [0.32, -0.02] },
    dist: 1.08, yaw: 0.14, lift: 0.02, fov: 54, aim: -0.16,
    beats: 8, pan: [1.2, 0.2], zoom: 0.025, tilt: 1.5,
    moves: [['ted', 'shrug'], ['barney', 'suit_up']], looks: { ted: 'barney' } },
  { who: ['lily', 'robin', 'marshall'], layout: { lily: [-0.56, 0.12], robin: [0.03, 0.04], marshall: [0.63, -0.18] },
    dist: 1.48, yaw: -0.08, lift: 0.16, fov: 54, aim: -0.13,
    beats: 8, pan: [-1, -0.5], zoom: -0.02, tilt: -0.8,
    moves: [['robin', 'thumbs_up'], ['marshall', 'wave']], looks: { lily: 'robin' } },
  { who: GANG, layout: HUDDLE, dist: 1.48, yaw: 0.02, lift: 0.2, fov: 55, aim: -0.24,
    beats: 12, card: 'creators', pan: [0.7, 0.4], zoom: -0.03, tilt: 0.7,
    moves: [['ted', 'thumbs_up'], ['barney', 'suit_up']] },
];
