import { describe, expect, test } from 'bun:test';
import { musicCoverage, musicSummary } from '../src/script/music';
import { validateEpisode } from '../src/script/validate';
import type { Beat, EpisodeScript, Scene } from '../src/script/types';
import { testStage } from './helpers/sets';

const say: Beat = { type: 'say', character: 'ted', line: 'Hello.' };
const score = (music: 'tender' | 'tense' | 'playful' | 'none' | 'silence'): Beat => ({ type: 'score', music });
const scene = (beats: Beat[], more: Partial<Scene> = {}): Scene => ({ location: 'apartment', time: 'night', cast: [{ character: 'ted', mark: 'couch_left' }], beats, ...more });
const episode = (scenes: Scene[], more: Partial<EpisodeScript> = {}): EpisodeScript => ({ code: 'S99E01', title: 'Music', logline: 'Coverage.', scenes, ...more });

describe('music coverage', () => {
  test('titles clear cold-open music; switching moods does not break a continuous run', () => {
    const r = musicCoverage(episode([
      scene([score('tense'), say, score('tender'), say]),
      scene([say, score('playful'), say, score('silence'), say]),
    ]));
    expect(r).toMatchObject({ spoken: 5, withMusic: 3, longestRun: 2 });
    expect(r.spans.map(s => [s.music, s.spoken, s.to])).toEqual([
      ['tense', 1, 'scenes[0].beats[2]'], ['tender', 1, 'main titles'], ['playful', 1, 'scenes[1].beats[3]'],
    ]);
  });

  test('tracks cutaway exits, expanded and sliced replays, and carried score in resumed scenes', () => {
    const memory: Beat = { type: 'cutaway', id: 'memory', style: 'flashback', ...scene([score('tender'), say, score('none'), say]) };
    const r = musicCoverage(episode([
      scene([score('tense'), say, memory, say,
        { type: 'replay', of: 'memory', from: 1, to: 1 },
        { type: 'replay', of: 'memory', changes: [{ at: 0, replace: [score('playful')] }] },
      ], { id: 'home' }),
      { resume: 'home', beats: [say, score('tense'), say] } as Scene,
      scene([say, score('none'), say]),
    ], { coldOpen: 'That winter.' }));
    expect(r).toMatchObject({ spoken: 12, withMusic: 5, longestRun: 2 });
    expect(r.spans.at(-1)).toMatchObject({ music: 'tense', spoken: 2, scenes: [2, 3] });
    expect(r.spans.some(s => s.from.includes('(replay)'))).toBe(true);
  });

  test('montage music replaces and resumes a bed; stops inside a montage persist; accompaniment counts once', () => {
    const montage: Beat = { type: 'montage', music: 'playful', shots: [scene([say]), scene([say])] };
    const stopMontage: Beat = { type: 'montage', music: 'playful', shots: [scene([say, score('none')]), scene([say])] };
    const sung: Beat = { ...say, delivery: 'sing', accompanied: true };
    const r = musicCoverage(episode([scene([
      score('tense'), say, montage, say, stopMontage, say, sung, score('tender'), sung,
    ])], { coldOpen: 'Then.' }));
    expect(r).toMatchObject({ spoken: 10, withMusic: 7, longestRun: 5 });
    expect(r.spans.filter(s => s.kind === 'accompaniment')).toHaveLength(2);
    expect(r.spans.find(s => s.kind === 'score' && s.from.includes('(return)'))).toMatchObject({ music: 'tense', spoken: 1 });
  });

  test('cue-free stories, pauses and over-narration have honest static counts', () => {
    expect(musicSummary(musicCoverage(episode([scene([])])))).toContain('0/0 spoken beats under music (0%)');
    const r = musicCoverage(episode([scene([
      { type: 'narrate', line: 'Over the action.', over: true },
      score('tender'), { type: 'pause', seconds: 2 }, score('none'), say,
    ])]));
    expect(r).toMatchObject({ spoken: 2, withMusic: 0, longestRun: 0 });
    expect(r.spans[0].spoken).toBe(0); // this is line coverage, not a claim that no music plays
  });

  test('heavy coverage is a craft warning, and malformed drafts are not expanded', () => {
    const sets = testStage().sets;
    const r = validateEpisode(episode([scene([score('tender'), ...Array<Beat>(20).fill(say)])]), sets);
    expect(r.errors).toEqual([]);
    expect(r.warnings.some(w => w.message.includes('20/20 spoken beats under music'))).toBe(true);
    const invalid = validateEpisode(episode([scene([{ type: 'replay', of: 'missing' }])]), sets);
    expect(invalid.errors.length).toBeGreaterThan(0);
    expect(invalid.warnings.some(w => w.message.startsWith('music:'))).toBe(false);
  });
});
