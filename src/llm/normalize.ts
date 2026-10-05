import {
  CHARACTER_IDS, CUTAWAY_STYLES, DELIVERIES, EMOTIONS, GESTURES, GUEST_COLORS, GUEST_EXTRAS, GUEST_HAIR, GUEST_HAIR_STYLES, GUEST_IDS, GUEST_SKIN, GUEST_TOPS,
  LAUGHS, LOCATION_IDS, OUTFITS, TRANSITIONS, isGuest, isKid,
  type Beat, type CastPlacement, type CharacterId, type CutawayStyle, type Delivery, type Emotion, type Gesture, type GuestStar, type LaughKind,
  type LocationId, type Scene, type SceneLocationId, type TimeOfDay,
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
  'sandy rivers': 'sandy', rivers: 'sandy', 'arthur hobbs': 'arthur', hobbs: 'arthur', 'artillery arthur': 'arthur',
  'brad morris': 'brad', 'quinn garvey': 'quinn', 'kevin venkataraghavan': 'kevin', 'dr. kevin': 'kevin',
  'judy eriksen': 'judy', 'mrs. eriksen': 'judy', "marshall's mom": 'judy', "marshall's mother": 'judy',
  "lily's ex": 'scooter',
  'loretta stinson': 'loretta', "barney's mom": 'loretta', "barney's mother": 'loretta',
  'mickey aldrin': 'mickey', "lily's dad": 'mickey', "lily's father": 'mickey',
  'hammond druthers': 'hammond', druthers: 'hammond', "ted's old boss": 'hammond',
  'stella zinman': 'stella', 'zoey pierson': 'zoey', 'zoey pierson van smoot': 'zoey',
  'virginia mosby': 'virginia', "ted's mom": 'virginia', "ted's mother": 'virginia',
  'adam punciarello': 'punchy', 'adam "punchy" punciarello': 'punchy',
  'robin sparkles': 'robin_sparkles', sparkles: 'robin_sparkles',
  'penny mosby': 'penny', "ted's daughter": 'penny', daughter: 'penny', 'luke mosby': 'luke', "ted's son": 'luke', son: 'luke',
  // a line "the kids" say together goes to whoever's quicker
  kids: 'penny', 'the kids': 'penny', 'both kids': 'penny',
};

/** This episode's guest stars: their names resolve to their slots, and unused slots don't exist. */
export interface Casting {
  guests: GuestStar[];
}

export function asChar(v: unknown, casting?: Casting): CharacterId | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.toLowerCase().trim();
  const id = inSet(CHARACTER_IDS, s) ?? guestByName(s, casting) ?? CHAR_ALIASES[s] ?? CHARACTER_IDS.find((c) => s.startsWith(c));
  // without a casting (the reruns), every slot is fair game
  if (isGuest(id) && casting && !casting.guests.some((g) => g.id === id)) return undefined;
  return id;
}

function guestByName(s: string, casting?: Casting) {
  for (const g of casting?.guests ?? []) {
    const name = g.name.toLowerCase();
    if (s === name || s === name.split(/\s+/)[0]) return g.id;
  }
  return undefined;
}

const LOCATION_HINTS: [RegExp, LocationId][] = [
  [/metro[\s_-]*news|news[\s_-]*(studio|set)|robin.*(studio|station)/, 'metro_news_one'],
  [/lecture|classroom|university|college|ted.*class/, 'lecture_hall'],
  [/restaurant|bistro|diner|cafe|café/, 'restaurant'],
  [/\b(store|shop|bodega|market|grocery|boutique)\b/, 'store'],
  [/barney.*(office|work|gnb)|gnb|goliath/, 'barneys_office'],
  [/limo/, 'limo'],
  [/taxi|\bcab(?!in)/, 'taxi'],
  [/roof/, 'rooftop'],
  [/office|work|cubicle/, 'office'],
  [/barney/, 'barneys'],
  [/apart/, 'apartment'],
];

export const asLocation = (v: unknown): LocationId => {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  return inSet(LOCATION_IDS, s) ?? LOCATION_HINTS.find(([re]) => re.test(s))?.[1] ?? 'maclarens';
};

