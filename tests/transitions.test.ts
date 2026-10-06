import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { sceneTransition } from '../src/show/transitions';
import { validateEpisode } from '../src/script/validate';
import { testStage } from './helpers/sets';
import { rerun } from './helpers/episodes';
import { Player } from '../src/show/player';
import { audio } from '../src/audio/audio';
import { speech } from '../src/audio/speech';
import type { Scene, ShowItem } from '../src/script/types';
import { overlayStub } from './helpers/overlay';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const scene = (overrides: Partial<Scene> = {}): Scene => ({ location: 'maclarens', time: 'night', cast: [], beats: [], ...overrides });
const spies: { mockRestore(): void }[] = [];
const originalMatchMedia = globalThis.matchMedia;
afterEach(() => {
  spies.splice(0).forEach((s) => s.mockRestore());
  globalThis.matchMedia = originalMatchMedia;
});

async function eventually(check: () => boolean, timeout = 1000) {
  const start = performance.now();
  while (!check()) {
    if (performance.now() - start > timeout) throw new Error('Playback did not reach the expected state');
    await sleep(10);
  }
}

/** Exercise the real playback loop with observable stage/graphics ports, without needing WebGL. */
function playback(incoming: Scene) {
  const stage = {
    outside: false,
    current: { id: 'apartment', ambience: 'none', background: [] },
    actors: {},
    establish() { this.outside = true; return {}; },
    endEstablishing() { this.outside = false; },
    setLocation(id: string) { this.current.id = id; },
    seatKids() {}, setWardrobe() {}, castIds: () => [], onStage: () => false,
  };
  const director = {
    current: { kind: 'wide' }, moving: true,
    establish(_shot: unknown, moving: boolean) { this.current = { kind: 'establishing' }; this.moving = moving; },
    resume(shot: { kind: string }) { this.current = shot; },
    coverage() { this.current = { kind: 'wide' }; },
  };
  const renderer = { fade: 1, rewind: 0, dream: 0, ripple: 0, memory: 0, still: 0 };
  const overlay = overlayStub();
  const episode = { id: 'test', code: 'S1E1', title: 'Test', logline: '' };
  const item: ShowItem = { kind: 'scene', episode, index: 1, scene: incoming };
  let requests = 0;
  const source = { next: () => ++requests === 1 ? Promise.resolve(item) : new Promise<ShowItem>(() => {}) };
  const player = new Player(stage as never, director as never, renderer as never, overlay as never, { line() {} } as never, source);
  void player.run();
  return { stage, director, renderer, player, finished: () => requests > 1 };
}

describe('script compatibility and intentional time jumps', () => {
  test('new interiors and period locations do not inherit the Manhattan walk-up exterior', () => {
    for (const location of ['subway', 'laser_tag', 'wesleyan_dorm', 'hospital', 'elevator', 'canadian_mall', 'hoser_hut', 'courtroom', 'lusty_leopard'] as const) {
      expect(sceneTransition(scene({ location }), scene(), 1)).toBe('cut');
      expect(sceneTransition(scene({ location, transition: 'rewind' }), scene(), 1)).toBe('rewind');
    }
  });
  test('casino arrivals establish Atlantic City, repeats cut, explicit transitions win', () => {
    const casino = scene({ location: 'atlantic_city_casino' });
    expect(sceneTransition(casino, null, 0)).toBe('atlantic_city');
    expect(sceneTransition(casino, scene(), 1)).toBe('atlantic_city');
    expect(sceneTransition(casino, casino, 2)).toBe('cut');
    expect(sceneTransition({ ...casino, time: 'day' }, casino, 2)).toBe('atlantic_city');
    expect(sceneTransition({ ...casino, transition: 'cut' }, scene(), 1)).toBe('cut');
    expect(sceneTransition(scene({ location: 'limo', transition: 'atlantic_city' }), scene(), 1)).toBe('atlantic_city');
  });

  test('legacy scenes establish time/location changes but never invent flashbacks', () => {
    expect(sceneTransition(scene(), null, 0)).toBe('skyline');
    expect(sceneTransition(scene({ time: 'day' }), scene(), 1)).toBe('skyline');
    expect(sceneTransition(scene({ location: 'apartment' }), scene(), 1)).toBe('exterior');
    expect(sceneTransition(scene(), scene(), 1)).toBe('cut');
    expect(sceneTransition(scene({ transition: 'cut' }), null, 0)).toBe('cut');
    expect(sceneTransition(scene({ transition: 'rewind' }), scene(), 1)).toBe('rewind');
    expect(sceneTransition(scene({ location: 'future', transition: 'rewind' }), scene(), 1)).toBe('cut');
  });

  test('episode files can only ask for transitions the player knows', () => {
    const sets = testStage().sets;
    const ep = rerun('The Understudy');
    const withTransition = (transition: unknown) => validateEpisode({ ...ep, scenes: [{ ...ep.scenes[0], transition }, ...ep.scenes.slice(1)] }, sets).errors;
    for (const t of ['skyline', 'exterior', 'atlantic_city', 'cut', 'rewind', undefined]) expect(withTransition(t)).toEqual([]);
    for (const t of [' SKYLINE ', null, 2, 'dissolve', '__proto__']) expect(withTransition(t)).toHaveLength(1);
  });
});

