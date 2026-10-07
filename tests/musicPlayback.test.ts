import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as THREE from 'three';
import { AudioEngine, audio } from '../src/audio/audio';
import { speech } from '../src/audio/speech';
import { Player } from '../src/show/player';
import { Director } from '../src/show/director';
import { episodeItems } from '../src/script/episodes';
import type { Beat, EpisodeScript, ShowItem } from '../src/script/types';
import { testStage } from './helpers/sets';
import { overlayStub } from './helpers/overlay';

const spies: { mockRestore(): void }[] = [];
afterEach(() => spies.splice(0).forEach(s => s.mockRestore()));

function rig() {
  const stage = testStage();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 60);
  const director = new Director(camera, stage);
  const renderer = { fade: 1, photo: () => ({}) };
  const player = new Player(stage, director, renderer as never, overlayStub() as never, { line() {} } as never, { next: () => new Promise<ShowItem>(() => {}) });
  const internals = player as unknown as {
    speak: typeof speech.speak;
    beat(b: Beat): Promise<void>;
    quiet(): Promise<void>;
    play(item: ShowItem): Promise<void>;
    wait(seconds: number): Promise<void>;
    animate(seconds: number, update: (u: number) => void): Promise<void>;
    score: string | null;
  };
  spies.push(spyOn(internals, 'wait').mockResolvedValue());
  spies.push(spyOn(internals, 'animate').mockImplementation(async (_s, update) => { update(1); }));
  player.stageNow({ location: 'apartment', time: 'night', cast: [{ character: 'ted', mark: 'couch_left' }], beats: [] });
  return { player, internals };
}

describe('music under speech', () => {
  test('lowers music quickly, holds across adjacent speech and releases after the last speaker', () => {
    const engine = new AudioEngine();
    const targets: { value: number; time: number; tau: number }[] = [];
    const held: number[] = [];
    const clock = { currentTime: 10 };
    const gain = { value: 0.55, cancelAndHoldAtTime: (time: number) => held.push(time),
      setTargetAtTime: (value: number, time: number, tau: number) => targets.push({ value, time, tau }) };
    engine.ctx = clock as AudioContext;
    Object.assign(engine, { musicBus: { gain } });
    const endFirst = engine.duckMusic(), endSecond = engine.duckMusic();
    expect(targets).toHaveLength(1);
    expect(targets[0].value).toBeCloseTo(0.55 * 0.25);
    expect(targets[0].time).toBe(10);
    endFirst(); endFirst();
    expect(targets).toHaveLength(1);
    clock.currentTime = 12;
    endSecond();
    expect(targets[1].value).toBe(0.55);
    expect(targets[1].time).toBeGreaterThan(12);
    expect(targets[1].tau).toBeGreaterThan(targets[0].tau);
    clock.currentTime = 12.1;
    const endThird = engine.duckMusic();
    endSecond(); // a late completion cannot lift the new line's duck
    expect(targets.at(-1)?.value).toBeCloseTo(0.55 * 0.25);
    expect(held).toEqual([10, 12, 12.1]);
    endThird();
  });

  for (const beat of [
    { type: 'say', character: 'ted', line: 'Hello.' },
    { type: 'say', character: 'barney', offscreen: 'phone', line: 'Hello.' },
    { type: 'say', character: 'ted', delivery: 'sing', accompanied: true, line: 'Hello.' },
    { type: 'narrate', line: 'Hello.' },
    { type: 'narrate', line: 'Hello.', over: true },
  ] as Beat[]) test(`ducks and releases ${JSON.stringify(beat)}`, async () => {
    const { internals } = rig();
    let end!: () => void, start!: () => void;
    let locks = 0;
    spies.push(spyOn(audio, 'duckMusic').mockImplementation(() => { locks++; return () => { locks--; }; }));
    spies.push(spyOn(speech, 'speak').mockImplementation((_t, _p, onStart) => {
      start = () => onStart?.();
      return { done: new Promise<void>(resolve => { end = resolve; }) };
    }));
    const played = internals.beat(beat);
    for (let i = 0; i < 10 && !start; i++) await Promise.resolve();
    expect(locks).toBe(0);
    start();
    expect(locks).toBe(1);
    end();
    await played;
    await internals.quiet();
    expect(locks).toBe(0);
  });

  test('skip and reset release music immediately and ignore late starts/completions', async () => {
    const { player, internals } = rig();
    const pending: { start: () => void; end: () => void }[] = [];
    let locks = 0, captions = 0;
    spies.push(spyOn(audio, 'duckMusic').mockImplementation(() => {
      locks++;
      let released = false;
      return () => { if (!released) locks--; released = true; };
    }));
    spies.push(spyOn(speech, 'speak').mockImplementation((_t, _p, onStart) => ({ done: new Promise<void>(end => {
      pending.push({ start: () => onStart?.(), end });
    }) })));
    const profile = { gender: 'male', pitch: 1, rate: 1 } as const;
    const first = internals.speak('One.', profile, () => { captions++; });
    pending[0].start(); expect(locks).toBe(1);
    player.skip('scene'); expect(locks).toBe(0);
    const second = internals.speak('Two.', profile, () => { captions++; });
    pending[1].start(); expect(locks).toBe(1);
    pending[0].start(); pending[0].end(); await first.done;
    expect(locks).toBe(1); expect(captions).toBe(2);
    player.reset(); expect(locks).toBe(0);
    pending[1].end(); await second.done;
    const third = internals.speak('Never started.', profile, () => { captions++; });
    player.reset(); pending[2].start(); pending[2].end(); await third.done;
    expect(locks).toBe(0); expect(captions).toBe(2);
  });

  test('speech failure restores the mix', async () => {
    const { internals } = rig();
    let released = false;
    spies.push(spyOn(audio, 'duckMusic').mockImplementation(() => () => { released = true; }));
    spies.push(spyOn(speech, 'speak').mockImplementation((_t, _p, onStart) => {
      onStart?.(); return { done: Promise.reject(new Error('voice failed')) };
    }));
    await expect(internals.beat({ type: 'say', character: 'ted', line: 'Hi.' })).rejects.toThrow('voice failed');
    expect(released).toBe(true);
  });

  test('a scored cold open stops before the theme and cannot resume after a later montage', async () => {
    const { internals } = rig();
    let bed: string | null = null;
    const events: string[] = [];
    spies.push(spyOn(audio, 'montage').mockImplementation(music => { bed = music; events.push(music); }));
    spies.push(spyOn(audio, 'stopBed').mockImplementation(() => { bed = null; }));
    spies.push(spyOn(audio, 'theme').mockImplementation(() => {
      expect(bed).toBeNull(); events.push('theme'); return { beat: 0.24, duration: 12 };
    }));
    const ep: EpisodeScript = { code: 'S99E01', title: 'Titles', logline: 'Music boundary.', scenes: [
      { location: 'apartment', time: 'night', cast: [], beats: [{ type: 'score', music: 'tense' }] },
      { location: 'apartment', time: 'night', cast: [], beats: [{ type: 'montage', music: 'playful', shots: [
        { location: 'apartment', time: 'night', cast: [], beats: [] }, { location: 'apartment', time: 'night', cast: [], beats: [] },
      ] }] },
    ] };
    const items = episodeItems(ep, 'test');
    await internals.play(items[0]);
    expect(internals.score).toBeNull();
    await internals.play(items[1]);
    expect(bed).toBeNull();
    expect(events).toEqual(['tense', 'theme', 'playful']);
  });
});
