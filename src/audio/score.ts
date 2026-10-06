import type { MontageMusic } from '../script/types';

export type ScoreVoice = 'pluck' | 'guitar' | 'piano' | 'bell' | 'pad' | 'bass' | 'brass';
export type ScoreEvent =
  | { voice: ScoreVoice; midi: number; duration: number; gain: number; offset: number; bright: number }
  | { voice: 'kick' | 'snare' | 'hat'; gain: number; offset: number };

/** One tick is an eighth note. Jazz delays the offbeats; romantic plays in 6/8. */
export const SCORE_BEDS = {
  upbeat: { step: 0.22, gain: 0.75 },
  tender: { step: 0.3, gain: 0.9 },
  tense: { step: 0.26, gain: 0.8 },
  playful: { step: 0.2, gain: 0.85 },
  romantic: { step: 0.29, gain: 0.85 },
  melancholy: { step: 0.4, gain: 0.9 },
  mysterious: { step: 0.31, gain: 0.85 },
  jazzy: { step: 0.25, gain: 0.8 },
  triumphant: { step: 0.23, gain: 0.7 },
  dreamy: { step: 0.36, gain: 0.85 },
} satisfies Record<MontageMusic, { step: number; gain: number }>;

const E = [40, 47, 52, 56, 59, 64], B = [47, 54, 59, 63, 66], Cs = [49, 56, 61, 64, 68], A = [45, 52, 57, 61, 64];

/** Original arrangements, with separate harmony, instrumentation and rhythms for each mood. */
export function scoreEvents(kind: MontageMusic, i: number): ScoreEvent[] {
  const events: ScoreEvent[] = [];
  const note = (voice: ScoreVoice, midi: number, duration: number, gain: number, offset = 0, bright = 0.3) =>
    events.push({ voice, midi, duration, gain, offset, bright });
  const drum = (voice: 'kick' | 'snare' | 'hat', gain: number, offset = 0) => events.push({ voice, gain, offset });
  const k = i % 8, bar = Math.floor(i / 8);
  switch (kind) {
    case 'upbeat': {
      const chord = [E, B, Cs, A][bar % 4];
      const open = k === 0 || k === 3 || k === 4 || k === 6;
      (open ? chord : chord.slice(0, 3)).forEach((m, j) => note('guitar', m, open ? 1.2 : 0.22, open ? 0.2 : 0.16, j * 0.011, 0.4));
      const m = [76, 0, 75, 76, 78, 0, 76, 73, 75, 0, 71, 0, 73, 71, 68, 0][i % 16];
      if (Math.floor(i / 16) % 2 && m) note('guitar', m, 0.9, 0.22, 0, 0.25);
      if (k % 4 === 0) drum('kick', 1);
      if (k % 4 === 2) drum('snare', 0.25);
      drum('hat', k % 2 ? 0.04 : 0.06);
      break;
    }
    case 'tender': {
      const chord = [E, Cs, A, B][bar % 4];
      if (k === 0) note('pluck', chord[0], 2, 0.2, 0, 0.25);
      note('pluck', chord[[1, 3, 2, 4, 1, 3, 2, 4][k] % chord.length] + 12, 1.4, 0.13);
      break;
    }
    case 'tense':
      note('pluck', [40, 40, 43, 40, 46, 40, 43, 39][k], 0.45, 0.26, 0, 0.15);
      if (k === 0 && bar % 2) note('pluck', Math.floor(i / 16) % 2 ? 71 : 70, 1.6, 0.09);
      drum('hat', k % 2 ? 0.025 : 0.04);
      break;
    case 'playful': {
      const chord = [[48, 55, 60, 64, 69], [41, 48, 57, 60, 62], [43, 50, 59, 62, 65], [48, 55, 60, 64, 67]][bar % 4];
      if (k % 2 === 0) note('pluck', chord[k === 4 ? 1 : 0], 0.3, 0.25, 0, 0.1);
      if (k % 2) note('bell', chord[[2, 4, 3, 4][Math.floor(k / 2)]] + 12, 0.4, 0.12);
      if (k === 2 || k === 6) note('pluck', chord[2], 0.22, 0.1);
      break;
    }
    case 'romantic': {
      const pulse = i % 12;
      const chord = [[50, 57, 61, 66, 69], [47, 54, 57, 62, 66], [43, 50, 54, 59, 62], [45, 52, 57, 59, 64]][Math.floor(i / 12) % 4];
      if (pulse === 0) {
        note('piano', chord[0], 3, 0.2);
        chord.slice(2).forEach((m) => note('pad', m, 3.6, 0.04));
      }
      if (pulse % 2 === 0) note('piano', chord[[2, 3, 4, 3, 2, 1][pulse / 2]] + 12, 1.7, 0.14);
      break;
    }
    case 'melancholy': {
      const chord = [[45, 52, 55, 59, 60], [41, 48, 52, 57, 60], [48, 55, 59, 64, 67], [43, 50, 55, 59, 62]][bar % 4];
      if (k === 0) {
        note('piano', chord[0], 3.2, 0.19);
        note('piano', chord[2], 2.8, 0.08, 0.035);
      }
      if (k === 2 || k === 5) note('piano', chord[k === 2 ? 4 : 3] + 12, 2.4, 0.12);
      break;
    }
    case 'mysterious': {
      const root = [38, 41, 37, 38][bar % 4];
      if (k === 0 || k === 3 || k === 6) note('bass', root, 0.55, 0.22);
      if (k === 0) note('pad', root + 19, 2.6, 0.06);
      if (k === 2 || k === 7) note('bell', root + (k === 2 ? 36 : 37), 1.8, 0.075);
      break;
    }
    case 'jazzy': {
      const chord = [[48, 55, 59, 62, 64], [45, 52, 55, 60, 64], [50, 57, 60, 64, 65], [43, 50, 53, 57, 59]][bar % 4];
      const offset = k % 2 ? SCORE_BEDS.jazzy.step / 3 : 0;
      if (k % 2 === 0) note('bass', chord[[0, 2, 1, 3][k / 2]] - (k === 0 ? 0 : 12), 0.42, 0.2);
      if (k === 1 || k === 4 || k === 7) chord.slice(2).forEach((m, j) => note('piano', m, 0.65, 0.08, offset + j * 0.008));
      if (bar % 2 && k === 5) note('piano', chord[4] + 12, 0.5, 0.1, offset);
      if (k === 2 || k === 6) drum('snare', 0.055);
      drum('hat', k % 2 ? 0.018 : 0.03, offset);
      break;
    }
    case 'triumphant': {
      const chord = [[48, 55, 60, 64, 67], [43, 50, 55, 59, 62], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60]][bar % 4];
      if (k === 0 || k === 4) {
        note('bass', chord[0], 0.65, 0.22);
        chord.slice(2).forEach((m) => note('brass', m, 0.8, 0.08));
        drum('kick', 0.6);
      }
      if (k % 2 === 0) note('brass', chord[[2, 3, 4, 3][k / 2]] + 12, 0.35, 0.09);
      if (k === 2 || k === 6) drum('snare', 0.16);
      break;
    }
    case 'dreamy': {
      const chord = [[48, 55, 62, 64, 67], [52, 59, 62, 66, 67], [45, 52, 59, 60, 64], [41, 48, 55, 57, 60]][bar % 4];
      if (k === 0) chord.slice(1).forEach((m) => note('pad', m, 3.8, 0.06));
      if (k === 1 || k === 4 || k === 6) note('bell', chord[k === 1 ? 4 : k === 4 ? 2 : 3] + 12, 2.2, 0.085);
      break;
    }
    default: kind satisfies never;
  }
  return events;
}