export const asTime = (v: unknown, fallback: TimeOfDay = 'night'): TimeOfDay => (v === 'day' || v === 'night' ? v : fallback);
export const asTransition = (v: unknown) => inSet(TRANSITIONS, v);

const TYPE_ALIASES: Record<string, Beat['type']> = {
  dialogue: 'say', line: 'say', speak: 'say', talk: 'say', narration: 'narrate', voiceover: 'narrate', future_ted: 'narrate',
  walk: 'move', goto: 'move', gesture: 'act', action: 'act', laugh_track: 'laugh', wait: 'pause', leave: 'exit', arrive: 'enter',
  flashback: 'cutaway', fantasy: 'cutaway', imagine: 'cutaway', imagined: 'cutaway', daydream: 'cutaway', cut_away: 'cutaway',
};

const DELIVERY_ALIASES: Record<string, Delivery> = {
  whispered: 'whisper', whispering: 'whisper', quiet: 'whisper', quietly: 'whisper', hushed: 'whisper',
  shouted: 'shout', shouting: 'shout', yell: 'shout', yelled: 'shout', yelling: 'shout', scream: 'shout', screaming: 'shout', loud: 'shout',
  singing: 'sing', sung: 'sing', sings: 'sing', song: 'sing',
  dry: 'deadpan', flat: 'deadpan', monotone: 'deadpan',
  quick: 'fast', quickly: 'fast', rapid: 'fast', rambling: 'fast', slowly: 'slow', dramatic: 'slow', dramatically: 'slow',
};

const asDelivery = (v: unknown): Delivery | undefined =>
  inSet(DELIVERIES, v) ?? (typeof v === 'string' ? DELIVERY_ALIASES[v.toLowerCase().trim()] : undefined);

/** A cut-off line ends on a dash, whatever the writer ended it with. */
const cutOff = (line: string) => line.trim().replace(/[\s.!?,;:…\-–—]+$/, '') + '—';

const MAX_BEATS = 70;
const MAX_CUTAWAY_BEATS = 24;

function normalizeCast(raw: unknown, casting?: Casting): CastPlacement[] {
  const cast: CastPlacement[] = [];
  const seen = new Set<string>();
  for (const c of Array.isArray(raw) ? raw : []) {
    const ch = asChar((c as Record<string, unknown>)?.character, casting);
    if (!ch || isKid(ch) || seen.has(ch)) continue;
    seen.add(ch);
    const outfit = inSet(OUTFITS, (c as Record<string, unknown>).outfit);
    cast.push({ character: ch, mark: String((c as Record<string, unknown>).mark ?? ''), ...(outfit && { outfit }) });
  }
  return cast;
}

export function normalizeScene(raw: Record<string, unknown>, location: LocationId, time: TimeOfDay, summary?: string, casting?: Casting): Scene {
  const cast = normalizeCast(raw.cast, casting);
  const beats = normalizeBeats(raw.beats, { casting, time, budget: { left: MAX_BEATS }, nested: false });
  return { location, time, summary, transition: asTransition(raw.transition), cast, beats };
}

interface BeatContext {
  casting?: Casting;
  time: TimeOfDay;
  /** Shared across a scene and its cutaways. */
  budget: { left: number };
  nested: boolean;
}

function normalizeBeats(raw: unknown, ctx: BeatContext): Beat[] {
  const beats: Beat[] = [];
  for (const r of Array.isArray(raw) ? raw : []) {
    if (ctx.budget.left <= 0) break;
    const b = normalizeBeat(r as Record<string, unknown>, ctx);
    if (!b) continue;
    // a cutaway inside a cutaway (or one we can't stage) just plays inline
    for (const x of Array.isArray(b) ? b : [b]) {
      if (ctx.budget.left <= 0) break;
      beats.push(x);
      ctx.budget.left -= x.type === 'cutaway' ? 1 + x.beats.length : 1;
    }
  }
  return beats;
}

