import {
  CHARACTER_IDS, CHART_STYLES, CUTAWAY_LOOKS, CUTAWAY_STYLES, CUTAWAY_TRANSITIONS, DELIVERIES, EMOTIONS, GESTURES, GUEST_COLORS, GUEST_EXTRAS,
  GUEST_HAIR, GUEST_HAIR_STYLES, GUEST_IDS, GUEST_SKIN, GUEST_TOPS, INSERT_KINDS, LEGACY_INSERT_KINDS, LAUGHS, MONTAGE_MUSIC, OFFSCREEN, OUTFITS, PROPS, SCENE_LOCATION_IDS,
  KID_TAKES, SCORES, SHOTS, SOUND_CUES, TRANSITIONS, isCharacterId, isGuest, isKid, kidTake,
} from './types';
import { replayBeats } from './strands';
import type { Beat, EpisodeScript } from './types';
import { musicCoverage, musicSummary } from './music';
import type { StageSet } from '../world/sets/common';

// Episode files are written by hand (or by an agent) and must be performable exactly as written:
// errors are anything the player can't stage faithfully, warnings are craft notes from the show bible.

export interface Issue {
  path: string;
  message: string;
}

export interface Report {
  errors: Issue[];
  warnings: Issue[];
}

type Sets = Record<string, Pick<StageSet, 'marks' | 'door' | 'seated' | 'entrances' | 'name'>>;
type Obj = Record<string, unknown>;

const MAX_SCENE_BEATS = 70;
const MAX_CUTAWAY_BEATS = 24;
const MAX_WORDS = 35;
const LONG_WORDS = 25;
/** How deep cutaways and replays can nest: a memory inside a story inside a memory. */
const MAX_DEPTH = 3;
/** Practical runtime limits, not a house style: around twelve minutes of show, and room to cut back and forth. */
const LONG_EPISODE_BEATS = 300;
const MAX_SCENES = 40;

const MAX_MONTAGE_SHOTS = 6;
const PRESENTATION = ['label', 'look', 'transition', 'sound'];
/** What a split screen can do: talk, gesture, hold things up. Nobody walks between the panels. */
const SPLIT_BEATS = ['say', 'narrate', 'act', 'hold', 'laugh', 'pause', 'sound', 'score', 'insert'];
const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

const BEAT_KEYS: Record<string, string[]> = {
  say: ['character', 'line', 'to', 'emotion', 'gesture', 'laugh', 'delivery', 'accompanied', 'offscreen', 'interrupted', 'chorus', 'react', 'shot'],
  narrate: ['line', 'laugh', 'over'],
  move: ['character', 'to'],
  enter: ['character', 'to'],
  exit: ['character'],
  act: ['character', 'gesture', 'to', 'emotion', 'shot'],
  hold: ['character', 'prop', 'shot'],
  give: ['character', 'to', 'prop', 'shot'],
  laugh: ['laugh'],
  pause: ['seconds'],
  sound: ['sound'],
  score: ['music'],
  freeze: ['line', 'character', 'gesture', 'to', 'emotion', 'laugh', 'shot', 'sound'],
  insert: ['kind', 'title', 'lines', 'messages', 'items', 'chart', 'character', 'line', 'laugh', 'react', 'sound'],
  cutaway: ['id', 'style', ...PRESENTATION, 'location', 'time', 'wardrobe', 'cast', 'beats'],
  montage: ['label', 'music', 'shots'],
  replay: ['of', 'style', 'from', 'to', ...PRESENTATION, 'add', 'changes', 'wardrobe'],
  split: ['label', 'sound', 'panels', 'beats'],
};

/** Where an insert has room for what it shows. */
const INSERT_NEEDS: Record<string, string> = {
  text: '"messages" [{ "from", "text" }]', chart: '"items" [{ "label", "value" }]',
  slides: 'a "title" or "lines"', sign: 'a "title" or "lines"', playbook: 'a "title" or "lines"',
};
const COSTUME_KEYS = ['character', 'keep', 'topStyle', 'top', 'under', 'tie', 'vest', 'pants', 'shoes', 'boots', 'hairStyle', 'extras'];

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (values: readonly string[]) => values.join(', ');
const words = (line: string) => line.trim().split(/\s+/).filter(Boolean).length;

