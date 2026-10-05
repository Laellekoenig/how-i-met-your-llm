import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as THREE from 'three';
import { testStage } from './helpers/sets';
import { EPISODES, EPISODE_FILES, rerun } from './helpers/episodes';
import { validateCatalog, validateEpisode } from '../src/script/validate';
import { episodeItems } from '../src/script/episodes';
import { CHARACTERS, charName, setGuests } from '../src/world/characters';
import { Director } from '../src/show/director';
import { Player } from '../src/show/player';
import { speech } from '../src/audio/speech';
import type { Beat, EpisodeScript, GuestStar, ShowItem } from '../src/script/types';

const spies: { mockRestore(): void }[] = [];
afterEach(() => {
  spies.splice(0).forEach((s) => s.mockRestore());
  setGuests([]);
});

// Nora is a recurring role; one-off guests use distinct names.
const elodie: GuestStar = {
  id: 'guest1', name: 'Elodie Vale', role: "Ted's date", gender: 'female', height: 'average', build: 'slim', skin: 'olive',
  hair: 'dark_brown', hairStyle: 'bob', top: 'burgundy', topStyle: 'dress', pants: 'black', extras: [], voice: { pitch: 'medium', pace: 'normal' },
};
const dmitri: GuestStar = { ...elodie, id: 'guest2', name: 'Dmitri', gender: 'male', height: 'tall', build: 'broad', hairStyle: 'short', topStyle: 'suit', top: 'black' };

const sets = testStage().sets;
const messages = (ep: unknown) => validateEpisode(ep, sets).errors.map((e) => `${e.path}: ${e.message}`);

/** A minimal valid episode, for breaking one thing at a time. */
function episode(beats: Beat[], extra: Partial<EpisodeScript> = {}): EpisodeScript {
  return {
    code: 'S99E01', title: 'The Test', logline: 'A test.', coldOpen: 'Kids, this is a test.', guests: [elodie],
    scenes: [{ location: 'maclarens', time: 'night', cast: [{ character: 'ted', mark: 'booth_end' }, { character: 'guest1', mark: 'booth_left_back' }], beats }],
    ...extra,
  };
}

describe('guest stars', () => {
  test('casting an episode renames and rebuilds the slots; the next episode resets the unused ones', () => {
    const stage = testStage();
    const before = stage.actors.guest1;
    stage.castGuests([elodie, dmitri]);
    expect(charName('guest1')).toBe('Elodie Vale');
    expect(CHARACTERS.guest2.voice.gender).toBe('male');
    expect(stage.actors.guest1).not.toBe(before);
    expect(stage.actors.guest2.height).toBeGreaterThan(stage.actors.guest1.height);
    const nextWeek = stage.actors.guest2;
    stage.castGuests([elodie]);
    expect(stage.actors.guest1.def.name).toBe('Elodie Vale');
    expect(charName('guest2')).toBe('Guest');
    expect(stage.actors.guest2).not.toBe(nextWeek);
    // casting the same people again doesn't rebuild anyone
    const kept = stage.actors.guest1;
    stage.castGuests([elodie]);
    expect(stage.actors.guest1).toBe(kept);
  });

  test('guests fill their slots in order, in words the wardrobe knows, and an uncast slot never speaks', () => {
    const say = (character: string): Beat => ({ type: 'say', character, line: 'Hi.' } as Beat);
    expect(messages(episode([say('guest1')]))).toEqual([]);
    expect(messages(episode([say('guest1')], { guests: [{ ...elodie, id: 'guest2' }] })).join('\n')).toContain('"id": "guest1"');
    const odd = { ...elodie, top: 'chartreuse', extras: ['jetpack'], hairStyle: 'mohawk', voice: { pitch: 'low', pace: 'warp' } } as unknown as GuestStar;
    expect(messages(episode([say('guest1')], { guests: [odd] }))).toHaveLength(4);
    expect(messages(episode([say('guest1'), say('guest2')])).join('\n')).toContain("guest2 isn't cast");
  });
});

