import type { Costume, GuestId, GuestStar } from '../script/types';
import type { CharacterDef, Look } from './characters';

// One-off guest stars: the writer describes someone in plain words, and we turn that into a procedural look and voice.

const SKIN: Record<GuestStar['skin'], string> = {
  fair: '#f6d3bb', light: '#efc1a0', olive: '#d6a47c', tan: '#c08a62', brown: '#8e5a3c', dark: '#5a3624',
};

const HAIR: Record<GuestStar['hair'], string> = {
  black: '#141010', dark_brown: '#2e1d14', brown: '#5a3a24', auburn: '#7a3420', red: '#a8482a', blonde: '#d8b46a', gray: '#8e8a86', white: '#e6e2dc',
};

export const GUEST_PALETTE: Record<string, string> = {
  black: '#18181c', charcoal: '#3a3c42', gray: '#7a7d82', white: '#f2f0ea', cream: '#e8dcc4', navy: '#1f2a48', blue: '#3a62b0',
  sky: '#86b4e0', teal: '#2a8088', green: '#3a7a44', olive: '#6a6a34', red: '#b8302e', burgundy: '#6a1e2c', pink: '#e48aa8',
  purple: '#5e3a86', lavender: '#b4a2d8', yellow: '#e8c840', mustard: '#c4962a', orange: '#d8702a', brown: '#5a3a24',
  tan: '#b8956a', denim: '#3a4c70',
};

/** Caption colors for the three slots, distinct from the regular cast. */
const CAPTION = { guest1: '#f2c76e', guest2: '#9ee0d0', guest3: '#d2a6ff' } satisfies Record<GuestId, string>;

/** A palette name or #rrggbb; anything else falls back. */
export function guestColor(c: string | undefined, fallback: string) {
  if (!c) return fallback;
  const s = c.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (GUEST_PALETTE[s]) return GUEST_PALETTE[s];
  return /^#[0-9a-f]{6}$/.test(s) ? s : fallback;
}

// Stable per-name variation, so the same guest looks the same on every rerun.
function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export function guestLook(g: GuestStar): Look {
  const female = g.gender === 'female';
  const v = hash(g.name);
  const height = (female ? 1.65 : 1.78) + { short: -0.1, average: 0, tall: 0.1 }[g.height] + (v - 0.5) * 0.04;
  const build = { slim: 0.9, average: 1, broad: 1.16 }[g.build];
  const skin = SKIN[g.skin];
  const top = guestColor(g.top, '#5a6b7a');
  const pants = guestColor(g.pants, '#2a2a30');
  const look: Look = {
    height, build, female, skin,
    hair: HAIR[g.hair], hairStyle: g.hairStyle,
    top, topStyle: g.topStyle,
    pants, shoes: '#1e1a18',
    eyes: ['#3a2a1e', '#4a5a6a', '#4a5a3a'][Math.floor(v * 3)],
    face: { jaw: female ? 0.9 + v * 0.08 : 0.98 + v * 0.12, long: 0.96 + v * 0.1, nose: female ? 0.86 + v * 0.1 : 0.95 + v * 0.2 },
    extras: [...g.extras],
  };
  if (g.under) look.under = guestColor(g.under, '#f2f0ea');
  else if (['suit', 'blazer', 'cardigan', 'leather', 'hoodie'].includes(g.topStyle)) look.under = '#f2f0ea';
  if (g.tie) look.tie = guestColor(g.tie, '#8a2a30');
  if (g.vest) look.vest = guestColor(g.vest, top);
  if (g.topStyle === 'suit') look.pants = g.pants ? pants : top;
  if (g.topStyle === 'flannel') look.plaid = [shade(top, 0.45), '#d8cfb8'];
  if (g.topStyle === 'dress') {
    look.skirt = top;
    look.pants = look.legs = skin;
  }
  if (g.pants === 'denim') look.jeans = true;
  if (g.extras.includes('apron')) look.apron = { bib: true };
  return look;
}

