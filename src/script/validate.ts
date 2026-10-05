import {
  CHARACTER_IDS, CHART_STYLES, CUTAWAY_STYLES, DELIVERIES, EMOTIONS, GESTURES, GUEST_COLORS, GUEST_EXTRAS, GUEST_HAIR, GUEST_HAIR_STYLES, GUEST_IDS,
  GUEST_SKIN, GUEST_TOPS, INSERT_KINDS, LAUGHS, MONTAGE_MUSIC, OUTFITS, PROPS, SCENE_LOCATION_IDS, SHOTS, TRANSITIONS, isGuest, isKid,
} from './types';
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

const MAX_MONTAGE_SHOTS = 6;

const BEAT_KEYS: Record<string, string[]> = {
  say: ['character', 'line', 'to', 'emotion', 'gesture', 'laugh', 'delivery', 'interrupted', 'chorus', 'react', 'shot'],
  narrate: ['line', 'laugh'],
  move: ['character', 'to'],
  enter: ['character', 'to'],
  exit: ['character'],
  act: ['character', 'gesture', 'to', 'emotion', 'shot'],
  hold: ['character', 'prop', 'shot'],
  give: ['character', 'to', 'prop', 'shot'],
  laugh: ['laugh'],
  pause: ['seconds'],
  freeze: ['line', 'character', 'gesture', 'to', 'emotion', 'laugh', 'shot'],
  insert: ['kind', 'title', 'lines', 'messages', 'items', 'chart', 'character', 'line', 'laugh', 'react'],
  cutaway: ['style', 'label', 'location', 'time', 'cast', 'beats'],
  montage: ['label', 'music', 'shots'],
};

/** Where an insert has room for what it shows. */
const INSERT_NEEDS: Record<string, string> = {
  text: '"messages" [{ "from", "text" }]', chart: '"items" [{ "label", "value" }]',
  slides: 'a "title" or "lines"', sign: 'a "title" or "lines"', playbook: 'a "title" or "lines"',
};
const COSTUME_KEYS = ['character', 'topStyle', 'top', 'under', 'tie', 'vest', 'pants', 'shoes', 'boots', 'hairStyle', 'extras'];

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (values: readonly string[]) => values.join(', ');
const words = (line: string) => line.trim().split(/\s+/).filter(Boolean).length;

