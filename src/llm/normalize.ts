import {
  CHARACTER_IDS, EMOTIONS, GESTURES, LAUGHS, LOCATION_IDS,
  type Beat, type CastPlacement, type CharacterId, type Emotion, type Gesture, type LaughKind, type LocationId, type Scene, type TimeOfDay,
} from '../script/types';

// LLM output is untrusted and creative. Coerce it into something the player can perform.

const inSet = <T extends string>(set: readonly T[], v: unknown): T | undefined => {
  if (typeof v !== 'string') return undefined;
  const s = v.toLowerCase().trim().replace(/[\s-]+/g, '_');
  return (set as readonly string[]).includes(s) ? (s as T) : undefined;
};

const CHAR_ALIASES: Record<string, CharacterId> = {
  'ted mosby': 'ted', mosby: 'ted', 'marshall eriksen': 'marshall', marshmallow: 'marshall', 'lily aldrin': 'lily', lilypad: 'lily',
  'robin scherbatsky': 'robin', scherbatsky: 'robin', 'barney stinson': 'barney', stinson: 'barney', 'wendy the waitress': 'wendy',
  'carl the bartender': 'carl', bartender: 'carl', waitress: 'wendy',
  'the captain': 'captain', 'george van smoot': 'captain', 'van smoot': 'captain', 'marvin eriksen': 'marvin', 'marvin sr': 'marvin',
  'marvin sr.': 'marvin', 'marvin eriksen sr.': 'marvin', 'mr. eriksen': 'marvin', "marshall's dad": 'marvin',
  'james stinson': 'james', "barney's brother": 'james',
};

export function asChar(v: unknown): CharacterId | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.toLowerCase().trim();
  return inSet(CHARACTER_IDS, s) ?? CHAR_ALIASES[s] ?? CHARACTER_IDS.find((c) => s.startsWith(c));
}

export const asLocation = (v: unknown): LocationId => {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  return inSet(LOCATION_IDS, s) ?? (s.includes('barney') ? 'barneys' : s.includes('apart') ? 'apartment' : 'maclarens');
};

export const asTime = (v: unknown): TimeOfDay => (v === 'day' ? 'day' : 'night');

const TYPE_ALIASES: Record<string, Beat['type']> = {
  dialogue: 'say', line: 'say', speak: 'say', talk: 'say', narration: 'narrate', voiceover: 'narrate', future_ted: 'narrate',
  walk: 'move', goto: 'move', gesture: 'act', action: 'act', laugh_track: 'laugh', wait: 'pause', leave: 'exit', arrive: 'enter',
};

export function normalizeScene(raw: Record<string, unknown>, location: LocationId, time: TimeOfDay, summary?: string): Scene {
  const cast: CastPlacement[] = [];
  const seen = new Set<string>();
  for (const c of Array.isArray(raw.cast) ? raw.cast : []) {
    const ch = asChar((c as Record<string, unknown>)?.character);
    if (!ch || seen.has(ch)) continue;
    seen.add(ch);
    cast.push({ character: ch, mark: String((c as Record<string, unknown>).mark ?? '') });
  }
  const beats: Beat[] = [];
  for (const r of Array.isArray(raw.beats) ? raw.beats : []) {
    const b = normalizeBeat(r as Record<string, unknown>);
    if (b) beats.push(b);
    if (beats.length >= 70) break;
  }
  return { location, time, summary, cast, beats };
}

function normalizeBeat(r: Record<string, unknown>): Beat | null {
  if (!r || typeof r !== 'object') return null;
  const rawType = String(r.type ?? '').toLowerCase().trim();
  const type = (inSet(['say', 'narrate', 'move', 'enter', 'exit', 'act', 'laugh', 'pause'] as const, rawType) ?? TYPE_ALIASES[rawType]) as Beat['type'] | undefined;
  const character = asChar(r.character ?? r.speaker ?? r.who);
  const line = typeof (r.line ?? r.text ?? r.dialogue) === 'string' ? String(r.line ?? r.text ?? r.dialogue) : '';
  const emotion = inSet<Emotion>(EMOTIONS, r.emotion);
  const gesture = inSet<Gesture>(GESTURES, r.gesture);
  const laugh = inSet<LaughKind>(LAUGHS, r.laugh);
  const toRaw = typeof r.to === 'string' ? r.to : typeof r.target === 'string' ? r.target : typeof r.mark === 'string' ? r.mark : undefined;
  const to = toRaw ? asChar(toRaw) ?? toRaw.toLowerCase().trim().replace(/\s+/g, '_') : undefined;

  switch (type) {
    case 'say':
      if (!character) return line ? { type: 'narrate', line, laugh } : null;
      if (!line.trim()) return null;
      return { type: 'say', character, line, emotion, to, gesture, laugh };
    case 'narrate':
      return line.trim() ? { type: 'narrate', line, laugh } : null;
    case 'move':
      return character && to ? { type: 'move', character, to } : null;
    case 'enter':
      return character ? { type: 'enter', character, to } : null;
    case 'exit':
      return character ? { type: 'exit', character } : null;
    case 'act':
      return character && gesture ? { type: 'act', character, gesture, to, emotion } : null;
    case 'laugh':
      return { type: 'laugh', laugh: laugh ?? inSet<LaughKind>(LAUGHS, r.kind) ?? 'laugh' };
    case 'pause':
      return { type: 'pause', seconds: Number(r.seconds) || 1 };
    default:
      return null;
  }
}