describe('the validator', () => {
  const say = (character: string, line = 'Hi.', more: object = {}) => ({ type: 'say', character, line, ...more } as Beat);
  const errors = (beats: Beat[], extra?: Partial<EpisodeScript>) => messages(episode(beats, extra)).join('\n');

  test('everyone who speaks, moves or leaves is on stage', () => {
    expect(errors([say('robin')])).toContain("robin isn't on stage here");
    expect(errors([{ type: 'enter', character: 'robin', to: 'bar_standing' }, say('robin'), { type: 'exit', character: 'robin' }, say('robin')]))
      .toMatch(/^scenes\[0\]\.beats\[3\]: robin isn't on stage/);
    expect(errors([{ type: 'enter', character: 'ted' }])).toContain('ted is already on stage');
    expect(errors([{ type: 'move', character: 'ted', to: 'guest1' }, { type: 'move', character: 'ted', to: 'booth_left_back' }])).toContain('"booth_left_back" is taken by guest1');
    expect(errors([{ type: 'move', character: 'ted', to: 'the_moon' }])).toContain('neither a mark at maclarens');
  });

  test('the kids stay on the couch', () => {
    expect(errors([say('penny', 'Dad.')])).toBe('');
    expect(errors([{ type: 'enter', character: 'luke' }])).toContain('never leaves the 2030 couch');
    expect(errors([], { scenes: [{ location: 'maclarens', time: 'night', cast: [{ character: 'penny', mark: 'booth_end' }], beats: [say('ted')] }] })).toContain('only ever on the 2030 couch');
  });

  test('lines are performable: no stage directions, not too long, interruptions land', () => {
    expect(errors([say('ted', 'Well (sighs) okay.')])).toContain('no stage directions');
    expect(errors([say('ted', Array(36).fill('word').join(' '))])).toContain('36 words');
    expect(errors([say('ted', 'Actually, it is pronounced', { interrupted: true }), say('guest1')])).toContain('em dash');
    expect(errors([say('ted', 'Actually—', { interrupted: true })])).toContain('followed straight away');
    expect(errors([say('ted', 'Actually—', { interrupted: true }), say('guest1', 'No.')])).toBe('');
  });

  test('typos and invented vocabulary are caught, not guessed at', () => {
    expect(errors([{ ...say('ted'), emotions: 'happy' } as Beat])).toContain('unknown field "emotions"');
    expect(errors([say('ted', 'Hi.', { gesture: 'moonwalk' })])).toContain('"gesture": "moonwalk" is not one of');
    expect(errors([say('Ted Mosby')])).toContain('is not a character id');
    expect(errors([{ type: 'dialogue' } as unknown as Beat])).toContain('"type": "dialogue"');
  });

  test('cutaways use their own set and cast, and never nest', () => {
    const cutaway = (beats: Beat[]) => ({ type: 'cutaway', style: 'imagined', label: 'How Ted imagined it', location: 'rooftop', time: 'night', cast: [{ character: 'ted', mark: 'ledge_lookout' }], beats }) as Beat;
    expect(errors([cutaway([say('ted'), say('ted'), say('ted')])])).toBe('');
    expect(errors([cutaway([say('guest1')])])).toContain("guest1 isn't on stage");
    expect(errors([cutaway([cutaway([say('ted')])])])).toContain('no cutaways inside a cutaway');
  });

  test('Robin Sparkles only meets Robin in a cutaway', () => {
    const sparkles = { type: 'cutaway', style: 'imagined', label: 'Canada, 1993', location: 'store', time: 'day', cast: [{ character: 'robin', mark: 'cashier' }, { character: 'robin_sparkles', mark: 'produce' }], beats: [say('robin_sparkles', 'Hi!'), say('robin', 'No.'), say('robin_sparkles', 'Bye!')] } as Beat;
    expect(errors([sparkles])).toBe('');
    expect(errors([{ type: 'enter', character: 'robin', to: 'bar_standing' }, { type: 'enter', character: 'robin_sparkles', to: 'center' }])).toContain('the same person');
  });

  test('in a car, nobody slides through the partition', () => {
    const limo = (beats: Beat[]): Partial<EpisodeScript> => ({ scenes: [{ location: 'limo', time: 'night', cast: [{ character: 'barney', mark: 'bench_2' }, { character: 'ranjit', mark: 'driver' }], beats }] });
    expect(errors([], limo([{ type: 'move', character: 'barney', to: 'bench_3' }]))).toBe('');
    expect(errors([], limo([{ type: 'move', character: 'barney', to: 'driver_door' }]))).toContain('different compartments');
  });

  test('codes and titles are unique across the catalog', () => {
    const a = episode([]);
    expect(validateCatalog([{ file: 'a.json', episode: a }, { file: 'b.json', episode: { ...a, code: 'S99E02' } }]).map((i) => i.message)).toEqual(['same title as a.json: The Test']);
  });
});

describe('the catalog', () => {
  for (const file of EPISODE_FILES) test(`${file} is performable as written`, () => {
    const ep = EPISODES.find((e) => file.startsWith(`${e.code.toLowerCase()}-`));
    expect(ep, 'file name starts with its episode code').toBeDefined();
    expect(messages(ep)).toEqual([]);
  });

  test('every code and title is unique', () => {
    expect(validateCatalog(EPISODES.map((episode, i) => ({ file: EPISODE_FILES[i], episode })))).toEqual([]);
  });

  test('between them, every delivery, both cutaway styles and every transition', () => {
    const deliveries = (beats: Beat[]): string[] => beats.flatMap((b) =>
      b.type === 'cutaway' ? deliveries(b.beats) : b.type === 'say' ? [b.delivery ?? '', b.interrupted ? 'interrupted' : ''] : []);
    const scenes = EPISODES.flatMap((ep) => ep.scenes);
    const used = new Set(scenes.flatMap((s) => deliveries(s.beats)));
    for (const d of ['whisper', 'shout', 'sing', 'deadpan', 'fast', 'slow', 'interrupted']) expect(used.has(d), d).toBe(true);
    const styles = new Set(scenes.flatMap((s) => s.beats.flatMap((b) => b.type === 'cutaway' ? [b.style] : [])));
    expect([...styles].sort()).toEqual(['flashback', 'imagined']);
    expect(new Set(scenes.map((s) => s.transition))).toEqual(new Set(['cut', 'skyline', 'exterior', 'rewind']));
  });

  test('an episode airs from its cold open, with its guests, to its credits', () => {
    const ep = rerun('The Guest Lecture');
    const items = episodeItems(ep, 'x');
    expect(items.map((i) => i.kind)).toEqual(['episode-start', ...ep.scenes.map(() => 'scene'), 'episode-end']);
    expect(items[0].kind === 'episode-start' && items[0].guests?.map((g) => g.name)).toEqual(ep.guests!.map((g) => g.name));
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
    const ep = rerun('The Silent Auction');
    const [first, , third] = ep.scenes;
    const episode = { id: 'auction', code: ep.code, title: ep.title, logline: '' };
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
