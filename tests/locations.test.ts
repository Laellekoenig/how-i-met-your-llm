import { describe, expect, test } from 'bun:test';
import { Syndication } from '../src/script/episodes';
import type { Beat, ShowItem } from '../src/script/types';
import { EPISODES } from './helpers/episodes';

describe('public scene locations', () => {
  test('the catalog and its flashbacks reach all public additions, and syndication loops back to the start', async () => {
    const tv = new Syndication(EPISODES);
    const items: ShowItem[] = [];
    const total = EPISODES.reduce((n, ep) => n + ep.scenes.length + 2, 0);
    for (let i = 0; i < total + 1; i++) items.push(await tv.next());
    const cutaways = (beats: Beat[]): string[] => beats.flatMap(b => b.type === 'cutaway' ? [b.location, ...cutaways(b.beats)] : []);
    const locations = new Set<string>(items.flatMap((item) => item.kind === 'scene' ? [item.scene.location, ...cutaways(item.scene.beats)] : []));
    for (const location of ['metro_news_one', 'store', 'restaurant', 'lecture_hall', 'subway', 'laser_tag', 'wesleyan_dorm', 'hospital', 'elevator', 'canadian_mall']) expect(locations.has(location)).toBe(true);
    const again = items.at(-1)!;
    expect(again.kind).toBe('episode-start');
    expect(again.episode.title).toBe(items[0].episode.title);
    expect(again.episode.id).not.toBe(items[0].episode.id);
  });

  test('an episode code picks where syndication starts', async () => {
    const at = Syndication.indexOf(EPISODES, EPISODES[2].code.toLowerCase());
    expect(at).toBe(2);
    expect((await new Syndication(EPISODES, at).next()).episode.code).toBe(EPISODES[2].code);
    expect(Syndication.indexOf(EPISODES, 'S99E99')).toBe(-1);
    expect(Syndication.indexOf(EPISODES, null)).toBe(-1);
  });
});
