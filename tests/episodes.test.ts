import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as THREE from 'three';
import { testStage } from './helpers/sets';
import { normalizeGuests, normalizeScene } from '../src/llm/normalize';
import { RERUNS, sampleCount, sampleEpisode } from '../src/script/samples';
import { CHARACTERS, charName, setGuests } from '../src/world/characters';
import { Director } from '../src/show/director';
import { Player } from '../src/show/player';
import { speech } from '../src/audio/speech';
import { isGuest, type Beat, type CutawayBeat, type GuestStar, type Scene, type ShowItem } from '../src/script/types';

const spies: { mockRestore(): void }[] = [];
afterEach(() => {
  spies.splice(0).forEach((s) => s.mockRestore());
  setGuests([]);
});

const nora = { name: 'Nora Vale', role: "Ted's date", gender: 'female', top: 'burgundy', top_style: 'dress', hair: 'brunette', hair_style: 'bob' };

describe('guest stars', () => {
  test('the planner’s guests fill slots in order with plain-word looks, and odd values fall back', () => {
    const guests = normalizeGuests([
      nora,
      { name: 'Dmitri', gender: 'male', height: 'tall', build: 'broad', skin: 'pale', top: '#ffffff', top_style: 'button-down', vest: 'black', extras: ['mustache', 'jetpack'], voice: { pitch: 'low', pace: 'warp' } },
      { name: 'nora vale', gender: 'female' }, // duplicate name
      { name: 'Gus', gender: 'm', top_style: 'cape', top: 'chartreuse' },
      { name: 'Fourth', gender: 'female' },
    ]);
    expect(guests.map((g) => [g.id, g.name])).toEqual([['guest1', 'Nora Vale'], ['guest2', 'Dmitri'], ['guest3', 'Gus']]);
    expect(guests[0]).toMatchObject({ gender: 'female', hair: 'dark_brown', hairStyle: 'bob', topStyle: 'dress', top: 'burgundy' });
    expect(guests[1]).toMatchObject({ height: 'tall', build: 'broad', skin: 'fair', top: '#ffffff', topStyle: 'shirt', vest: 'black', extras: ['mustache'], voice: { pitch: 'low', pace: 'normal' } });
    expect(guests[2]).toMatchObject({ gender: 'male', topStyle: 'blazer', top: 'navy' });
  });

  test('scene beats address guests by slot or by name, and an uncast slot never speaks', () => {
    const guests = normalizeGuests([nora]);
    const scene = normalizeScene({
      cast: [{ character: 'Nora', mark: 'table_right' }, { character: 'ted', mark: 'table_left' }, { character: 'guest2', mark: 'center' }],
      beats: [
        { type: 'say', character: 'Nora Vale', line: 'Hi.', to: 'Ted' },
        { type: 'say', character: 'ted', line: 'Hi, Nora.', to: 'nora' },
        { type: 'say', character: 'guest2', line: 'I was never cast.' },
        { type: 'say', character: 'guest1', line: 'Still me.' },
      ],
    }, 'restaurant', 'night', undefined, { guests });
    expect(scene.cast.map((c) => c.character)).toEqual(['guest1', 'ted']);
    expect(scene.beats).toEqual([
      expect.objectContaining({ character: 'guest1', to: 'ted' }),
      expect.objectContaining({ character: 'ted', to: 'guest1' }),
      expect.objectContaining({ character: 'guest1', line: 'Still me.' }),
    ]);
  });

  test('casting an episode renames and rebuilds the slots; the next episode resets the unused ones', () => {
    const stage = testStage();
    const [g1, g2] = normalizeGuests([nora, { name: 'Dmitri', gender: 'male', height: 'tall', top_style: 'suit', top: 'black' }]);
    const before = stage.actors.guest1;
    stage.castGuests([g1, g2]);
    expect(charName('guest1')).toBe('Nora Vale');
    expect(CHARACTERS.guest2.voice.gender).toBe('male');
    expect(stage.actors.guest1).not.toBe(before);
    expect(stage.actors.guest2.height).toBeGreaterThan(stage.actors.guest1.height);
    const nextWeek = stage.actors.guest2;
    stage.castGuests([g1]);
    expect(stage.actors.guest1.def.name).toBe('Nora Vale');
    expect(charName('guest2')).toBe('Guest');
    expect(stage.actors.guest2).not.toBe(nextWeek);
    // casting the same people again doesn't rebuild anyone
    const kept = stage.actors.guest1;
    stage.castGuests([g1]);
    expect(stage.actors.guest1).toBe(kept);
  });
});

