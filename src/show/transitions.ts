import type { Scene, Transition } from '../script/types';

/** Unannotated scripts still get geographic/time cues; flashbacks must be intentional. */
export function sceneTransition(scene: Scene, previous: Scene | null, index: number): Transition {
  if (scene.location === 'future') return 'cut';
  if (scene.transition) return scene.transition;
  if (index === 0 || !previous || previous.time !== scene.time) return 'skyline';
  return previous.location === scene.location ? 'cut' : 'exterior';
}
