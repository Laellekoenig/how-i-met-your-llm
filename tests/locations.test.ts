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

  test('seeking drops the rest of the current episode and airs the picked one from its cold open, then carries on', async () => {
    const tv = new Syndication(EPISODES);
    await tv.next();
    await tv.next();
    tv.seek(3);
    const picked = await tv.next();
    expect(picked.kind).toBe('episode-start');
    expect(picked.episode.code).toBe(EPISODES[3].code);
    for (let i = 0; i < EPISODES[3].scenes.length + 1; i++) await tv.next();
    expect((await tv.next()).episode.code).toBe(EPISODES[4 % EPISODES.length].code);
  });

  test('off the air, nothing airs until an episode is picked, then it airs from its cold open', async () => {
    const airing = new Syndication(EPISODES);
    await airing.next();
    airing.off();
    // starting off the air (on the guide), or going back to it mid-episode
    for (const tv of [new Syndication(EPISODES, null), airing]) {
      let aired: ShowItem | null = null;
      const waiting = tv.next().then((item) => (aired = item));
      await Bun.sleep(5);
      expect(aired).toBeNull();
      tv.seek(5);
      await waiting;
      expect(aired!.kind).toBe('episode-start');
      expect(aired!.episode.code).toBe(EPISODES[5].code);
      expect((await tv.next()).kind).toBe('scene');
    }
  });
});
