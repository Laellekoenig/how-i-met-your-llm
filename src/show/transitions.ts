import type { Scene, Transition } from '../script/types';

/** Unannotated scripts still get geographic/time cues; flashbacks must be intentional. */
export function sceneTransition(scene: Scene, previous: Scene | null, index: number): Transition {
  if (scene.location === 'future') return 'cut';
  if (scene.transition) return scene.transition;
  // These sets have their own geography/period, or live inside another building.
  // Avoid automatically introducing them with the generic Manhattan walk-up exterior.
  if (['wesleyan_dorm', 'canadian_mall', 'subway', 'laser_tag', 'hospital', 'elevator'].includes(scene.location)) return 'cut';
  if (index === 0 || !previous || previous.time !== scene.time) return 'skyline';
  return previous.location === scene.location ? 'cut' : 'exterior';
}
