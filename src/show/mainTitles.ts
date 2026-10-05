import type { Gesture } from '../script/types';

/**
 * The main titles, after the show's: no clips from episodes. It's one night at the bar, the five of them crammed
 * together right in front of a camera, mugging for it in a fast-motion burst of photos (hot, glowing, smeared),
 * the camera jumping from face to face. It ends on a mosaic of those photos under the show's name.
 */
export const GANG = ['ted', 'marshall', 'lily', 'robin', 'barney'] as const;
export type GangId = (typeof GANG)[number];

/** The huddle, on the open floor of MacLaren's between the booth and the bar, everyone facing the lens. */
export const HUDDLE_AT: [number, number] = [2.15, -0.75];
/** Offsets in the huddle: Lily up front, Marshall looming at the back. */
export const HUDDLE: Record<GangId, [number, number]> = {
  lily: [-0.12, 0.32], robin: [0.42, 0.2], ted: [-0.52, -0.08], barney: [0.08, -0.12], marshall: [0.6, -0.36],
};

/** One burst of photos: who's in the frame, how close the camera is, and what everybody's up to. */
export interface Burst {
  who: readonly GangId[];
  /** Camera distance from the faces, metres. */
  dist: number;
  /** Swing around the huddle, radians (0 = straight on). */
  yaw: number;
  /** Camera height above (or below) the faces. */
  lift: number;
  fov: number;
  /** What they do; a pair means doing it to each other. Everyone else just cracks up. */
  moves: [GangId, Gesture, GangId?][];
}

export const BURSTS: Burst[] = [
  { who: GANG, dist: 1.55, yaw: 0.1, lift: 0.1, fov: 52, moves: [['ted', 'cheers'], ['marshall', 'cheers'], ['lily', 'cheers'], ['robin', 'cheers'], ['barney', 'cheers']] },
  { who: ['ted', 'barney'], dist: 0.8, yaw: -0.35, lift: 0.05, fov: 52, moves: [['barney', 'hands_up'], ['ted', 'thumbs_up']] },
  { who: ['lily', 'marshall'], dist: 0.85, yaw: 0.3, lift: -0.05, fov: 52, moves: [['lily', 'wave'], ['marshall', 'thumbs_up']] },
  { who: ['robin', 'lily', 'barney'], dist: 1.05, yaw: 0.45, lift: 0.1, fov: 50, moves: [['robin', 'wave'], ['barney', 'thumbs_up']] },
  { who: GANG, dist: 1.35, yaw: -0.25, lift: -0.2, fov: 56, moves: [['ted', 'point'], ['marshall', 'point'], ['lily', 'point'], ['robin', 'point'], ['barney', 'suit_up']] },
  { who: ['barney'], dist: 0.6, yaw: 0.15, lift: 0.04, fov: 54, moves: [['barney', 'suit_up']] },
  { who: ['marshall', 'ted', 'barney'], dist: 1.0, yaw: -0.1, lift: 0.08, fov: 52, moves: [['marshall', 'dance'], ['ted', 'high_five', 'barney']] },
  { who: GANG, dist: 1.6, yaw: 0, lift: 0.15, fov: 50, moves: [['ted', 'hands_up'], ['marshall', 'hands_up'], ['lily', 'hands_up'], ['robin', 'hands_up'], ['barney', 'hands_up']] },
];
