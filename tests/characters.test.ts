import { describe, expect, test } from 'bun:test';
import { asChar, normalizeScene } from '../src/llm/normalize';
import { RERUNS } from '../src/script/samples';
import { CHARACTERS } from '../src/world/characters';
import { testStage } from './helpers/sets';
import type { CharacterId } from '../src/script/types';

describe('recurring guest dialogue', () => {
  test('full names from the writer remain dialogue with castable voices, including directed gestures', () => {
    const names = ['Sandy Rivers', 'Artillery Arthur', 'Brad Morris', 'Victoria', 'Quinn Garvey', 'Kevin Venkataraghavan', "Marshall's mom", 'Scooter'];
    const expected = ['sandy', 'arthur', 'brad', 'victoria', 'quinn', 'kevin', 'judy', 'scooter'];
    const normalized = normalizeScene({
      cast: names.map(character => ({ character, mark: 'center' })),
      beats: names.flatMap(character => [
        { type: 'say', character, line: 'We should talk.', to: 'Sandy Rivers', gesture: 'wave' },
        { type: 'act', character, gesture: 'nod', to: 'Quinn Garvey' },
      ]),
    }, 'maclarens', 'night');
    expect(normalized.cast.map(c => c.character)).toEqual(expected);
    expected.forEach((id, i) => {
      expect(normalized.beats[i * 2]).toMatchObject({ type: 'say', character: id, to: 'sandy', gesture: 'wave' });
      expect(normalized.beats[i * 2 + 1]).toMatchObject({ type: 'act', character: id, to: 'quinn', gesture: 'nod' });
      expect(CHARACTERS[id as CharacterId].voice).toBeDefined();
    });
  });

  test('family names and Robin Sparkles resolve in casting, dialogue and directed actions', () => {
    const names = ['Loretta Stinson', "Lily's dad", 'Hammond Druthers', 'Stella Zinman', 'Zoey Pierson', 'Nora', "Ted's mom", 'Adam Punciarello', 'Robin Sparkles'];
    const ids = ['loretta', 'mickey', 'hammond', 'stella', 'zoey', 'nora', 'virginia', 'punchy', 'robin_sparkles'];
    const scene = normalizeScene({
      cast: names.map(character => ({ character, mark: 'center' })),
      beats: names.map(character => ({ type: 'say', character, line: 'Hello.', to: 'Robin Sparkles', gesture: 'wave' })),
    }, 'maclarens', 'night');
    expect(scene.cast.map(c => c.character)).toEqual(ids);
    scene.beats.forEach((beat, i) => expect(beat).toMatchObject({ type: 'say', character: ids[i], to: 'robin_sparkles' }));
    for (const id of ids) expect(CHARACTERS[id as CharacterId].voice).toBeDefined();
    expect(asChar('robin-sparkles')).toBe('robin_sparkles');
    expect(asChar('Robin Scherbatsky')).toBe('robin');
  });

  test('the offline reruns give every recurring character a line that survives normalization', () => {
    const speakers = new Set<string>();
    for (const { scenes, guests } of RERUNS) for (const scene of scenes) {
      const normalized = normalizeScene({ ...scene }, scene.location, scene.time, undefined, { guests });
      expect(normalized.beats).toEqual(scene.beats);
      for (const beat of normalized.beats.flatMap((b) => b.type === 'cutaway' ? b.beats : [b])) if (beat.type === 'say') speakers.add(beat.character);
    }
    for (const id of ['sandy', 'arthur', 'brad', 'victoria', 'quinn', 'kevin', 'judy', 'scooter', 'loretta', 'mickey', 'hammond', 'stella', 'zoey', 'nora', 'virginia', 'punchy', 'robin_sparkles']) expect(speakers.has(id)).toBe(true);
  });
});

describe('work wardrobe', () => {
  const stage = testStage();
  const style = (id: CharacterId) => stage.actors[id].def.look.topStyle;

  test('Ted and Marshall suit up at their workplaces and change back everywhere else', () => {
    stage.setLocation('office', 'day');
    expect([style('ted'), style('marshall')]).toEqual(['suit', 'suit']);
    expect(stage.actors.marshall.def.look.plaid).toBeUndefined();
    stage.setLocation('lecture_hall', 'day');
    expect([style('ted'), style('marshall')]).toEqual(['suit', 'flannel']);
    stage.setLocation('barneys_office', 'day');
    expect([style('ted'), style('marshall')]).toEqual(['blazer', 'suit']);
    stage.setLocation('maclarens', 'night');
    expect([style('ted'), style('marshall')]).toEqual(['blazer', 'flannel']);
    expect(stage.actors.ted.def.look.tweed).toBe(true);
  });

  test('a cast outfit overrides the location, and comes back after a cutaway', () => {
    stage.setLocation('maclarens', 'night');
    stage.dress('marshall', 'work');
    stage.place('marshall', 'booth_left_back');
    expect(style('marshall')).toBe('suit');
    const frozen = stage.freeze();
    stage.setLocation('apartment', 'day');
    expect(style('marshall')).toBe('flannel');
    stage.thaw(frozen);
    expect(style('marshall')).toBe('suit');
    expect(stage.onStage('marshall')).toBe(true);
  });

  test('swapping outfits reuses the actors already built', () => {
    stage.setLocation('office', 'day');
    const suited = stage.actors.ted;
    stage.setLocation('maclarens', 'night');
    const casual = stage.actors.ted;
    stage.setLocation('office', 'day');
    expect(stage.actors.ted).toBe(suited);
    expect(casual.root.visible).toBe(false);
  });

  test('the writer can ask for an outfit on a cast entry', () => {
    const scene = normalizeScene({ cast: [{ character: 'Marshall', mark: 'booth_end', outfit: 'Work' }, { character: 'ted', mark: 'x', outfit: 'tux' }], beats: [] }, 'maclarens', 'night');
    expect(scene.cast).toEqual([{ character: 'marshall', mark: 'booth_end', outfit: 'work' }, { character: 'ted', mark: 'x' }]);
  });
});