function normalizeCutaway(r: Record<string, unknown>, ctx: BeatContext): Beat | Beat[] | null {
  const inner = normalizeBeats(r.beats, { ...ctx, budget: { left: Math.min(MAX_CUTAWAY_BEATS, ctx.budget.left - 1) }, nested: true });
  const location = asLocation(r.location ?? r.set);
  if (ctx.nested || location === 'future') return inner;
  if (!inner.length) return null;
  const style = inSet<CutawayStyle>(CUTAWAY_STYLES, r.style) ?? (/flash|memor|past|earlier|ago/i.test(`${r.style ?? ''} ${r.type ?? ''} ${r.label ?? ''}`) ? 'flashback' : 'imagined');
  const label = typeof r.label === 'string' ? r.label.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  return {
    type: 'cutaway', style, ...(label ? { label } : {}),
    location: location as SceneLocationId, time: asTime(r.time, ctx.time),
    cast: normalizeCast(r.cast, ctx.casting), beats: inner,
  };
}

function normalizeBeat(r: Record<string, unknown>, ctx: BeatContext): Beat | Beat[] | null {
  if (!r || typeof r !== 'object') return null;
  const rawType = String(r.type ?? '').toLowerCase().trim();
  const type = (inSet(['say', 'narrate', 'move', 'enter', 'exit', 'act', 'laugh', 'pause', 'cutaway'] as const, rawType) ?? TYPE_ALIASES[rawType]) as Beat['type'] | undefined;
  if (type === 'cutaway') return normalizeCutaway(r, ctx);
  const who = r.character ?? r.speaker ?? r.who;
  const character = asChar(who, ctx.casting);
  // an uncast guest slot is nobody: drop the beat rather than hand the line to Future Ted
  if (!character && isGuest(asChar(who))) return null;
  let line = typeof (r.line ?? r.text ?? r.dialogue) === 'string' ? String(r.line ?? r.text ?? r.dialogue) : '';
  const emotion = inSet<Emotion>(EMOTIONS, r.emotion);
  const gesture = inSet<Gesture>(GESTURES, r.gesture);
  const laugh = inSet<LaughKind>(LAUGHS, r.laugh);
  const toRaw = typeof r.to === 'string' ? r.to : typeof r.target === 'string' ? r.target : typeof r.mark === 'string' ? r.mark : undefined;
  const to = toRaw ? asChar(toRaw, ctx.casting) ?? toRaw.toLowerCase().trim().replace(/\s+/g, '_') : undefined;

  switch (type) {
    case 'say': {
      if (!character) return line ? { type: 'narrate', line, laugh } : null;
      if (!line.trim()) return null;
      const delivery = asDelivery(r.delivery);
      const interrupted = r.interrupted === true || r.interrupted === 'true' || r.cut_off === true;
      if (interrupted) line = cutOff(line);
      return {
        type: 'say', character, line, emotion, to, gesture, laugh,
        ...(delivery ? { delivery } : {}), ...(interrupted ? { interrupted } : {}),
      };
    }    case 'narrate':
      return line.trim() ? { type: 'narrate', line, laugh } : null;
    // the kids never leave the couch
    case 'move':
      return character && !isKid(character) && to ? { type: 'move', character, to } : null;
    case 'enter':
      return character && !isKid(character) ? { type: 'enter', character, to } : null;
    case 'exit':
      return character && !isKid(character) ? { type: 'exit', character } : null;
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

const HAIR_ALIASES: Record<string, (typeof GUEST_HAIR)[number]> = {
  brunette: 'dark_brown', blond: 'blonde', ginger: 'red', silver: 'gray', grey: 'gray', platinum: 'white', light_brown: 'brown', dark: 'black',
};
const SKIN_ALIASES: Record<string, (typeof GUEST_SKIN)[number]> = {
  pale: 'fair', white: 'light', medium: 'olive', tanned: 'tan', black: 'dark', deep: 'dark', light_brown: 'tan', dark_brown: 'brown',
};
const TOP_ALIASES: Record<string, (typeof GUEST_TOPS)[number]> = {
  jacket: 'blazer', sport_coat: 'blazer', tuxedo: 'suit', button_down: 'shirt', blouse: 'shirt', t_shirt: 'tee', tshirt: 'tee',
  jumper: 'sweater', turtleneck: 'sweater', leather_jacket: 'leather', gown: 'dress', sweatshirt: 'hoodie', plaid: 'flannel',
};
const HAIR_STYLE_ALIASES: Record<string, (typeof GUEST_HAIR_STYLES)[number]> = {
  bald: 'buzz', crew_cut: 'buzz', bun: 'updo', pixie: 'short', wavy: 'waves', straight: 'long', slicked: 'slick', slicked_back: 'slick',
  mop: 'shaggy', afro: 'curly', curls: 'curly', balding: 'receding',
};

const pickFrom = <T extends string>(set: readonly T[], aliases: Record<string, T>, v: unknown, fallback: T): T => {
  const key = typeof v === 'string' ? v.toLowerCase().trim().replace(/[\s-]+/g, '_') : '';
  return inSet(set, key) ?? aliases[key] ?? fallback;
};

/** A palette name or #rrggbb, else undefined. */
const asColor = (v: unknown) => {
  if (typeof v !== 'string') return undefined;
  const s = v.toLowerCase().trim().replace(/[\s-]+/g, '_');
  return inSet(GUEST_COLORS, s) ?? (s === 'grey' ? 'gray' : /^#[0-9a-f]{6}$/.test(s) ? s : undefined);
};

/** The planner's guest stars, in slot order (guest1, guest2, guest3). */
export function normalizeGuests(raw: unknown): GuestStar[] {
  const out: GuestStar[] = [];
  const taken = new Set<string>();
  for (const r of (Array.isArray(raw) ? raw : []) as Record<string, unknown>[]) {
    if (out.length >= GUEST_IDS.length || !r || typeof r !== 'object') break;
    const name = typeof r.name === 'string' ? r.name.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    if (!name || taken.has(name.toLowerCase())) continue;
    taken.add(name.toLowerCase());
    const female = /^(f|woman|girl|she)/i.test(String(r.gender ?? ''));
    const id = GUEST_IDS[out.length];
    const pitch = String((r.voice as Record<string, unknown>)?.pitch ?? r.voice_pitch ?? '');
    const pace = String((r.voice as Record<string, unknown>)?.pace ?? r.voice_pace ?? '');
    const extras = (Array.isArray(r.extras) ? r.extras : Array.isArray(r.accessories) ? r.accessories : [])
      .map((e: unknown) => inSet(GUEST_EXTRAS, e)).filter((e): e is (typeof GUEST_EXTRAS)[number] => !!e);
    const topStyle = pickFrom(GUEST_TOPS, TOP_ALIASES, r.top_style ?? r.topStyle ?? r.outfit, female ? 'sweater' : 'blazer');
    const g: GuestStar = {
      id, name,
      role: typeof r.role === 'string' ? r.role.trim().slice(0, 160) : '',
      gender: female ? 'female' : 'male',
      height: inSet(['short', 'average', 'tall'] as const, r.height) ?? 'average',
      build: inSet(['slim', 'average', 'broad'] as const, r.build) ?? 'average',
      skin: pickFrom(GUEST_SKIN, SKIN_ALIASES, r.skin, 'light'),
      hair: pickFrom(GUEST_HAIR, HAIR_ALIASES, r.hair ?? r.hair_color, 'brown'),
      hairStyle: pickFrom(GUEST_HAIR_STYLES, HAIR_STYLE_ALIASES, r.hair_style ?? r.hairStyle, female ? 'long' : 'short'),
      top: asColor(r.top ?? r.top_color) ?? 'navy',
      topStyle,
      pants: asColor(r.pants ?? r.pants_color) ?? (topStyle === 'suit' ? asColor(r.top ?? r.top_color) ?? 'charcoal' : 'denim'),
      extras: [...new Set(extras)],
      voice: {
        pitch: inSet(['low', 'medium', 'high'] as const, pitch) ?? 'medium',
        pace: inSet(['slow', 'normal', 'fast'] as const, pace) ?? 'normal',
      },
    };
    for (const k of ['under', 'tie', 'vest'] as const) {
      const c = asColor(r[k]);
      if (c) g[k] = c;
    }
    out.push(g);
  }
  return out;
}
