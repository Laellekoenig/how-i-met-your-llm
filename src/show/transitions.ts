import type { Scene, Transition } from '../script/types';

/** Unannotated scripts still get geographic/time cues; flashbacks must be intentional. */
export function sceneTransition(scene: Scene, previous: Scene | null, index: number): Transition {
  if (scene.location === 'future') return 'cut';
  if (scene.transition) return scene.transition;
  if (scene.location === 'atlantic_city_casino') {
    return previous?.location === scene.location && previous.time === scene.time ? 'cut' : 'atlantic_city';
  }
  // These sets have their own geography/period, or live inside another building.
  // Avoid automatically introducing them with the generic Manhattan walk-up exterior.
  if (['wesleyan_dorm', 'canadian_mall', 'subway', 'laser_tag', 'hospital', 'elevator', 'hoser_hut', 'courtroom', 'lusty_leopard'].includes(scene.location)) return 'cut';
  if (index === 0 || !previous || previous.time !== scene.time) return 'skyline';
  return previous.location === scene.location ? 'cut' : 'exterior';
}

/**
 * Back to back on the same set, a straight cut reads as the cast teleporting: the people jump between marks
 * (or swap out) with no sign that time has passed. Those cuts dip through black instead.
 */
export function dipsToBlack(scene: Scene, previous: Scene | null, transition: Transition): boolean {
  return transition === 'cut' && previous?.location === scene.location;
}