describe('cutaways', () => {
  test('a cutaway keeps its own set, time, label and cast; nesting flattens and the couch is not a cutaway location', () => {
    const scene = normalizeScene({
      cast: [{ character: 'barney', mark: 'booth_right_front' }],
      beats: [
        { type: 'say', character: 'barney', line: "Here's how it'll go." },
        {
          type: 'flashback', label: 'Three years earlier', location: 'the roof', cast: [{ character: 'Barney Stinson', mark: 'ledge_lookout' }],
          beats: [
            { type: 'say', character: 'barney', line: 'Challenge accepted.' },
            { type: 'cutaway', location: 'limo', beats: [{ type: 'say', character: 'ranjit', line: 'Hello!' }] },
          ],
        },
        { type: 'cutaway', location: 'future', beats: [{ type: 'narrate', line: 'Kids, the couch is real.' }] },
        { type: 'cutaway', style: 'imagined', location: 'store', beats: [] },
      ],
    }, 'maclarens', 'day');
    expect(scene.beats.map((b) => b.type)).toEqual(['say', 'cutaway', 'narrate']);
    const c = scene.beats[1] as CutawayBeat;
    expect(c).toMatchObject({ style: 'flashback', label: 'Three years earlier', location: 'rooftop', time: 'day', cast: [{ character: 'barney', mark: 'ledge_lookout' }] });
    expect(c.beats.map((b) => b.type === 'say' && b.character)).toEqual(['barney', 'ranjit']);
  });

  test('cutaway beats count toward the scene budget', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ type: 'say', character: 'ted', line: `Line ${i}` }));
    const scene = normalizeScene({ beats: [...many.slice(0, 40), { type: 'cutaway', location: 'store', beats: many }, ...many] }, 'maclarens', 'night');
    const count = (beats: Beat[]): number => beats.reduce((n, b) => n + 1 + (b.type === 'cutaway' ? count(b.beats) : 0), 0);
    expect(count(scene.beats)).toBeLessThanOrEqual(70);
    expect((scene.beats[40] as CutawayBeat).beats.length).toBeLessThanOrEqual(24);
  });
});

describe('delivery', () => {
  test('delivery words are recognized and an interrupted line always ends on a dash', () => {
    const scene = normalizeScene({
      beats: [
        { type: 'say', character: 'marshall', line: 'Speak up!', delivery: 'YELLING' },
        { type: 'say', character: 'lily', line: 'There it is.', delivery: 'whispered' },
        { type: 'say', character: 'ted', line: 'Actually, it is...', interrupted: true },
        { type: 'say', character: 'ted', line: 'Fine.', delivery: 'interpretive dance' },
      ],
    }, 'apartment', 'night');
    expect(scene.beats).toEqual([
      expect.objectContaining({ delivery: 'shout' }),
      expect.objectContaining({ delivery: 'whisper' }),
      expect.objectContaining({ line: 'Actually, it is—', interrupted: true }),
      expect.not.objectContaining({ delivery: expect.anything() }),
    ]);
  });
});

describe('the offline reruns', () => {
  const sets = testStage().sets;
  const deliveries = (beats: Beat[]): string[] => beats.flatMap((b) =>
    b.type === 'cutaway' ? deliveries(b.beats) : b.type === 'say' ? [b.delivery ?? '', b.interrupted ? 'interrupted' : ''] : []);

  for (const ep of RERUNS) test(`${ep.meta.title} casts its guests, cuts away, and survives normalization unchanged`, () => {
    const scenes = ep.scenes.flatMap((s) => [s as Pick<Scene, 'location' | 'cast' | 'beats'>, ...s.beats.filter((b): b is CutawayBeat => b.type === 'cutaway')]);
    const cast = new Set(ep.guests!.map((g) => g.id));
    const speakers = new Set<string>();
    for (const s of scenes) {
      for (const c of s.cast) expect(sets[s.location].marks[c.mark], `${s.location}/${c.mark}`).toBeDefined();
      for (const b of s.beats) {
        if ('character' in b && isGuest(b.character)) expect(cast.has(b.character)).toBe(true);
        if (b.type === 'say') speakers.add(b.character);
        if ((b.type === 'move' || b.type === 'enter') && b.to && !(b.to in sets[s.location].marks)) expect(b.to in CHARACTERS, `${s.location}/${b.to}`).toBe(true);
      }
    }
    for (const id of cast) expect(speakers.has(id)).toBe(true);
    expect(scenes.length).toBeGreaterThan(ep.scenes.length);
    for (const s of ep.scenes) expect(normalizeScene({ ...s }, s.location, s.time, undefined, { guests: ep.guests as GuestStar[] }).beats).toEqual(s.beats);
  });

  test('between them, every delivery, both cutaway styles and every transition', () => {
    const scenes = RERUNS.flatMap((ep) => ep.scenes);
    const used = new Set(scenes.flatMap((s) => deliveries(s.beats)));
    for (const d of ['whisper', 'shout', 'sing', 'deadpan', 'fast', 'slow', 'interrupted']) expect(used.has(d), d).toBe(true);
    const styles = new Set(scenes.flatMap((s) => s.beats.flatMap((b) => b.type === 'cutaway' ? [b.style] : [])));
    expect([...styles].sort()).toEqual(['flashback', 'imagined']);
    expect(new Set(scenes.map((s) => s.transition))).toEqual(new Set(['cut', 'skyline', 'exterior', 'rewind']));
  });

  test('they air with their guests in the rotation', () => {
    const items = Array.from({ length: sampleCount() }, () => sampleEpisode()).flat();
    for (const ep of RERUNS) {
      const start = items.find((i) => i.kind === 'episode-start' && i.episode.title === ep.meta.title);
      expect(start?.kind === 'episode-start' && start.guests?.map((g) => g.name)).toEqual(ep.guests!.map((g) => g.name));
    }
  });
});