export function validateEpisode(ep: unknown, sets: Sets): Report {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });
  const warn = (path: string, message: string) => warnings.push({ path, message });

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

  keys(ep, '', ['code', 'title', 'logline', 'coldOpen', 'couch', 'guests', 'wardrobe', 'scenes']);
  const code = text(ep, 'code', 'code');
  if (code && !/^S\d{2}E\d{2}$/.test(code)) err('code', `"${code}" should look like "S11E03"`);
  text(ep, 'title', 'title');
  text(ep, 'logline', 'logline');
  const coldOpen = text(ep, 'coldOpen', 'coldOpen');
  if (coldOpen && !/^kids\b/i.test(coldOpen.trim())) warn('coldOpen', 'Future Ted\'s cold open usually starts with "Kids, ..."');

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
          const v = g[k];
          if (v === undefined && (k === 'top' || k === 'pants')) err(path, `"${k}" color is required`);
          else if (v !== undefined && !(typeof v === 'string' && ((GUEST_COLORS as readonly string[]).includes(v) || /^#[0-9a-f]{6}$/.test(v)))) {
            err(path, `"${k}": ${JSON.stringify(v)} must be #rrggbb or one of: ${list(GUEST_COLORS)}`);
          }
        }
        if (!Array.isArray(g.extras)) err(path, '"extras" must be an array (can be empty)');
        else for (const x of g.extras) if (!(GUEST_EXTRAS as readonly string[]).includes(x)) err(path, `extra ${JSON.stringify(x)} is not one of: ${list(GUEST_EXTRAS)}`);
        if (!isObj(g.voice)) err(path, '"voice" must be { "pitch": low|medium|high, "pace": slow|normal|fast }');
        else {
          keys(g.voice, `${path}.voice`, ['pitch', 'pace']);
          oneOf(g.voice, 'pitch', ['low', 'medium', 'high'], `${path}.voice`, true);
          oneOf(g.voice, 'pace', ['slow', 'normal', 'fast'], `${path}.voice`, true);
        }
      });
    }
  }

  const color = (o: Obj, k: string, path: string) => {
    const v = o[k];
    if (v !== undefined && !(typeof v === 'string' && ((GUEST_COLORS as readonly string[]).includes(v) || /^#[0-9a-f]{6}$/.test(v)))) {
      err(path, `"${k}": ${JSON.stringify(v)} must be #rrggbb or one of: ${list(GUEST_COLORS)}`);
    }
  };

  /** Costumes for the regular cast: only what's mentioned changes. */
  const wardrobe = (raw: unknown, path: string) => {
    if (raw === undefined) return;
    if (!Array.isArray(raw)) return err(path, 'must be an array of costumes');
    const seen = new Set<unknown>();
    raw.forEach((c, i) => {
      const p = `${path}[${i}]`;
      if (!isObj(c)) return err(p, 'a costume is { "character", ...what changes }');
      keys(c, p, COSTUME_KEYS);
      const who = c.character;
      if (typeof who !== 'string' || !(CHARACTER_IDS as readonly string[]).includes(who) || isGuest(who) || isKid(who)) {
        err(p, `costumes are for the regular cast, not ${JSON.stringify(who)} (guest stars are described in "guests"; the kids don't change)`);
      }
      if (seen.has(who)) err(p, `${String(who)} has two costumes here: merge them`);
      seen.add(who);
      oneOf(c, 'topStyle', GUEST_TOPS, p);
      oneOf(c, 'hairStyle', GUEST_HAIR_STYLES, p);
      for (const k of ['top', 'under', 'tie', 'vest', 'pants', 'shoes']) color(c, k, p);
      if (c.boots !== undefined && typeof c.boots !== 'boolean') err(p, '"boots" is true or false');
      if (c.extras !== undefined) {
        if (!Array.isArray(c.extras)) err(p, '"extras" must be an array');
        else for (const x of c.extras) if (!(GUEST_EXTRAS as readonly string[]).includes(x)) err(p, `extra ${JSON.stringify(x)} is not one of: ${list(GUEST_EXTRAS)}`);
      }
      if (Object.keys(c).length < 2) warn(p, 'a costume that changes nothing');
    });
  };
  wardrobe(ep.wardrobe, 'wardrobe');

  const character = (v: unknown, path: string, what = 'character') => {
    if (typeof v !== 'string' || !(CHARACTER_IDS as readonly string[]).includes(v)) {
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
  let kidBeats = 0;
  let cutaways = 0;
  let montages = 0;
  let inserts = 0;
  let freezes = 0;

  interface Stage {
    location: string;
    set: Sets[string];
    /** On stage, and the mark they're on (null: next to someone, off any mark). */
    at: Map<string, string | null>;
    /** A scene, not a cutaway. */
    real: boolean;
    /** What people are holding. */
    held: Map<string, string>;
  }

  const compartment = (st: Stage, mark: string) => st.set.entrances?.[mark] ?? st.set.door;

  const castOn = (raw: unknown, location: string, path: string, real: boolean): Stage | null => {
    const set = sets[location];
    if (!set) return null;
    const st: Stage = { location, set, at: new Map(), real, held: new Map() };
    if (!Array.isArray(raw)) {
      err(path, '"cast" must be an array of { "character", "mark" }');
      return st;
    }
    raw.forEach((c, i) => {
      const p = `${path}[${i}]`;
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
        if (st.at.has(who)) err(p, `${who} is cast twice`);
        st.at.set(who, set.marks[mark] ? mark : null);
      }
    });
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
    if ((CHARACTER_IDS as readonly string[]).includes(to)) {
      if (!st.at.has(to)) err(path, `${to} isn't on stage to walk over to`);
      st.at.set(who, null);
      return;
    }
    err(path, `"to": "${to}" is neither a mark at ${st.location} (${list(Object.keys(st.set.marks))}) nor a character on stage`);
  };

  const beats = (raw: unknown, st: Stage | null, path: string, nested: boolean, budget: { left: number }) => {
    if (!Array.isArray(raw)) return err(path, '"beats" must be an array');
    raw.forEach((b, i) => {
      const p = `${path}[${i}]`;
      budget.left--;
      if (!isObj(b)) return err(p, 'a beat is an object with a "type"');
      const type = typeof b.type === 'string' ? b.type : '';
      if (!BEAT_KEYS[type]) return err(p, `"type": ${JSON.stringify(b.type)} is not one of: ${list(Object.keys(BEAT_KEYS))}`);
      keys(b, `${p} (${type})`, ['type', ...BEAT_KEYS[type]]);
      oneOf(b, 'emotion', EMOTIONS, p);
      oneOf(b, 'gesture', GESTURES, p, type === 'act');
      oneOf(b, 'laugh', LAUGHS, p, type === 'laugh');
      oneOf(b, 'delivery', DELIVERIES, p);

      oneOf(b, 'shot', SHOTS, p);
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

      const who = type in { say: 1, move: 1, enter: 1, exit: 1, act: 1, hold: 1, give: 1 } || (type === 'freeze' && b.character !== undefined)
        ? character(b.character, p) : undefined;
      const kid = !!who && isKid(who);
      if (kid) {
        if (type !== 'say' && type !== 'act') err(p, `${who} never leaves the 2030 couch: they can only say and act`);
        kidBeats++;
      }
      if (type === 'say' && who) speakers.add(who);
      if (kid && type === 'say' && b.chorus !== undefined) {
        // the kids can say something together on the couch, and that's all
        if (!Array.isArray(b.chorus) || b.chorus.some((c) => !isKid(String(c)) || c === who)) err(p, '"chorus" on a kid\'s line is the other kid');
      }
      if ((type === 'say' || type === 'act') && b.to !== undefined) {
        const to = character(b.to, p, '"to"');
        if (to && st && !kid && !st.at.has(to) && !isKid(to)) warn(p, `${who} talks to ${to}, who isn't on stage`);
      }

      if (type === 'freeze' && who && kid) err(p, 'a freeze frame is on someone in the story, not the couch');
      if (st && !kid && type === 'say') {
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
        inserts++;
        insert(b, p);
      }
      if (type === 'freeze') freezes++;

      if (!st || !who || kid) {
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
        if (nested) return err(p, 'no cutaways inside a cutaway');
        cutaways++;
        oneOf(b, 'style', CUTAWAY_STYLES, p, true);
        oneOf(b, 'time', ['day', 'night'], p, true);
        if (b.label !== undefined && (typeof b.label !== 'string' || b.label.length > 60)) err(p, '"label" is a short on-screen card (60 characters max)');
        if (!b.label) warn(p, 'give the cutaway an on-screen "label", e.g. "How Barney imagined it" or "Wesleyan, 1996"');
        const location = oneOf(b, 'location', SCENE_LOCATION_IDS, p, true);
        const inner = location ? castOn(b.cast, location, `${p}.cast`, false) : null;
        const n = Array.isArray(b.beats) ? b.beats.length : 0;
        if (n > MAX_CUTAWAY_BEATS) err(p, `${n} beats: a cutaway has at most ${MAX_CUTAWAY_BEATS}`);
        else if (n < 3 || n > 10) warn(p, `${n} beats: cutaways land best with 3-10`);
        beats(b.beats, inner, `${p}.beats`, true, budget);
      }

      if (type === 'montage') {
        if (nested) return err(p, 'no montages inside a cutaway or another montage');
        montages++;
        oneOf(b, 'music', MONTAGE_MUSIC, p, true);
        if (b.label !== undefined && (typeof b.label !== 'string' || b.label.length > 60)) err(p, '"label" is a short on-screen card (60 characters max)');
        if (!Array.isArray(b.shots)) return err(p, '"shots" must be an array of { "location", "time", "cast", "beats" }');
        if (b.shots.length < 2 || b.shots.length > MAX_MONTAGE_SHOTS) err(p, `${b.shots.length} shots: a montage has 2-${MAX_MONTAGE_SHOTS}`);
        b.shots.forEach((shot, k) => {
          const sp = `${p}.shots[${k}]`;
          if (!isObj(shot)) return err(sp, 'a shot is { "location", "time", "cast", "beats" }');
          keys(shot, sp, ['location', 'time', 'label', 'cast', 'beats']);
          oneOf(shot, 'time', ['day', 'night'], sp, true);
          if (shot.label !== undefined && (typeof shot.label !== 'string' || shot.label.length > 40)) err(sp, '"label" is a little card like "Day 3" (40 characters max)');
          const location = oneOf(shot, 'location', SCENE_LOCATION_IDS, sp, true);
          const inner = location ? castOn(shot.cast, location, `${sp}.cast`, false) : null;
          const n = Array.isArray(shot.beats) ? shot.beats.length : 0;
          if (n > 3) err(sp, `${n} beats: a montage shot is quick (0-2 beats)`);
          else if (n > 2) warn(sp, `${n} beats: montage shots land best with 1-2`);
          if (Array.isArray(shot.beats) && shot.beats.some((x) => isObj(x) && isKid(String(x.character)))) err(sp, 'the kids stay on the couch: no couch cutaways inside a montage');
          budget.left--;
          beats(shot.beats, inner, `${sp}.beats`, true, budget);
        });
      }
    });
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
    const kind = oneOf(b, 'kind', INSERT_KINDS, p, true);
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

  // ---- the kids' reaction to the cold open
  if (ep.couch !== undefined) {
    if (!Array.isArray(ep.couch)) err('couch', 'must be an array of beats');
    else ep.couch.forEach((b, i) => {
      const p = `couch[${i}]`;
      if (!isObj(b) || !((b.type === 'say' && isKid(String(b.character))) || b.type === 'narrate')) {
        err(p, 'the couch is only penny/luke "say" beats and Future Ted "narrate" answers');
      }
    });
    // (the couch reaction isn't one of the episode's couch cutaways)
    const before = kidBeats;
    beats(ep.couch, null, 'couch', true, { left: Infinity });
    kidBeats = before;
  }

  // ---- scenes
  const scenes = ep.scenes;
  if (!Array.isArray(scenes) || !scenes.length) err('scenes', 'an episode needs scenes');
  else {
    if (scenes.length < 3 || scenes.length > 5) warn('scenes', `${scenes.length} scenes: episodes usually have 3-4`);
    scenes.forEach((s, i) => {
      const path = `scenes[${i}]`;
      if (!isObj(s)) return err(path, 'a scene is an object');
      keys(s, path, ['location', 'time', 'transition', 'summary', 'wardrobe', 'cast', 'beats']);
      wardrobe(s.wardrobe, `${path}.wardrobe`);
      const location = oneOf(s, 'location', SCENE_LOCATION_IDS, path, true);
      oneOf(s, 'time', ['day', 'night'], path, true);
      oneOf(s, 'transition', TRANSITIONS, path);
      if (s.summary !== undefined && typeof s.summary !== 'string') err(path, '"summary" is a string');
      const st = location ? castOn(s.cast, location, `${path}.cast`, true) : null;
      const budget = { left: MAX_SCENE_BEATS };
      beats(s.beats, st, `${path}.beats`, false, budget);
      if (budget.left < 0) err(path, `${MAX_SCENE_BEATS - budget.left} beats (counting cutaways): a scene has at most ${MAX_SCENE_BEATS}`);

      const top = Array.isArray(s.beats) ? s.beats.filter(isObj) : [];
      const lines = top.filter((b) => b.type === 'say').length;
      const laughs = top.filter((b) => b.laugh !== undefined).length;
      if (top.length && top.length < 12) warn(path, `${top.length} beats: scenes usually run 16-30`);
      if (lines >= 6 && laughs < lines / 5) warn(path, `${laughs} laughs in ${lines} lines: land a punchline every 2-4 lines`);
      const narrations = top.filter((b) => b.type === 'narrate').length;
      if (narrations > 2) warn(path, `${narrations} narrate beats: Future Ted gets at most 2 per scene`);
      if (s.transition === 'rewind' && top[0]?.type !== 'narrate') warn(path, 'a rewind starts with a narrate beat that makes the time jump explicit');
      const last = top.at(-1);
      if (last && !last.laugh && last.type !== 'laugh' && last.type !== 'pause') warn(path, 'end the scene on a button: put a laugh on the final beat');
      if (i === scenes.length - 1 && !top.some((b, j) => b.type === 'narrate' && j >= top.length - 4)) {
        warn(path, 'the final scene should end on a Future Ted narrate button (a kids\' reaction can top it)');
      }
    });
  }

  for (const [id, name] of guests) if (!speakers.has(id)) warn('guests', `${name} (${id}) never says a line`);
  if (kidBeats > 3) warn('', `${kidBeats} couch cutaways: keep Penny and Luke to 0-2 quick reactions per episode`);
  if (cutaways > 2) warn('', `${cutaways} cutaways: one or two per episode`);
  if (montages > 1) warn('', `${montages} montages: one per episode at most`);
  if (inserts > 3) warn('', `${inserts} inserts: two or three per episode`);
  if (freezes > 1) warn('', `${freezes} freeze frames: one per episode at most`);

  return { errors, warnings };
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
