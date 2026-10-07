import { replayBeats, resolveStrands } from './strands';
import type { Beat, EpisodeScript, MontageMusic } from './types';

export interface MusicSpan {
  music: MontageMusic | 'guitar';
  kind: 'score' | 'montage' | 'accompaniment';
  from: string;
  to: string;
  spoken: number;
  /** One-based story scene numbers, excluding the couch opening. */
  scenes: number[];
}

export interface MusicCoverage {
  spoken: number;
  withMusic: number;
  longestRun: number;
  spans: MusicSpan[];
}

/** Static spoken-beat coverage, not a runtime estimate. Call only after schema validation.
 * Replays are expanded as played; resumed blocking is not spoken again. Title music is excluded.
 * An `over` narration counts at its entry: its wall-clock overlap with later cues is not predicted.
 */
export function musicCoverage(script: EpisodeScript): MusicCoverage {
  const ep = resolveStrands(script);
  const result: MusicCoverage = { spoken: 0, withMusic: 0, longestRun: 0, spans: [] };
  let score: MontageMusic | null = null;
  let active: MusicSpan | null = null;
  let run = 0;

  const change = (music: MontageMusic | null, kind: 'score' | 'montage', path: string) => {
    if (active) active.to = path;
    active = music ? { music, kind, from: path, to: '', spoken: 0, scenes: [] } : null;
    if (active) result.spans.push(active);
    else run = 0;
  };
  const boundary = (path: string) => {
    score = null;
    change(null, 'score', path);
  };
  const walk = (beats: Beat[], path: string, scene: number, depth = 0) => {
    // The validator caps nesting; this guard also bounds recursive replay expansion.
    if (depth > 16) throw new Error('Music analysis exceeded the validated replay depth');
    beats.forEach((b, i) => {
      const p = `${path}[${i}]`;
      switch (b.type) {
        case 'score':
          score = b.music === 'none' || b.music === 'silence' ? null : b.music;
          change(score, 'score', p);
          return;
        case 'cutaway': case 'split':
          walk(b.beats, `${p}.beats`, scene, depth + 1);
          return;
        case 'replay':
          if (b.strand) walk(replayBeats(b.strand.beats, b), `${p} (replay).beats`, scene, depth + 1);
          return;
        case 'montage':
          change(b.music, 'montage', p);
          b.shots.forEach((shot, j) => walk(shot.beats, `${p}.shots[${j}].beats`, scene, depth + 1));
          // Score changes inside a shot persist, just as they do in the player.
          change(score, 'score', `${p} (return)`);
          return;
      }
      if (!('line' in b) || !b.line?.trim()) return;
      result.spoken++;
      const accompanied = b.type === 'say' && b.delivery === 'sing' && b.accompanied;
      if (active || accompanied) {
        result.withMusic++;
        result.longestRun = Math.max(result.longestRun, ++run);
        if (active) {
          active.spoken++;
          if (scene && !active.scenes.includes(scene)) active.scenes.push(scene);
        }
        if (accompanied) result.spans.push({ music: 'guitar', kind: 'accompaniment', from: p, to: `${p} (end)`, spoken: 1, scenes: scene ? [scene] : [] });
        if (!active) run = 0;
      } else run = 0;
    });
  };

  const couchOpening = !!ep.coldOpen || !!ep.couch?.length;
  if (ep.coldOpen) walk([{ type: 'narrate', line: ep.coldOpen }], 'coldOpen', 0);
  walk(ep.couch ?? [], 'couch', 0);
  if (couchOpening) boundary('main titles');
  ep.scenes.forEach((scene, i) => {
    walk(scene.beats, `scenes[${i}].beats`, i + 1);
    if (!couchOpening && i === 0) boundary('main titles');
  });
  boundary('closing credits');
  return result;
}

export function musicSummary(coverage: MusicCoverage): string {
  const { spoken, withMusic, longestRun } = coverage;
  const percent = spoken ? Math.round(100 * withMusic / spoken) : 0;
  return `${withMusic}/${spoken} spoken beats under music (${percent}%); longest continuous run: ${longestRun} spoken beat${longestRun === 1 ? '' : 's'}`;
}