describe('cutaway playback', () => {
  test('plays on its own set with its look, then restores the scene exactly as it was', async () => {
    const stage = testStage();
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 60);
    const director = new Director(camera, stage);
    const renderer = { fade: 1, rewind: 0, dream: 0, ripple: 0, memory: 0 };
    const labels: [string, string | undefined][] = [];
    const overlay = { hideCaption() {}, hideCards() {}, standby() {}, hideLocation() {}, year() {}, showCaption() {}, location: (t: string, s?: string) => labels.push([t, s]) };
    const spoken: { who: string; set: string; dream: number; memory: number; delivery?: string; cutOff?: boolean }[] = [];
    spies.push(spyOn(speech, 'speak').mockImplementation((key, _text, _profile, onStart, opts = {}) => {
      onStart?.();
      spoken.push({ who: key, set: stage.current.id, dream: renderer.dream, memory: renderer.memory, delivery: opts.delivery, cutOff: opts.cutOff });
      return { done: Promise.resolve() };
    }));
    const ep = RERUNS.find((e) => e.meta.title === 'The Silent Auction')!;
    const [first, , third] = ep.scenes;
    const episode = { id: 'auction', code: ep.meta.code, title: ep.meta.title, logline: '', source: 'sample' as const };
    // the store scene's imagined auction, then the flashback back home, no transitions in between
    const items: ShowItem[] = [
      { kind: 'scene', episode, index: 0, scene: { ...first, transition: 'cut' } },
      { kind: 'scene', episode, index: 2, scene: { ...third, transition: 'cut', beats: third.beats.slice(2, 5) } },
    ];
    let requests = 0;
    const source = { next: () => (++requests <= items.length ? Promise.resolve(items[requests - 1]) : new Promise<ShowItem>(() => {})) };
    stage.castGuests(ep.guests);
    let marshallBefore: THREE.Vector3 | undefined;
    let restored: { set: string; marshall: THREE.Vector3; mark?: string; visible: boolean; guestVisible: boolean } | undefined;
    const thaw = stage.thaw.bind(stage);
    spies.push(spyOn(stage, 'thaw').mockImplementation((f) => {
      thaw(f);
      if (!restored) restored = { set: stage.current.id, marshall: stage.actors.marshall.position.clone(), mark: stage.markOf('marshall'), visible: stage.onStage('marshall'), guestVisible: stage.onStage('guest2') };
    }));
    const freeze = stage.freeze.bind(stage);
    spies.push(spyOn(stage, 'freeze').mockImplementation(() => {
      marshallBefore ??= stage.actors.marshall.position.clone();
      return freeze();
    }));
    const player = new Player(stage, director, renderer as never, overlay as never, { line() {} } as never, source);
    void player.run();
    const start = performance.now();
    while (requests <= items.length && performance.now() - start < 20000) await new Promise((r) => setTimeout(r, 20));

    const inStore = spoken.filter((s) => s.set === 'store' && s.memory === 0).map((s) => s.who);
    const imagined = spoken.filter((s) => s.set === 'restaurant' && s.dream === 1);
    expect(imagined.map((s) => s.who)).toEqual(['guest2', 'marshall']);
    expect(imagined.map((s) => s.delivery)).toEqual(['shout', 'sing']);
    expect(inStore.slice(1, 7)).toEqual(['lily', 'marshall', 'guest1', 'lily', 'guest1', 'scooter']);
    expect(spoken.find((s) => s.who === 'lily' && s.cutOff)).toBeDefined();
    expect(spoken.filter((s) => s.set === 'store' && s.memory === 1).map((s) => s.who)).toEqual(['marshall', 'judy', 'marshall', 'judy']);
    expect(labels).toContainEqual(['How Marshall imagined it', 'imagined']);
    expect(labels).toContainEqual(['St. Cloud, 1985', 'flashback']);
    // back by the produce, on the same spot, with the auctioneer (only imagined there) gone
    expect(restored).toMatchObject({ set: 'store', mark: 'produce', visible: true, guestVisible: false });
    expect(restored!.marshall.distanceTo(marshallBefore!)).toBeLessThan(1e-6);
    // home again after the flashback, with the look switched off
    const after = spoken.at(-1)!;
    expect(after).toMatchObject({ who: 'judy', set: 'apartment', dream: 0, memory: 0 });
    expect(renderer).toMatchObject({ dream: 0, memory: 0, ripple: 0, rewind: 0 });
  }, 30000);
});
