import { describe, expect, test } from 'bun:test';
import { asLocation } from '../src/llm/normalize';
import { sampleEpisode } from '../src/script/samples';

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
    ]) expect(asLocation(input)).toBe(expected);
  });

  test('offline reruns reach all four new sets and still cycle', () => {
    const episodes = Array.from({ length: 5 }, () => sampleEpisode());
    const locations = new Set<string>(episodes.flatMap((items) => items.flatMap((item) => item.kind === 'scene' ? [item.scene.location] : [])));
    for (const location of ['metro_news_one', 'store', 'restaurant', 'lecture_hall']) expect(locations.has(location)).toBe(true);
    expect(episodes[4][0].episode.title).toBe(episodes[0][0].episode.title);
    expect(episodes[4][0].episode.id).not.toBe(episodes[0][0].episode.id);
  });
});