describe('transition playback', () => {
  test.each(['exterior', 'atlantic_city'] as const)('%s: narration starts outside and is not repeated inside', async (transition) => {
    let finish!: () => void;
    const done = new Promise<void>((resolve) => { finish = resolve; });
    const spokenOutside: boolean[] = [];
    const speak = spyOn(speech, 'speak').mockImplementation(() => { spokenOutside.push(p.stage.outside); return { done }; });
    spies.push(speak);
    const p = playback(scene({ transition, beats: [{ type: 'narrate', line: 'The next morning.' }] }));
    await eventually(() => speak.mock.calls.length === 1);
    expect(spokenOutside).toEqual([true]);
    await sleep(1950);
    expect(p.stage.outside).toBe(true); // the shot waits for Ted's setup
    finish();
    await eventually(p.finished, 1500);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(p.stage.outside).toBe(false);
    expect(p.stage.current.id).toBe('maclarens');
    expect(p.director.current.kind).toBe('wide');
  });

  test('pause holds an establishing shot past its duration; skip restores the previous shot and cancels music', async () => {
    const stop = spyOn(audio, 'stopCue'); spies.push(stop);
    const p = playback(scene({ transition: 'skyline' }));
    await eventually(() => p.stage.outside);
    p.player.paused = true;
    await sleep(2000);
    expect(p.stage.outside).toBe(true);
    expect(p.finished()).toBe(false);
    p.player.skip('scene');
    await eventually(p.finished);
    expect(p.stage.outside).toBe(false);
    expect(p.stage.current.id).toBe('apartment');
    expect(p.director.current.kind).toBe('wide');
    expect(p.renderer).toEqual({ fade: 1, rewind: 0, dream: 0, ripple: 0, memory: 0, still: 0, whip: 0, video: 0, panels: null, panelsDone: null });
    expect(stop).toHaveBeenCalled();
  });

  test('skipping a narrated transition cancels both waits without leaking a later scene change', async () => {
    const speak = spyOn(speech, 'speak').mockReturnValue({ done: new Promise(() => {}) }); spies.push(speak);
    const p = playback(scene({ transition: 'atlantic_city', beats: [{ type: 'narrate', line: 'Meanwhile...' }] }));
    await eventually(() => speak.mock.calls.length === 1);
    p.player.skip('episode');
    await eventually(p.finished);
    await sleep(80);
    expect(p.stage.outside).toBe(false);
    expect(p.stage.current.id).toBe('apartment');
    expect(p.director.current.kind).toBe('wide');
  });

  test('rewind cuts at its midpoint and clears the effect on completion', async () => {
    const p = playback(scene({ transition: 'rewind' }));
    await eventually(() => p.renderer.rewind > 0);
    expect(p.stage.current.id).toBe('apartment');
    await eventually(() => p.stage.current.id === 'maclarens');
    expect(p.renderer.rewind).toBeGreaterThan(0);
    await eventually(p.finished, 1500);
    expect(p.renderer.rewind).toBe(0);
  });

  test('skipping during either half of rewind clears the effect and prevents late mutations', async () => {
    for (const afterCut of [false, true]) {
      const p = playback(scene({ transition: 'rewind' }));
      await eventually(() => afterCut ? p.stage.current.id === 'maclarens' : p.renderer.rewind > 0);
      p.player.skip('scene');
      await eventually(p.finished);
      await sleep(60);
      expect(p.renderer.rewind).toBe(0);
      expect(p.stage.current.id).toBe(afterCut ? 'maclarens' : 'apartment');
    }
  });

  test('reduced motion bypasses the rewind animation', async () => {
    globalThis.matchMedia = (() => ({ matches: true })) as typeof matchMedia;
    const p = playback(scene({ transition: 'rewind' }));
    await eventually(() => p.stage.current.id === 'maclarens');
    expect(p.renderer.rewind).toBe(0);
    p.player.skip('scene');
    await eventually(p.finished);
  });

  test('direct cuts do not fade through black', async () => {
    const p = playback(scene({ transition: 'cut' }));
    await eventually(() => p.stage.current.id === 'maclarens');
    expect(p.stage.outside).toBe(false);
    expect(p.renderer.fade).toBe(1);
    p.player.skip('scene');
    await eventually(p.finished);
  });
});