const JACKETS = ['suit', 'blazer', 'cardigan', 'leather', 'hoodie'];

/**
 * Someone's usual look with a costume over it, in the guest-star vocabulary. A new kind of top drops the details
 * that belonged to the old one (Ted's checks, Marshall's plaid, Barney's tailoring); anything not mentioned stays.
 */
export function costumeLook(base: Look, c: Omit<Costume, 'character'>): Look {
  const look: Look = { ...base, extras: [...(base.extras ?? [])] };
  if (c.topStyle && c.topStyle !== base.topStyle) {
    for (const k of ['plaid', 'underPlaid', 'underStripes', 'underPrint', 'jacketCut', 'pendant', 'suitFit', 'tweed', 'neckline', 'collar', 'vest', 'tie', 'tiePattern', 'tieAccent'] as const) delete look[k];
    look.topStyle = c.topStyle;
    if (JACKETS.includes(c.topStyle)) look.under ??= '#f2f0ea';
    if (base.topStyle === 'dress') {
      delete look.skirt;
      delete look.legs;
      look.pants = '#2a2a30';
    }
  }
  if (c.top) look.top = guestColor(c.top, look.top);
  if (look.topStyle === 'flannel' && (c.top || !look.plaid)) look.plaid = [shade(look.top, 0.45), '#d8cfb8'];
  if (c.under) {
    look.under = guestColor(c.under, '#f2f0ea');
    delete look.underPlaid;
    delete look.underStripes;
    delete look.underPrint;
    if (base.underPrint && base.skirt === base.under && !c.pants) {
      look.skirt = look.under;
      delete look.skirtPrint;
    }
  }
  if (c.tie) {
    look.tie = guestColor(c.tie, '#8a2a30');
    delete look.tiePattern;
    delete look.tieAccent;
  }
  if (c.vest) look.vest = guestColor(c.vest, look.top);
  if (look.topStyle === 'dress') {
    delete look.skirtPrint;
    look.skirt = look.top;
    look.pants = look.legs = look.skin;
    look.jeans = false;
  } else if (c.pants || (c.topStyle === 'suit' && base.topStyle !== 'suit')) {
    // a suit comes with its trousers; new trousers replace a skirt
    look.pants = c.pants ? guestColor(c.pants, look.pants) : look.top;
    look.jeans = c.pants === 'denim';
    delete look.skirt;
    delete look.skirtPrint;
    delete look.legs;
  }
  if (c.shoes) look.shoes = guestColor(c.shoes, look.shoes);
  if (c.boots !== undefined) look.boots = c.boots;
  if (c.hairStyle) look.hairStyle = c.hairStyle;
  for (const e of c.extras ?? []) if (!look.extras!.includes(e)) look.extras!.push(e);
  if (c.extras?.includes('apron')) look.apron ??= { bib: true };
  return look;
}

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (k: number) => Math.round(((n >> k) & 255) * f).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}

export function guestDef(g: GuestStar): CharacterDef {
  const female = g.gender === 'female';
  return {
    id: g.id,
    name: g.name,
    color: CAPTION[g.id],
    main: false,
    look: guestLook(g),
    voice: {
      gender: g.gender,
      pitch: (female ? 1.06 : 1.0) + { low: -0.1, medium: 0, high: 0.1 }[g.voice.pitch],
      rate: { slow: 0.92, normal: 1.04, fast: 1.16 }[g.voice.pace],
    },
  };
}

/** What an unused slot looks like until an episode casts it. */
export function placeholderGuest(id: GuestId): GuestStar {
  return {
    id, name: 'Guest', role: '', gender: 'male', height: 'average', build: 'average', skin: 'light', hair: 'brown', hairStyle: 'short',
    top: 'navy', topStyle: 'blazer', pants: 'charcoal', extras: [], voice: { pitch: 'medium', pace: 'normal' },
  };
}
