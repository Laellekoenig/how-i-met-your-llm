import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as THREE from 'three';
import { testStage } from './helpers/sets';
import { Director } from '../src/show/director';
import { Player } from '../src/show/player';
import { BURSTS, GANG, TITLE_BEAT, TITLE_BEATS, TITLE_TAIL } from '../src/show/mainTitles';
import { openingCredits } from '../src/show/credits';
import { speech } from '../src/audio/speech';
import { audio } from '../src/audio/audio';
import type { ShowItem } from '../src/script/types';

const spies: { mockRestore(): void }[] = [];
afterEach(() => spies.splice(0).forEach((s) => s.mockRestore()));

function rig() {
  const stage = testStage();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 60);
  const director = new Director(camera, stage);
  const renderer = { fade: 1, rewind: 0, dream: 0, ripple: 0, memory: 0, snap: 0, trail: 0, photo: () => ({}) };
  const shown: { title: (boolean | null)[]; credits: [string, string][]; locations: string[] } = { title: [], credits: [], locations: [] };
  const overlay = {
    hideCaption() {}, hideCards() {}, standby() {}, hideLocation() {}, year() {}, showCaption() {}, moveTitle() {},
    location: (t: string) => shown.locations.push(t),
    showTitle: (photo: unknown | null, name = false) => shown.title.push(photo ? name : null),
    credit: (c: { label?: string; name: string } | null, kind = 'cast') => c && shown.credits.push([kind, c.name]),
  };
  return { stage, camera, director, renderer, overlay, shown };
}

describe('main titles', () => {
  test('every burst frames its subjects up close, with no scenery in the way', () => {
    const { stage, camera, director, renderer, overlay } = rig();
    const player = new Player(stage, director, renderer as never, overlay as never, { line() {} } as never, { next: () => new Promise<ShowItem>(() => {}) });
    stage.setLocation('maclarens', 'night');
    const scenery = stage.occluders();
    const ray = new THREE.Raycaster();
    for (const [i, burst] of BURSTS.entries()) {
      (player as unknown as { burst(b: typeof burst): void }).burst(burst);
      expect(director.current?.kind).toBe('selfie');
      camera.updateMatrixWorld();
      for (const id of burst.who) {
        const head = stage.actors[id].headWorld;
        const p = head.clone().project(camera);
        expect(Math.abs(p.x), `burst ${i}: ${id}`).toBeLessThan(0.85);
        expect(Math.abs(p.y), `burst ${i}: ${id}`).toBeLessThan(0.85);
        expect(p.z, `burst ${i}: ${id} in front of the lens`).toBeLessThan(1);
        const to = head.clone().sub(camera.position);
        ray.set(camera.position, to.clone().normalize());
        ray.far = to.length();
        expect(ray.intersectObjects(scenery, false).length, `burst ${i}: ${id} behind scenery`).toBe(0);
        // Keep the face clear of everyone else's head and torso as well as the scenery.
        for (const other of burst.who.filter(who => who !== id)) {
          expect(ray.intersectObject(stage.actors[other].root, true).length, `burst ${i}: ${other} occludes ${id}`).toBe(0);
        }
        // close enough to be in their faces
        expect(to.length(), `burst ${i}: ${id}`).toBeLessThan(2.5);
      }
    }
  });

  test('the cold open cuts to the montage and the show name only, then credits roll over the first scene', async () => {
    const { stage, director, renderer, overlay, shown } = rig();
    spies.push(spyOn(speech, 'speak').mockImplementation((_k, _t, _p, onStart) => { onStart?.(); return { done: Promise.resolve() }; }));
    const episode = { id: 'titles', code: 'S09E99', title: 'The Titles', logline: '', source: 'sample' as const };
    const items: ShowItem[] = [
      { kind: 'episode-start', episode, coldOpen: 'Kids, this is the story.' },
      { kind: 'scene', episode, index: 0, scene: { location: 'maclarens', time: 'night', transition: 'cut', cast: [{ character: 'ted', mark: 'booth_end' }], beats: [{ type: 'pause', seconds: 4 }] } },
    ];
    let requests = 0;
    const source = { next: () => (++requests <= items.length ? Promise.resolve(items[requests - 1]) : new Promise<ShowItem>(() => {})) };
    const player = new Player(stage, director, renderer as never, overlay as never, { line() {} } as never, source);
    void player.run();
    const start = performance.now();
    while (requests <= items.length && performance.now() - start < 25000) await new Promise((r) => setTimeout(r, 20));

    // Six photographs, the name only on the second; then a clean cut to the scene.
    expect(shown.title).toEqual([false, true, false, false, false, false, null]);
    expect(shown.credits[0]).toEqual(['creators', expect.stringContaining('&')]);
    expect(shown.credits.slice(1).every(([kind]) => kind === 'cast')).toBe(true);
    // no episode number or episode title anywhere on screen
    expect(shown.locations.join(' ')).not.toContain(episode.code);
    expect(shown.locations.join(' ')).not.toContain(episode.title);
    expect(shown.credits.length).toBeGreaterThan(1);
    expect(stage.strobe).toBe(0);
    expect(renderer).toMatchObject({ snap: 0, trail: 0 });
  }, 30000);

  test('the edit and music share a twelve-second timeline, including muted playback', () => {
    expect(BURSTS.reduce((sum, b) => sum + b.beats, 0)).toBe(TITLE_BEATS);
    expect(TITLE_BEATS * TITLE_BEAT + TITLE_TAIL).toBeCloseTo(12);
    expect(audio.theme().beat).toBe(TITLE_BEAT);
    expect(audio.theme().duration).toBeCloseTo(12);
  });

  test('skipping a paused intro clears the photograph, grade and scheduled music', async () => {
    const { stage, director, renderer, overlay, shown } = rig();
    const player = new Player(stage, director, renderer as never, overlay as never, { line() {} } as never, { next: () => new Promise<ShowItem>(() => {}) });
    const stop = spyOn(audio, 'stopSting');
    spies.push(stop);
    const titles = (player as unknown as { mainTitles(): Promise<void> }).mainTitles();
    await new Promise(r => setTimeout(r, 50));
    player.paused = true;
    player.skip('scene');
    await expect(titles).rejects.toThrow();
    expect(shown.title.at(-1)).toBeNull();
    expect(renderer).toMatchObject({ snap: 0, trail: 0 });
    expect(GANG.every(id => !stage.actors[id].talking)).toBe(true);
    expect(stop).toHaveBeenCalled();
  });

  test('opening credits: five made-up cast names, and the creators', () => {
    const { cast, creators } = openingCredits();
    expect(cast).toHaveLength(5);
    expect(new Set(cast.map((c) => c.name)).size).toBe(5);
    expect(creators.label).toBe('created by');
    expect(creators.name).toMatch(/^\S+ \S+ &\n\S+ \S+$/);
  });
});
