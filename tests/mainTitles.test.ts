import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as THREE from 'three';
import { testStage } from './helpers/sets';
import { Director } from '../src/show/director';
import { Player } from '../src/show/player';
import { BURSTS, GANG, HUDDLE, HUDDLE_AT } from '../src/show/mainTitles';
import { openingCredits } from '../src/show/credits';
import { speech } from '../src/audio/speech';
import type { ShowItem } from '../src/script/types';

const spies: { mockRestore(): void }[] = [];
afterEach(() => spies.splice(0).forEach((s) => s.mockRestore()));

function rig() {
  const stage = testStage();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 60);
  const director = new Director(camera, stage);
  const renderer = { fade: 1, rewind: 0, dream: 0, ripple: 0, memory: 0, snap: 0, trail: 0, photo: () => ({}) };
  const shown: { title: (number | null)[]; credits: [string, string][]; locations: string[] } = { title: [], credits: [], locations: [] };
  const overlay = {
    hideCaption() {}, hideCards() {}, standby() {}, hideLocation() {}, showCaption() {}, zoomTitle() {}, fadeTitle() {},
    location: (t: string) => shown.locations.push(t),
    showTitle: (photos: unknown[] | null) => shown.title.push(photos ? photos.length : null),
    credit: (c: { label?: string; name: string } | null, kind = 'cast') => c && shown.credits.push([kind, c.name]),
  };
  return { stage, camera, director, renderer, overlay, shown };
}

describe('main titles', () => {
  test('every burst frames its subjects up close, with no scenery in the way', () => {
    const { stage, camera, director, renderer, overlay } = rig();
    const player = new Player(stage, director, renderer as never, overlay as never, { line() {} } as never, { next: () => new Promise<ShowItem>(() => {}) });
    stage.setLocation('maclarens', 'night');
    for (const id of GANG) stage.stand(id, HUDDLE_AT[0] + HUDDLE[id][0], HUDDLE_AT[1] + HUDDLE[id][1], 0);
    const scenery = stage.occluders();
    const ray = new THREE.Raycaster();
    for (const [i, burst] of BURSTS.entries()) {
      (player as unknown as { burst(b: typeof burst, k: number, still: boolean): void }).burst(burst, 0, true);
      expect(director.current?.kind).toBe('selfie');
      camera.updateMatrixWorld();
      for (const id of burst.who) {
        const head = stage.actors[id].headWorld;
        const p = head.clone().project(camera);
        expect(Math.abs(p.x), `burst ${i}: ${id}`).toBeLessThan(0.95);
        expect(Math.abs(p.y), `burst ${i}: ${id}`).toBeLessThan(0.95);
        expect(p.z, `burst ${i}: ${id} in front of the lens`).toBeLessThan(1);
        const to = head.clone().sub(camera.position);
        ray.set(camera.position, to.clone().normalize());
        ray.far = to.length();
        expect(ray.intersectObjects(scenery, false).length, `burst ${i}: ${id} behind scenery`).toBe(0);
        // close enough to be in their faces
        expect(to.length(), `burst ${i}: ${id}`).toBeLessThan(2.2);
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

    // the mosaic of the burst's photos, then nothing
    expect(shown.title).toEqual([16, null]);
    expect(shown.credits[0]).toEqual(['creators', expect.stringContaining('&')]);
    expect(shown.credits.slice(1).every(([kind]) => kind === 'cast')).toBe(true);
    // no episode number or episode title anywhere on screen
    expect(shown.locations.join(' ')).not.toContain(episode.code);
    expect(shown.locations.join(' ')).not.toContain(episode.title);
    expect(shown.credits.length).toBeGreaterThan(1);
    expect(stage.strobe).toBe(0);
    expect(renderer).toMatchObject({ snap: 0, trail: 0 });
  }, 30000);

  test('opening credits: five made-up cast names, and the creators', () => {
    const { cast, creators } = openingCredits();
    expect(cast).toHaveLength(5);
    expect(new Set(cast.map((c) => c.name)).size).toBe(5);
    expect(creators.label).toBe('created by');
    expect(creators.name).toMatch(/^\S+ \S+ &\n\S+ \S+$/);
  });
});