export function validateEpisode(ep: unknown, sets: Sets): Report {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  // Staging a replay first walks through what happened before it, which was checked where it was written.
  let muted = 0;
  const err = (path: string, message: string) => { if (!muted) errors.push({ path, message }); };
  const warn = (path: string, message: string) => { if (!muted) warnings.push({ path, message }); };

  if (!isObj(ep)) return { errors: [{ path: '', message: 'an episode is a JSON object' }], warnings };

  const keys = (o: Obj, path: string, allowed: string[]) => {
    for (const k of Object.keys(o)) if (!allowed.includes(k)) err(path, `unknown field "${k}" (allowed: ${list(allowed)})`);
  };
  const text = (o: Obj, key: string, path: string) => {
    const v = o[key];
    if (typeof v !== 'string' || !v.trim()) err(path, `"${key}" must be a non-empty string`);
    return typeof v === 'string' ? v : '';
  };
  const oneOf = (o: Obj, key: string, values: readonly string[], path: string, required = false) => {
    const v = o[key];
    if (v === undefined) {
      if (required) err(path, `"${key}" is required (one of: ${list(values)})`);
      return undefined;
    }
    if (typeof v !== 'string' || !values.includes(v)) err(path, `"${key}": ${JSON.stringify(v)} is not one of: ${list(values)}`);
    return typeof v === 'string' && values.includes(v) ? v : undefined;
  };

  /** A guest-star color name or #rrggbb, if it's there at all. */
  const color = (o: Obj, k: string, path: string) => {
    const v = o[k];
    if (v !== undefined && !(typeof v === 'string' && ((GUEST_COLORS as readonly string[]).includes(v) || /^#[0-9a-f]{6}$/.test(v)))) {
      err(path, `"${k}": ${JSON.stringify(v)} must be #rrggbb or one of: ${list(GUEST_COLORS)}`);
    }
  };
  const extras = (values: unknown[], path: string) => {
    for (const x of values) if (!(GUEST_EXTRAS as readonly string[]).includes(x as string)) err(path, `extra ${JSON.stringify(x)} is not one of: ${list(GUEST_EXTRAS)}`);
  };
  /** An on-screen card: a scene's, a cutaway's or a split screen's. */
  const card = (o: Obj, path: string) => {
    if (o.label !== undefined && (typeof o.label !== 'string' || !o.label.trim() || o.label.length > 60)) err(path, '"label" is a short on-screen card (60 characters max)');
  };

  keys(ep, '', ['code', 'title', 'logline', 'coldOpen', 'couch', 'guests', 'wardrobe', 'continuity', 'scenes']);
  const code = text(ep, 'code', 'code');
  if (code && !/^S\d{2}E\d{2}$/.test(code)) err('code', `"${code}" should look like "S11E03"`);
  text(ep, 'title', 'title');
  text(ep, 'logline', 'logline');
  if (ep.coldOpen !== undefined) text(ep, 'coldOpen', 'coldOpen');

  // ---- guest stars
  const guests = new Map<string, string>();
  if (ep.guests !== undefined) {
    if (!Array.isArray(ep.guests)) err('guests', 'must be an array');
    else {
      if (ep.guests.length > GUEST_IDS.length) err('guests', `at most ${GUEST_IDS.length} guest stars`);
      ep.guests.forEach((g, i) => {
        const path = `guests[${i}]`;
        if (!isObj(g)) return err(path, 'must be an object');
        keys(g, path, ['id', 'name', 'role', 'gender', 'height', 'build', 'skin', 'hair', 'hairStyle', 'top', 'topStyle', 'under', 'tie', 'vest', 'pants', 'extras', 'voice']);
        if (g.id !== GUEST_IDS[i]) err(path, `guest ${i + 1} must have "id": "${GUEST_IDS[i]}" (slots fill in order)`);
        const name = text(g, 'name', path);
        if ([...guests.values()].some((n) => n.toLowerCase() === name.toLowerCase())) err(path, `two guests are called "${name}"`);
        if (typeof g.id === 'string') guests.set(g.id, name);
        text(g, 'role', path);
        oneOf(g, 'gender', ['female', 'male'], path, true);
        oneOf(g, 'height', ['short', 'average', 'tall'], path, true);
        oneOf(g, 'build', ['slim', 'average', 'broad'], path, true);
        oneOf(g, 'skin', GUEST_SKIN, path, true);
        oneOf(g, 'hair', GUEST_HAIR, path, true);
        oneOf(g, 'hairStyle', GUEST_HAIR_STYLES, path, true);
        oneOf(g, 'topStyle', GUEST_TOPS, path, true);
        for (const k of ['top', 'pants', 'under', 'tie', 'vest']) {
          if (g[k] === undefined && (k === 'top' || k === 'pants')) err(path, `"${k}" color is required`);
          else color(g, k, path);
        }
        if (!Array.isArray(g.extras)) err(path, '"extras" must be an array (can be empty)');
        else extras(g.extras, path);
        if (!isObj(g.voice)) err(path, '"voice" must be { "pitch": low|medium|high, "pace": slow|normal|fast }');
        else {
          keys(g.voice, `${path}.voice`, ['pitch', 'pace']);
          oneOf(g.voice, 'pitch', ['low', 'medium', 'high'], `${path}.voice`, true);
          oneOf(g.voice, 'pace', ['slow', 'normal', 'fast'], `${path}.voice`, true);
        }
      });
    }
  }

  /** Costumes for the regular cast: only what's mentioned changes. `keep` only means something on a scene's. */
  const wardrobe = (raw: unknown, path: string, keeps = false) => {
    if (raw === undefined) return;
    if (!Array.isArray(raw)) return err(path, 'must be an array of costumes');
    const seen = new Set<unknown>();
    raw.forEach((c, i) => {
      const p = `${path}[${i}]`;
      if (!isObj(c)) return err(p, 'a costume is { "character", ...what changes }');
      keys(c, p, COSTUME_KEYS);
      const who = c.character;
      if (!isCharacterId(who) || isGuest(who) || isKid(who)) {
        err(p, `costumes are for the regular cast, not ${JSON.stringify(who)} (guest stars are described in "guests"; the kids don't change)`);
      }
      if (seen.has(who)) err(p, `${String(who)} has two costumes here: merge them`);
      seen.add(who);
      oneOf(c, 'topStyle', GUEST_TOPS, p);
      oneOf(c, 'hairStyle', GUEST_HAIR_STYLES, p);
      for (const k of ['top', 'under', 'tie', 'vest', 'pants', 'shoes']) color(c, k, p);
      if (c.boots !== undefined && typeof c.boots !== 'boolean') err(p, '"boots" is true or false');
      if (c.keep !== undefined && c.keep !== true) err(p, '"keep" is either true or left out');
      else if (c.keep && !keeps) err(p, '"keep" is for a scene\'s costume that stays on for the rest of the episode');
      if (c.extras !== undefined) {
        if (!Array.isArray(c.extras)) err(p, '"extras" must be an array');
        else extras(c.extras, p);
      }
      // (a kept costume with nothing in it takes the kept one off)
      if (Object.keys(c).filter((k) => k !== 'keep').length < 2 && !c.keep) warn(p, 'a costume that changes nothing');
    });
  };
  wardrobe(ep.wardrobe, 'wardrobe');
  continuity(ep.continuity, err, warn);

  const character = (v: unknown, path: string, what = 'character') => {
    if (!isCharacterId(v)) {
      err(path, `${what} ${JSON.stringify(v)} is not a character id (${list(CHARACTER_IDS.filter((c) => !isGuest(c)))}, or a cast guest slot)`);
      return undefined;
    }
    if (isGuest(v) && !guests.has(v)) {
      err(path, `${v} isn't cast: add them to "guests" first`);
      return undefined;
    }
    return v;
  };

  // ---- the stage, beat by beat: who is where, so every line, move and entrance can actually be performed
  const speakers = new Set<string>();
  /** Devices used, for the episode's craft notes. */
  let count = { kids: 0, montages: 0, inserts: 0, freezes: 0, beats: 0 };

  interface Stage {
    location: string;
    set: Sets[string];
    /** On stage, and the mark they're on (null: next to someone, off any mark). */
    at: Map<string, string | null>;
    /** A scene, not a cutaway. */
    real: boolean;
    /** What people are holding. */
    held: Map<string, string>;
    /** A split screen: several sets at once, and nobody walks anywhere. */
    split?: boolean;
  }
  const clone = (st: Stage): Stage => ({ ...st, at: new Map(st.at), held: new Map(st.held) });

  /** A scene or cutaway with an id: what a replay shows again and, for a scene, where a resume picks up. */
  interface Strand { location: string; time: unknown; cast: unknown; before: unknown[]; beats: unknown[]; end?: Stage }
  /** What each id names, for replays. */
  const segments = new Map<string, Strand>();
  /** How each scene's strand stood when we last left it, for the next scene that resumes it. */
  const latest = new Map<string, Strand>();
  const ids = new Set<string>();
  /** Inside a replay: the original's own ids and cutaways were registered where they were written. */
  let replaying = 0;
  const named = (v: unknown, p: string) => {
    if (v === undefined || replaying) return;
    if (typeof v !== 'string' || !SLUG.test(v)) return err(p, '"id" is a short slug like "the-toast" or "bar_fight"');
    if (ids.has(v)) err(p, `two scenes or cutaways are called "${v}"`);
    ids.add(v);
  };

  const compartment = (st: Stage, mark: string) => st.set.entrances?.[mark] ?? st.set.door;

  /** One cast entry onto the stage (a scene's, a cutaway's, or someone a replay reveals). */
  const castOne = (st: Stage, c: unknown, p: string) => {
    const { set, location } = st;
    if (!isObj(c)) return err(p, 'must be { "character", "mark" }');
    keys(c, p, ['character', 'mark', 'outfit']);
    const who = character(c.character, p);
    if (who && isKid(who)) return err(p, `${who} is only ever on the 2030 couch: never cast them in a scene`);
    oneOf(c, 'outfit', OUTFITS, p);
    const mark = typeof c.mark === 'string' ? c.mark : '';
    if (!set.marks[mark]) err(p, `mark ${JSON.stringify(c.mark)} doesn't exist at ${location} (marks: ${list(Object.keys(set.marks))})`);
    else if (who) {
      const taken = [...st.at].find(([, m]) => m === mark);
      if (taken) err(p, `${who} and ${taken[0]} are both on "${mark}"`);
      if (mark === set.door || compartment(st, mark) === mark) warn(p, `"${mark}" is a doorway: start them somewhere else, or have them enter`);
    }
    if (who) {
      if (st.at.has(who)) err(p, `${who} is ${st.at.size ? 'already there' : 'cast twice'}`);
      st.at.set(who, set.marks[mark] ? mark : null);
    }
  };

  const castOn = (raw: unknown, location: string, path: string, real: boolean): Stage | null => {
    const set = sets[location];
    if (!set) return null;
    const st: Stage = { location, set, at: new Map(), real, held: new Map() };
    if (!Array.isArray(raw)) {
      err(path, '"cast" must be an array of { "character", "mark" }');
      return st;
    }
    raw.forEach((c, i) => castOne(st, c, `${path}[${i}]`));
    bothRobins(st, path);
    return st;
  };

  /** Robin Sparkles is Robin's teen-pop past: she can share a cutaway with Robin, never a real scene. */
  const bothRobins = (st: Stage | null, path: string) => {
    if (st?.real && st.at.has('robin') && st.at.has('robin_sparkles')) err(path, 'robin and robin_sparkles are the same person: only a cutaway can put them side by side');
  };

  /** A mark or a character on stage someone can walk (or slide) to. */
  const destination = (st: Stage, who: string, to: unknown, path: string) => {
    if (to === undefined) return;
    if (typeof to !== 'string') return err(path, '"to" must be a mark or a character id');
    if (st.set.marks[to]) {
      const there = [...st.at].find(([c, m]) => m === to && c !== who);
      if (there) err(path, `"${to}" is taken by ${there[0]}`);
      const from = st.at.get(who);
      if (st.set.seated && from && compartment(st, from) !== compartment(st, to)) {
        err(path, `${who} can't slide from "${from}" to "${to}": they're in different compartments (exit and enter instead)`);
      }
      st.at.set(who, to);
      return;
    }
    if (isCharacterId(to)) {
      if (!st.at.has(to)) err(path, `${to} isn't on stage to walk over to`);
      st.at.set(who, null);
      return;
    }
    err(path, `"to": "${to}" is neither a mark at ${st.location} (${list(Object.keys(st.set.marks))}) nor a character on stage`);
  };

  /** A card, a look, an edit and a sound: each optional, each chosen on its own. */
  const presentation = (b: Obj, p: string) => {
    card(b, p);
    oneOf(b, 'look', CUTAWAY_LOOKS, p);
    oneOf(b, 'transition', CUTAWAY_TRANSITIONS, p);
    oneOf(b, 'sound', SOUND_CUES, p);
  };

  /**
   * `depth` counts the cutaways and replays we're inside; `inside` is a montage shot or split screen, which hold
   * simpler beats. `paths` names each beat when they aren't simply `path[i]` (a replay's mix of old and new).
   */
  const beats = (raw: unknown, st: Stage | null, path: string, depth: number, budget: { left: number }, paths?: string[], inside?: 'montage' | 'split') => {
    if (!Array.isArray(raw)) return err(path, '"beats" must be an array');
    raw.forEach((b, i) => {
      const p = paths?.[i] ?? `${path}[${i}]`;
      budget.left--;
      if (!muted) count.beats++;
      if (!isObj(b)) return err(p, 'a beat is an object with a "type"');
      const type = typeof b.type === 'string' ? b.type : '';
      if (!BEAT_KEYS[type]) return err(p, `"type": ${JSON.stringify(b.type)} is not one of: ${list(Object.keys(BEAT_KEYS))}`);
      keys(b, `${p} (${type})`, ['type', ...BEAT_KEYS[type]]);
      if (st?.split && !SPLIT_BEATS.includes(type)) return err(p, `a split screen holds ${list(SPLIT_BEATS)} beats: nobody walks between the panels`);
      oneOf(b, 'emotion', EMOTIONS, p);
      oneOf(b, 'gesture', GESTURES, p, type === 'act');
      if (b.laugh === 'woo') err(p, '"laugh": "woo" is gone: the studio audience laughs, it doesn\'t cheer (use "laugh", or "applause" for a crowd inside the story)');
      else oneOf(b, 'laugh', LAUGHS, p, type === 'laugh');
      oneOf(b, 'delivery', DELIVERIES, p);
      oneOf(b, 'shot', SHOTS, p);
      if (type === 'sound') oneOf(b, 'sound', SOUND_CUES, p, true);
      else if (type === 'insert') oneOf(b, 'sound', [...SOUND_CUES, 'none'], p);
      else if (type === 'freeze') oneOf(b, 'sound', SOUND_CUES, p);
      if (type === 'score') oneOf(b, 'music', SCORES, p, true);
      if (b.accompanied !== undefined && (b.accompanied !== true || b.delivery !== 'sing')) err(p, '"accompanied": true puts a guitar under a sung line ("delivery": "sing")');

      if (type === 'say' || type === 'narrate' || type === 'freeze' || (type === 'insert' && b.line !== undefined)) {
        const line = text(b, 'line', p);
        if (/[()*[\]{}<>]/.test(line)) err(p, 'no stage directions in lines: use beats, gestures, emotion and delivery instead');
        const n = words(line);
        if (n > MAX_WORDS) err(p, `${n} words: lines must be ${MAX_WORDS} words or fewer (split it, or cut it)`);
        else if (n > LONG_WORDS) warn(p, `${n}-word line: most lines should be under 18`);
        if (b.interrupted !== undefined) {
          if (b.interrupted !== true) err(p, '"interrupted" is either true or left out');
          else {
            if (!line.trim().endsWith('—')) err(p, 'an interrupted line ends with an em dash "—" right where it gets cut off');
            const next = raw[i + 1];
            if (!isObj(next) || (next.type !== 'say' && next.type !== 'narrate')) err(p, 'an interrupted line must be followed straight away by the line that cuts it off');
            else if (next.character === b.character) err(p, `${String(b.character)} can't interrupt themselves`);
          }
        }
      }
      if (type === 'narrate' && b.over !== undefined) {
        if (b.over !== true) err(p, '"over" is either true or left out');
        else if (b.laugh !== undefined) err(p, 'a voice-over under the action can\'t carry a laugh: put a laugh beat after it');
      }

      const who = type in { say: 1, move: 1, enter: 1, exit: 1, act: 1, hold: 1, give: 1 } || (type === 'freeze' && b.character !== undefined)
        ? character(b.character, p) : undefined;
      const kid = !!who && isKid(who);
      if (kid) {
        if (type !== 'say' && type !== 'act') err(p, `${who} never leaves the 2030 couch: they can only say and act`);
        else recorded(b, who, p);
        if (st?.split) err(p, 'the kids can\'t interrupt a split screen');
        if (!muted) count.kids++;
      }
      if (type === 'say' && who) speakers.add(who);
      const offscreen = type === 'say' ? oneOf(b, 'offscreen', OFFSCREEN, p) : undefined;
      if (offscreen && who) {
        if (kid) err(p, 'the kids are on the couch, never offscreen');
        else if (st?.at.has(who)) err(p, `${who} is on stage: "offscreen" is for a voice we hear but don't see`);
        for (const k of ['chorus', 'gesture', 'shot']) if (b[k] !== undefined) err(p, `"${k}" needs them on screen: not with "offscreen"`);
      }
      if ((type === 'say' || type === 'act') && b.to !== undefined) {
        const to = character(b.to, p, '"to"');
        if (to && st && !kid && !st.at.has(to) && !isKid(to)) warn(p, `${who} talks to ${to}, who isn't on stage`);
      }
      if (st?.split && type === 'act' && (b.gesture === 'sit' || b.gesture === 'stand')) err(p, 'nobody sits down or gets up in a split screen');

      if (type === 'freeze' && who && kid) err(p, 'a freeze frame is on someone in the story, not the couch');
      if (st && !kid && type === 'say' && !offscreen) {
        if (b.chorus !== undefined) {
          if (!Array.isArray(b.chorus) || !b.chorus.length) err(p, '"chorus" is a list of everyone else saying the line');
          else b.chorus.forEach((c, k) => {
            const id = character(c, `${p}.chorus[${k}]`);
            if (!id) return;
            if (id === who) err(p, `${id} is already saying the line: "chorus" is everyone else`);
            else if (isKid(id)) err(p, `${id} is on the 2030 couch and can't join a line in the story`);
            else if (!st.at.has(id)) err(p, `${id} isn't on stage to join in`);
          });
        }
      }
      if (type === 'say' || type === 'insert') reactions(b.react, st, p, type === 'say' ? who : undefined);
      if (type === 'insert') {
        if (!muted) count.inserts++;
        insert(b, p);
      }
      if (type === 'freeze' && !muted) count.freezes++;

      if (!st || !who || kid || offscreen) {
        // nothing to stage
      } else if (type === 'enter') {
        if (st.at.has(who)) err(p, `${who} is already on stage: use "move"`);
        st.at.set(who, null);
        destination(st, who, b.to, p);
        bothRobins(st, p);
      } else if (!st.at.has(who)) {
        err(p, `${who} isn't on stage here: put them in the cast or give them an "enter" beat first`);
      } else if (type === 'exit') {
        st.at.delete(who);
        st.held.delete(who);
      } else if (type === 'hold') {
        const prop = oneOf(b, 'prop', [...PROPS, 'none'], p, true);
        if (prop === 'none') {
          if (!st.held.has(who)) warn(p, `${who} isn't holding anything to put down`);
          st.held.delete(who);
        } else if (prop) st.held.set(who, prop);
      } else if (type === 'give') {
        const prop = oneOf(b, 'prop', PROPS, p) ?? st.held.get(who);
        const to = character(b.to, p, '"to"');
        if (!prop) err(p, `${who} isn't holding anything: "hold" it first, or say which "prop"`);
        if (to === who) err(p, `${who} can't hand something to themselves`);
        else if (to && (isKid(to) || !st.at.has(to))) err(p, `${to} isn't on stage to take it`);
        st.held.delete(who);
        if (to && prop) st.held.set(to, prop);
      } else if (type === 'move') {
        if (b.to === undefined) err(p, 'a move needs a "to" (a mark or a character on stage)');
        destination(st, who, b.to, p);
      }

      if (type === 'pause' && !(typeof b.seconds === 'number' && b.seconds > 0 && b.seconds <= 5)) err(p, '"seconds" must be a number between 0 and 5');

      if (type === 'cutaway') {
        if (inside) return err(p, `no cutaways inside a ${inside === 'split' ? 'split screen' : 'montage'}`);
        if (depth >= MAX_DEPTH) return err(p, `cutaways and replays nest ${MAX_DEPTH} deep at most`);
        named(b.id, p);
        oneOf(b, 'style', CUTAWAY_STYLES, p, true);
        oneOf(b, 'time', ['day', 'night'], p, true);
        presentation(b, p);
        wardrobe(b.wardrobe, `${p}.wardrobe`);
        const location = oneOf(b, 'location', SCENE_LOCATION_IDS, p, true);
        const inner = location ? castOn(b.cast, location, `${p}.cast`, false) : null;
        const n = Array.isArray(b.beats) ? b.beats.length : 0;
        if (!n) err(p, 'a cutaway needs at least one beat');
        else if (n > MAX_CUTAWAY_BEATS) err(p, `${n} beats: a cutaway has at most ${MAX_CUTAWAY_BEATS}`);
        else if (n > 10) warn(p, `${n} beats: a cutaway this long might be its own scene`);
        beats(b.beats, inner, `${p}.beats`, depth + 1, budget);
        if (typeof b.id === 'string' && location && !muted && !replaying) {
          segments.set(b.id, { location, time: b.time, cast: b.cast, before: [], beats: Array.isArray(b.beats) ? b.beats : [] });
        }
      }

      if (type === 'replay') {
        if (inside) return err(p, `no replays inside a ${inside === 'split' ? 'split screen' : 'montage'}`);
        if (depth >= MAX_DEPTH) return err(p, `cutaways and replays nest ${MAX_DEPTH} deep at most`);
        replay(b, p, depth, budget);
      }

      if (type === 'split') {
        if (inside) return err(p, `no split screens inside a ${inside === 'split' ? 'split screen' : 'montage'}`);
        split(b, p, depth, budget);
      }

      if (type === 'montage') {
        if (depth || inside) return err(p, 'no montages inside a cutaway or another montage');
        if (!muted) count.montages++;
        oneOf(b, 'music', MONTAGE_MUSIC, p, true);
        if (b.label !== undefined && (typeof b.label !== 'string' || b.label.length > 60)) err(p, '"label" is a short on-screen card (60 characters max)');
        if (!Array.isArray(b.shots)) return err(p, '"shots" must be an array of { "location", "time", "cast", "beats" }');
        if (b.shots.length < 2 || b.shots.length > MAX_MONTAGE_SHOTS) err(p, `${b.shots.length} shots: a montage has 2-${MAX_MONTAGE_SHOTS}`);
        b.shots.forEach((shot, k) => {
          const sp = `${p}.shots[${k}]`;
          if (!isObj(shot)) return err(sp, 'a shot is { "location", "time", "cast", "beats" }');
          keys(shot, sp, ['location', 'time', 'label', 'wardrobe', 'cast', 'beats']);
          oneOf(shot, 'time', ['day', 'night'], sp, true);
          if (shot.label !== undefined && (typeof shot.label !== 'string' || shot.label.length > 40)) err(sp, '"label" is a little card like "Day 3" (40 characters max)');
          wardrobe(shot.wardrobe, `${sp}.wardrobe`);
          const location = oneOf(shot, 'location', SCENE_LOCATION_IDS, sp, true);
          const inner = location ? castOn(shot.cast, location, `${sp}.cast`, false) : null;
          const n = Array.isArray(shot.beats) ? shot.beats.length : 0;
          if (n > 3) err(sp, `${n} beats: a montage shot is quick (0-2 beats)`);
          else if (n > 2) warn(sp, `${n} beats: montage shots land best with 1-2`);
          if (Array.isArray(shot.beats) && shot.beats.some((x) => isObj(x) && isKid(String(x.character)))) err(sp, 'the kids stay on the couch: no couch cutaways inside a montage');
          budget.left--;
          beats(shot.beats, inner, `${sp}.beats`, depth + 1, budget, undefined, 'montage');
        });
      }
    });
  };

  /**
   * Show a scene or cutaway again: everyone stands where they were when the replayed part starts (plus anyone
   * revealed), then the original beats play with the changes made. Errors in the original only count if a
   * change caused them.
   */
  const replay = (b: Obj, p: string, depth: number, budget: { left: number }) => {
    oneOf(b, 'style', CUTAWAY_STYLES, p);
    presentation(b, p);
    wardrobe(b.wardrobe, `${p}.wardrobe`);
    const src = typeof b.of === 'string' ? segments.get(b.of) : undefined;
    if (!src) {
      const known = [...segments.keys()];
      return err(p, `"of": ${JSON.stringify(b.of)} isn't the id of an earlier scene or cutaway${known.length ? ` (so far: ${list(known)})` : ''}`);
    }
    const original = src.beats;
    const n = original.length;
    const whole = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
    const from = b.from ?? 0, to = b.to ?? n - 1;
    if (!n) return err(p, `"${b.of}" has no beats to replay`);
    if (!whole(from) || from < 0 || from >= n) return err(p, `"from" is a beat number of "${b.of}" (0-${n - 1})`);
    if (!whole(to) || to < from || to >= n) return err(p, `"to" is a beat number of "${b.of}" (${from}-${n - 1})`);
    const changes = b.changes ?? [];
    if (!Array.isArray(changes)) return err(p, '"changes" is a list of { "at", "replace": [beats] } or { "at", "insert": [beats] }');
    let ok = true;
    const replaced = new Set<number>();
    changes.forEach((c, k) => {
      const cp = `${p}.changes[${k}]`;
      const bad = (message: string) => { ok = false; err(cp, message); };
      if (!isObj(c)) return bad('a change is { "at": beat number, "replace": [beats] } or { "at", "insert": [beats] }');
      keys(c, cp, ['at', 'replace', 'insert']);
      if (!whole(c.at) || c.at < from || c.at > to + 1) return bad(`"at" is a beat number of "${b.of}" from ${from} to ${to + 1}`);
      if ((c.replace === undefined) === (c.insert === undefined)) return bad('a change either replaces beat "at" or inserts beats just before it');
      const list = c.replace ?? c.insert;
      if (!Array.isArray(list)) return bad('a change\'s beats are an array (an empty "replace" cuts the beat)');
      if (c.insert !== undefined && !list.length) warn(cp, 'inserting nothing');
      if (c.replace !== undefined) {
        if (c.at > to) return bad(`there's no beat ${c.at} in the replayed part to replace`);
        if (replaced.has(c.at)) return bad(`beat ${c.at} is replaced twice`);
        replaced.add(c.at);
      }
    });
    if (!ok) return;
    if (!changes.length && b.add === undefined && b.label === undefined) warn(p, 'a replay with no changes: give it a reason to be seen again (a label, a change, someone revealed)');

    // stand everyone where they were when the replayed part starts
    muted++;
    const counted = { ...count };
    const st = castOn(src.cast, src.location, `${p}.cast`, false);
    beats([...src.before, ...original.slice(0, from)], st, p, depth + 1, { left: Infinity });
    count = counted;
    muted--;
    if (!st) return;
    if (b.add !== undefined) {
      if (!Array.isArray(b.add) || !b.add.length) err(p, '"add" is a list of { "character", "mark" }: people who were there all along');
      else b.add.forEach((c, k) => castOne(st, c, `${p}.add[${k}]`));
    }
    const range = { from, to };
    const composed = replayBeats(original as Beat[], { ...range, changes: changes as never });
    const named = replayBeats(original.map((_, i) => `${p} (beat ${i} of "${b.of}")`) as never, {
      ...range,
      changes: changes.map((c: Obj, k) => ({
        at: c.at as number,
        replace: (c.replace as unknown[] | undefined)?.map((_, j) => `${p}.changes[${k}].replace[${j}]`),
        insert: (c.insert as unknown[] | undefined)?.map((_, j) => `${p}.changes[${k}].insert[${j}]`),
      })) as never,
    }) as unknown as string[];
    replaying++;
    try {
      beats(composed, st, p, depth + 1, budget, named);
    } finally {
      replaying--;
    }
  };

  /** Two or three sets at once. Everyone in it stays put; lines can go back and forth between the panels. */
  const split = (b: Obj, p: string, depth: number, budget: { left: number }) => {
    card(b, p);
    oneOf(b, 'sound', SOUND_CUES, p);
    if (!Array.isArray(b.panels) || b.panels.length < 2 || b.panels.length > 3) return err(p, '"panels" is 2-3 { "location", "time", "cast" }');
    const set = { name: 'split screen', marks: {}, door: '' } as unknown as Sets[string];
    const all: Stage = { location: 'a split screen', set, at: new Map(), real: false, held: new Map(), split: true };
    const places = new Set<string>();
    b.panels.forEach((panel, k) => {
      const pp = `${p}.panels[${k}]`;
      if (!isObj(panel)) return err(pp, 'a panel is { "location", "time", "cast" }');
      keys(panel, pp, ['location', 'time', 'cast']);
      oneOf(panel, 'time', ['day', 'night'], pp, true);
      const location = oneOf(panel, 'location', SCENE_LOCATION_IDS, pp, true);
      if (location && places.has(location)) err(pp, `two panels are both at ${location}: each panel is its own set`);
      if (location) places.add(location);
      const inner = location ? castOn(panel.cast, location, `${pp}.cast`, false) : null;
      if (!inner) return;
      if (!inner.at.size) err(pp, 'a panel needs someone in it');
      else if (inner.at.size > 3) err(pp, 'a panel holds three people at most');
      for (const id of inner.at.keys()) {
        if (all.at.has(id)) err(pp, `${id} can't be in two panels at once`);
        all.at.set(id, null);
      }
    });
    if (!Array.isArray(b.beats) || !b.beats.length) return err(p, 'a split screen needs beats');
    beats(b.beats, all, `${p}.beats`, depth, budget, undefined, 'split');
  };

  /** A kid's beat is one of the takes recorded before the series was filmed, played exactly as it was shot. */
  const recorded = (b: Obj, who: string, p: string) => {
    const said = b.type === 'say';
    if (said && b.chorus !== undefined && (!Array.isArray(b.chorus) || b.chorus.length !== 1 || !isKid(String(b.chorus[0])) || b.chorus[0] === who)) {
      return err(p, '"chorus" on a kid\'s line is the other kid');
    }
    const extra = Object.keys(b).filter((k) => !['type', 'character', said ? 'line' : 'gesture', 'chorus', 'laugh'].includes(k));
    if (extra.length) err(p, `${list(extra.map((k) => `"${k}"`))}: the kids' takes were recorded before the series was filmed, so how they're played comes with the take`);
    if (kidTake(b as Parameters<typeof kidTake>[0])) return;
    const both = said && b.chorus !== undefined;
    const takes = KID_TAKES.filter((t) => (said ? !!t.line : !t.line) && (both ? t.who === 'both' : t.who === who));
    const options = takes.map((t) => JSON.stringify(said ? t.line : t.gesture));
    err(p, `${who} has no recorded take ${said ? `"${String(b.line)}"` : `with "gesture": ${JSON.stringify(b.gesture)}`}${both ? ' together' : ''}: the kids' scenes were shot before the series, so ${both ? 'together they' : 'they'} can only ${said ? 'say' : 'do'} ${list(options)}`);
  };

  /** Listener reactions: people on stage, never the speaker or the kids. */
  const reactions = (raw: unknown, st: Stage | null, p: string, speaker?: string) => {
    if (raw === undefined) return;
    if (!Array.isArray(raw) || !raw.length) return err(p, '"react" is a list of { "character", "emotion"?, "gesture"? }');
    const seen = new Set<string>();
    raw.forEach((r, k) => {
      const rp = `${p}.react[${k}]`;
      if (!isObj(r)) return err(rp, 'a reaction is { "character", "emotion"?, "gesture"? }');
      keys(r, rp, ['character', 'emotion', 'gesture']);
      oneOf(r, 'emotion', EMOTIONS, rp);
      oneOf(r, 'gesture', GESTURES, rp);
      const id = character(r.character, rp);
      if (!id) return;
      if (id === speaker) err(rp, `${id} said the line: reactions are the listeners`);
      else if (isKid(id)) err(rp, `${id} reacts from the couch with a "say" or "act" beat, not a reaction`);
      else if (st && !st.at.has(id)) err(rp, `${id} isn't on stage to react`);
      if (seen.has(id)) err(rp, `${id} reacts twice: merge them`);
      seen.add(id);
      if (r.emotion === undefined && r.gesture === undefined) warn(rp, 'a reaction with no emotion or gesture just looks surprised');
    });
    if (raw.length > 6) err(p, 'at most 6 reactions');
  };

  /** A full-screen card needs something to show. */
  const insert = (b: Obj, p: string) => {
    const kind = oneOf(b, 'kind', [...INSERT_KINDS, ...LEGACY_INSERT_KINDS], p, true);
    if (b.title !== undefined && (typeof b.title !== 'string' || b.title.length > 60)) err(p, '"title" is a short heading (60 characters max)');
    if (b.character !== undefined) character(b.character, p);
    if (b.lines !== undefined) {
      if (!Array.isArray(b.lines) || b.lines.length > 6 || b.lines.some((l) => typeof l !== 'string' || !l.trim() || l.length > 90)) {
        err(p, '"lines" is up to 6 short strings (90 characters max)');
      }
    }
    if (b.messages !== undefined) {
      if (!Array.isArray(b.messages) || !b.messages.length || b.messages.length > 6) err(p, '"messages" is 1-6 texts');
      else b.messages.forEach((m, k) => {
        if (!isObj(m) || typeof m.from !== 'string' || !m.from.trim() || typeof m.text !== 'string' || !m.text.trim()) err(`${p}.messages[${k}]`, 'a text is { "from": character id or name, "text" }');
        else {
          keys(m, `${p}.messages[${k}]`, ['from', 'text']);
          if (m.text.length > 120) err(`${p}.messages[${k}]`, 'texts are short (120 characters max)');
          if (isGuest(m.from) && !guests.has(m.from)) err(`${p}.messages[${k}]`, `${m.from} isn't cast`);
        }
      });
    }
    if (b.items !== undefined) {
      if (!Array.isArray(b.items) || !b.items.length || b.items.length > 6) err(p, '"items" is 1-6 { "label", "value" }');
      else b.items.forEach((it, k) => {
        if (!isObj(it) || typeof it.label !== 'string' || !it.label.trim() || it.label.length > 24 || typeof it.value !== 'number' || it.value < 0) {
          err(`${p}.items[${k}]`, 'a chart item is { "label": up to 24 characters, "value": a number >= 0 }');
        } else keys(it, `${p}.items[${k}]`, ['label', 'value']);
      });
    }
    oneOf(b, 'chart', CHART_STYLES, p);
    if (b.chart !== undefined && kind !== 'chart') err(p, '"chart" is only for a chart');
    if (kind === 'text' && b.messages === undefined) err(p, `a text insert needs ${INSERT_NEEDS.text}`);
    if (kind === 'chart' && b.items === undefined) err(p, `a chart needs ${INSERT_NEEDS.chart}`);
    if (kind && kind !== 'text' && kind !== 'chart' && b.title === undefined && b.lines === undefined) err(p, `a ${kind} insert needs ${INSERT_NEEDS[kind]}`);
    if (kind !== 'text' && b.messages !== undefined) err(p, '"messages" are only for a text');
    if (kind !== 'chart' && b.items !== undefined) err(p, '"items" are only for a chart');
  };

  // ---- the couch opening: Future Ted talking to the kids, who mostly listen
  if (ep.couch !== undefined) {
    if (!Array.isArray(ep.couch)) err('couch', 'must be an array of beats');
    else ep.couch.forEach((b, i) => {
      const p = `couch[${i}]`;
      if (!isObj(b) || !(((b.type === 'say' || b.type === 'act') && isKid(String(b.character))) || b.type === 'narrate')) {
        err(p, 'the couch is only Future Ted "narrate" beats and the odd penny/luke take ("say" or "act")');
      }
    });
    beats(ep.couch, null, 'couch', 0, { left: Infinity });
  }

  // ---- scenes
  const scenes = ep.scenes;
  if (!Array.isArray(scenes) || !scenes.length) err('scenes', 'an episode needs scenes');
  else {
    if (scenes.length > MAX_SCENES) err('scenes', `${scenes.length} scenes: ${MAX_SCENES} at most`);
    scenes.forEach((s, i) => {
      const path = `scenes[${i}]`;
      if (!isObj(s)) return err(path, 'a scene is an object');
      keys(s, path, ['id', 'resume', 'location', 'time', 'transition', 'label', 'sound', 'summary', 'wardrobe', 'cast', 'beats']);
      wardrobe(s.wardrobe, `${path}.wardrobe`, true);
      named(s.id, path);
      oneOf(s, 'transition', TRANSITIONS, path);
      card(s, path);
      oneOf(s, 'sound', [...SOUND_CUES, 'none'], path);
      if (s.summary !== undefined && typeof s.summary !== 'string') err(path, '"summary" is a string');
      let st: Stage | null = null;
      let resumed: Strand | undefined;
      if (s.resume !== undefined) {
        // intercutting: back to an earlier scene, everyone where we left them
        resumed = typeof s.resume === 'string' ? latest.get(s.resume) : undefined;
        if (!resumed) err(path, `"resume": ${JSON.stringify(s.resume)} isn't the id of an earlier scene${latest.size ? ` (so far: ${list([...latest.keys()])})` : ''}`);
        if (s.cast !== undefined) err(path, 'a resumed scene picks up with everyone where they were: leave out "cast" (bring anyone new on with "enter")');
        for (const k of ['location', 'time'] as const) {
          if (s[k] !== undefined && resumed && s[k] !== resumed[k]) err(path, `"${k}" comes from "${String(s.resume)}": leave it out`);
        }
        st = resumed?.end ? clone(resumed.end) : null;
      } else {
        const location = oneOf(s, 'location', SCENE_LOCATION_IDS, path, true);
        oneOf(s, 'time', ['day', 'night'], path, true);
        st = location ? castOn(s.cast, location, `${path}.cast`, true) : null;
      }
      const budget = { left: MAX_SCENE_BEATS };
      beats(s.beats, st, `${path}.beats`, 0, budget);
      if (budget.left < 0) err(path, `${MAX_SCENE_BEATS - budget.left} beats (counting cutaways): a scene has at most ${MAX_SCENE_BEATS}`);
      if (st) {
        const own: Strand = {
          location: st.location, time: resumed?.time ?? s.time, cast: resumed?.cast ?? s.cast,
          before: resumed ? [...resumed.before, ...resumed.beats] : [], beats: Array.isArray(s.beats) ? s.beats : [], end: st,
        };
        if (resumed) latest.set(s.resume as string, own);
        if (typeof s.id === 'string') {
          segments.set(s.id, own);
          latest.set(s.id, own);
        }
      }

      const top = Array.isArray(s.beats) ? s.beats.filter(isObj) : [];
      const lines = top.filter((b) => b.type === 'say').length;
      const laughs = top.filter((b) => b.laugh !== undefined).length;
      if (lines >= 6 && laughs < lines / 5) warn(path, `${laughs} laughs in ${lines} lines: land a punchline every 2-4 lines`);
      const narrations = top.filter((b) => b.type === 'narrate').length;
      if (narrations > 2) warn(path, `${narrations} narrate beats: check that each adds a reveal, time shift, correction or couch answer`);
      if (s.transition === 'rewind' && top[0]?.type !== 'narrate') warn(path, 'a rewind starts with a narrate beat that makes the time jump explicit');
    });
  }

  for (const [id, name] of guests) if (!speakers.has(id)) warn('guests', `${name} (${id}) never says a line`);
  if (count.kids > 2) warn('', `${count.kids} kids' takes: they barely talk (Future Ted does), so keep it to one or two where a reveal earns a stock reaction`);
  if (count.montages > 1) warn('', `${count.montages} montages: one per episode at most`);
  if (count.inserts > 3) warn('', `${count.inserts} inserts: two or three per episode`);
  if (count.freezes > 1) warn('', `${count.freezes} freeze frames: one per episode at most`);
  if (count.beats > LONG_EPISODE_BEATS) warn('', `${count.beats} beats: that runs long (most episodes come in under ${LONG_EPISODE_BEATS})`);

  if (!errors.length) {
    const music = musicCoverage(ep as unknown as EpisodeScript);
    // A review prompt for substantial coverage, never a cue quota or a validity requirement.
    if (music.spoken >= 20 && music.withMusic > music.spoken / 2) {
      warn('', `music: ${musicSummary(music)}; most dialogue should be unscored. Review cue exits and scene carryover (episodes read lists the spans).`);
    }
  }

  return { errors, warnings };
}

/** Continuity notes: the shape only. `bun run episodes ledger` compares them across the catalog. */
function continuity(raw: unknown, err: (path: string, message: string) => void, warn: (path: string, message: string) => void) {
  if (raw === undefined) return;
  const p = 'continuity';
  const fields = ['era', 'facts', 'changes', 'opens', 'closes'];
  if (!isObj(raw)) return err(p, `continuity is { ${fields.map((f) => `"${f}"`).join(', ')} }, all optional`);
  for (const k of Object.keys(raw)) if (!fields.includes(k)) err(p, `unknown field "${k}" (allowed: ${list(fields)})`);
  if (raw.era !== undefined && (typeof raw.era !== 'string' || !raw.era.trim() || raw.era.length > 40)) err(p, '"era" is a short note like "fall 2011" (40 characters max)');
  const facts = isObj(raw.facts) ? raw.facts : {};
  if (raw.facts !== undefined && !isObj(raw.facts)) err(`${p}.facts`, 'facts are { "robin.job": "Metro News One anchor", ... }');
  for (const [k, v] of Object.entries(facts)) {
    const who = k.split('.')[0];
    if (!/^[a-z0-9_]+\.[a-z0-9_.]+$/.test(k) || !isCharacterId(who) || isGuest(who)) {
      err(`${p}.facts`, `"${k}": a fact is "<character>.<thing>", like "ted.job" (regular characters only)`);
    }
    if (typeof v !== 'string' || !v.trim() || v.length > 80) err(`${p}.facts`, `"${k}" is a short string (80 characters max)`);
  }
  if (raw.changes !== undefined) {
    if (!Array.isArray(raw.changes) || raw.changes.some((c) => typeof c !== 'string')) err(`${p}.changes`, '"changes" is a list of fact names');
    else for (const c of raw.changes) if (!(c in facts)) warn(`${p}.changes`, `"${c}" changes to what? Put its new value in "facts"`);
  }
  if (raw.opens !== undefined) {
    if (!Array.isArray(raw.opens)) err(`${p}.opens`, '"opens" is a list of { "id", "note" }');
    else raw.opens.forEach((o, k) => {
      if (!isObj(o) || typeof o.id !== 'string' || !SLUG.test(o.id) || typeof o.note !== 'string' || !o.note.trim() || o.note.length > 140) {
        err(`${p}.opens[${k}]`, 'a thread is { "id": a slug like "ducky-tie", "note": what is owed or promised (140 characters max) }');
      } else for (const key of Object.keys(o)) if (key !== 'id' && key !== 'note') err(`${p}.opens[${k}]`, `unknown field "${key}"`);
    });
  }
  if (raw.closes !== undefined && (!Array.isArray(raw.closes) || raw.closes.some((c) => typeof c !== 'string' || !SLUG.test(c)))) {
    err(`${p}.closes`, '"closes" is a list of thread ids');
  }
}

/** Checks across the whole catalog: codes and titles are unique. */
export function validateCatalog(episodes: { file: string; episode: unknown }[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<string, string>();
  for (const { file, episode } of episodes) {
    if (!isObj(episode)) continue;
    for (const key of ['code', 'title'] as const) {
      const v = String(episode[key] ?? '').toLowerCase();
      if (!v) continue;
      const other = seen.get(`${key}:${v}`);
      if (other) issues.push({ path: file, message: `same ${key} as ${other}: ${String(episode[key])}` });
      else seen.set(`${key}:${v}`, file);
    }
  }
  return issues;
}
