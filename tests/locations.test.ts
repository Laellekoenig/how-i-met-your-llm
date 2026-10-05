import { describe, expect, test } from 'bun:test';
import { asLocation } from '../src/llm/normalize';
import { sampleCount, sampleEpisode } from '../src/script/samples';
import type { Beat } from '../src/script/types';

describe('public scene locations', () => {
  test('recognizes canonical IDs and creative location names before broad office aliases', () => {
    for (const [input, expected] of [
      ['metro_news_one', 'metro_news_one'], ['Metro News One studio', 'metro_news_one'],
      ["Robin's news studio at work", 'metro_news_one'], ['Metro News 1', 'metro_news_one'],
      ["Ted's lecture hall", 'lecture_hall'], ['university classroom', 'lecture_hall'],
      ['lecture-hall', 'lecture_hall'], ['generic store', 'store'], ['corner bodega', 'store'],
      ['restaurant', 'restaurant'], ['neighborhood bistro', 'restaurant'],
      ["Barney's office", 'barneys_office'], ["Ted's architecture office", 'office'],
      ["Robin's newsroom office", 'office'], ['unrecognized place', 'maclarens'],
      ['NYC subway car', 'subway'], ['1 train', 'subway'],
      ["Barney's laser tag arena", 'laser_tag'], ['laser-tag', 'laser_tag'],
      ['Wesleyan university dorm room', 'wesleyan_dorm'], ['College, 1996', 'wesleyan_dorm'],
      ['hospital waiting room', 'hospital'], ['hospital reception office', 'hospital'],
      ['GNB elevator', 'elevator'], ['office lift', 'elevator'],
      ['1990 Canadian mall', 'canadian_mall'], ['Robin Sparkles shopping mall', 'canadian_mall'],
    ]) expect(asLocation(input)).toBe(expected);
  });

  test('offline reruns and flashbacks reach every public addition and still cycle', () => {
    const n = sampleCount();
    const episodes = Array.from({ length: n + 1 }, () => sampleEpisode());
    const cutaways = (beats: Beat[]): string[] => beats.flatMap(b => b.type === 'cutaway' ? [b.location, ...cutaways(b.beats)] : []);
    const locations = new Set<string>(episodes.flatMap((items) => items.flatMap((item) => item.kind === 'scene' ? [item.scene.location, ...cutaways(item.scene.beats)] : [])));
    for (const location of ['metro_news_one', 'store', 'restaurant', 'lecture_hall', 'subway', 'laser_tag', 'wesleyan_dorm', 'hospital', 'elevator', 'canadian_mall']) expect(locations.has(location)).toBe(true);
    expect(episodes[n][0].episode.title).toBe(episodes[0][0].episode.title);
    expect(episodes[n][0].episode.id).not.toBe(episodes[0][0].episode.id);
  });
});
