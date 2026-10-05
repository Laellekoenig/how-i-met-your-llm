import { describe, expect, test } from 'bun:test';
import { normalizeScene } from '../src/llm/normalize';
import { RERUNS } from '../src/script/samples';
import { roles } from '../src/ui/casting';

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
      expect(roles().filter(([key]) => key === id)).toHaveLength(1);
    });
  });

  test('the offline reruns give every recurring character a line that survives normalization', () => {
    const speakers = new Set<string>();
    for (const { scenes, guests } of RERUNS) for (const scene of scenes) {
      const normalized = normalizeScene({ ...scene }, scene.location, scene.time, undefined, { guests });
      expect(normalized.beats).toEqual(scene.beats);
      for (const beat of normalized.beats.flatMap((b) => b.type === 'cutaway' ? b.beats : [b])) if (beat.type === 'say') speakers.add(beat.character);
    }
    for (const id of ['sandy', 'arthur', 'brad', 'victoria', 'quinn', 'kevin', 'judy', 'scooter']) expect(speakers.has(id)).toBe(true);
  });
});
