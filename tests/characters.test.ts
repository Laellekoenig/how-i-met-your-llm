import { describe, expect, test } from 'bun:test';
import { roles } from '../src/ui/casting';
import { validateEpisode } from '../src/script/validate';
import { testStage } from './helpers/sets';
import { EPISODES, rerun } from './helpers/episodes';
import type { Beat, CharacterId } from '../src/script/types';

describe('recurring guest dialogue', () => {
  test('the catalog gives every recurring character a line, and each has a castable voice', () => {
    const speakers = new Set<string>();
    const say = (beats: Beat[]): void => beats.forEach((b) => b.type === 'say' ? speakers.add(b.character) : b.type === 'cutaway' && say(b.beats));
    for (const { scenes } of EPISODES) for (const scene of scenes) say(scene.beats);
    for (const id of ['sandy', 'arthur', 'brad', 'victoria', 'quinn', 'kevin', 'judy', 'scooter']) {
      expect(speakers.has(id), id).toBe(true);
      expect(roles().filter(([key]) => key === id)).toHaveLength(1);
    }
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

  test('the writer can ask for an outfit on a cast entry, and only a real one', () => {
    const ep = rerun('The Understudy');
    const dressed = (outfit: unknown) => validateEpisode({
      ...ep, scenes: [{ ...ep.scenes[0], cast: ep.scenes[0].cast.map((c) => c.character === 'marshall' ? { ...c, outfit } : c) }, ...ep.scenes.slice(1)],
    }, stage.sets).errors;
    expect(dressed('work')).toEqual([]);
    expect(dressed('casual')).toEqual([]);
    expect(dressed('tux')).toHaveLength(1);
  });
});
