// Mouth shapes for a line, worked out from its spelling: the browser's voices don't tell us their visemes, so each
// syllable opens the mouth for its vowel and closes it on the consonant after (lips shut on m, b and p). Spread over
// the line's estimated length, and pulled back into step whenever the voice reports reaching a word.

/** How open the mouth is, how rounded ("oo") and how wide ("ee"), 0..1. */
export interface MouthShape { open: number; round: number; wide: number }

export interface LipTrack {
  readonly duration: number;
  at(t: number): MouthShape;
  /** When the word at (or after) this character starts, in seconds. */
  wordAt(charIndex: number): number;
}

interface Unit { t0: number; t1: number; peak: MouthShape; close: number }

const VOWEL: Record<string, MouthShape> = {
  a: { open: 1, round: 0, wide: 0.5 },
  e: { open: 0.55, round: 0, wide: 1 },
  i: { open: 0.5, round: 0, wide: 1 },
  y: { open: 0.5, round: 0, wide: 0.9 },
  o: { open: 0.8, round: 1, wide: 0 },
  u: { open: 0.5, round: 0.9, wide: 0 },
};
const SHUT: MouthShape = { open: 0, round: 0, wide: 0 };

const SYLLABLE = 1, WORD_GAP = 0.15, COMMA = 1.2, STOP = 1.8, DASH = 0.8;

export function lipTrack(text: string, seconds: number): LipTrack {
  // weighted pieces first, then spread over the time we have
  const pieces: { w: number; peak?: MouthShape; close?: number; word?: number }[] = [];
  const words: { at: number; piece: number }[] = [];
  for (const m of text.matchAll(/[A-Za-z']+|\d+|[,;:]|[.!?]+|[-–—]+/g)) {
    const tok = m[0];
    if (/^[,;:]$/.test(tok)) pieces.push({ w: COMMA });
    else if (/^[.!?]/.test(tok)) pieces.push({ w: STOP });
    else if (/^[-–—]/.test(tok)) pieces.push({ w: DASH });
    else {
      words.push({ at: m.index!, piece: pieces.length });
      if (/^\d/.test(tok)) {
        // numbers are said as words: a couple of open syllables per digit pair
        for (let i = 0; i < Math.max(1, Math.ceil(tok.length / 2)) * 2; i++) pieces.push({ w: SYLLABLE, peak: VOWEL[i % 2 ? 'e' : 'a'], close: 0.3 });
      } else {
        const lower = tok.toLowerCase();
        // vowel groups are syllables; a leading y is a consonant, a silent final e isn't a syllable
        const groups = [...lower.matchAll(/[aeiou]+|(?<=.)y/g)].filter((g, _, all) => !(g[0] === 'e' && g.index === lower.length - 1 && all.length > 1));
        if (!groups.length) pieces.push({ w: SYLLABLE, peak: VOWEL.a, close: 0.3 });
        groups.forEach((g, i) => {
          const after = lower.slice(g.index! + g[0].length, groups[i + 1]?.index ?? lower.length);
          const close = /[mbp]/.test(after) ? 0 : /[fv]/.test(after) ? 0.12 : after ? 0.3 : 0.15;
          pieces.push({ w: SYLLABLE, peak: VOWEL[g[0][0]] ?? VOWEL.a, close });
        });
      }
      pieces.push({ w: WORD_GAP });
    }
  }
  const total = pieces.reduce((n, p) => n + p.w, 0) || 1;
  const per = seconds / total;
  const units: Unit[] = [];
  const starts: number[] = [];
  let t = 0;
  for (const p of pieces) {
    starts.push(t);
    if (p.peak) units.push({ t0: t, t1: t + p.w * per, peak: p.peak, close: p.close ?? 0.3 });
    t += p.w * per;
  }
  return {
    duration: seconds,
    at(time) {
      // the units are in order; a short line is a handful of them, so a scan is fine
      const u = units.find((x) => time < x.t1);
      if (!u || time < u.t0) return SHUT;
      const p = (time - u.t0) / (u.t1 - u.t0);
      const env = p < 0.35 ? p / 0.35 : 1 - (1 - u.close) * ((p - 0.35) / 0.65);
      return { open: u.peak.open * env, round: u.peak.round * env, wide: u.peak.wide * env };
    },
    wordAt(charIndex) {
      const w = words.find((x) => x.at >= charIndex) ?? words.at(-1);
      return w ? starts[w.piece] : 0;
    },
  };
}
