import * as THREE from 'three';
import type { Stage } from '../show/stage';
import type { Director } from '../show/director';
import type { Renderer } from '../engine/renderer';
import type { ContentSource, Player } from '../show/player';
import { CHARACTERS, charName } from '../world/characters';
import { placeholderGuest } from '../world/guests';
import { EPISODES } from '../script/catalog';
import { episodeItems } from '../script/episodes';
import { resolveStrands } from '../script/strands';
import { validateEpisode, type Issue } from '../script/validate';
import { sleep } from '../util';
import {
  CHARACTER_IDS, CHART_STYLES, CUTAWAY_LOOKS, CUTAWAY_STYLES, CUTAWAY_TRANSITIONS, DELIVERIES, EMOTIONS, GESTURES, GUEST_COLORS,
  GUEST_EXTRAS, GUEST_HAIR, GUEST_HAIR_STYLES, GUEST_IDS, GUEST_SKIN, GUEST_TOPS, INSERT_KINDS, LAUGHS, LOCATION_IDS, MONTAGE_MUSIC, OFFSCREEN,
  OUTFITS, PAIRED_GESTURES, PROPS, SCENE_LOCATION_IDS, SCORES, SHOTS, SOUND_CUES, TRANSITIONS, isKid,
  type Beat, type CastPlacement, type CharacterId, type Costume, type EpisodeScript, type GuestStar, type InsertKind, type LocationId,
  type Scene, type SceneLocationId, type ShowItem, type SoundCue, type TimeOfDay, type Transition,
} from '../script/types';

// The dev playground (?playground): stage any set with anyone on any mark, in any costume, from any angle, and
// fire every beat a writer can write through the real player, one at a time or in automated sweeps. It's for
// debugging the show and finding out what the stage can do, not for writing episodes.

/** The playground's channel: it airs exactly what the playground hands it, and nothing on its own. */
export class Workbench implements ContentSource {
  private queue: ShowItem[] = [];
  private wake: (() => void) | null = null;

  air(items: ShowItem[]) {
    this.queue = [...items];
    this.wake?.();
  }

  clear() {
    this.queue = [];
  }

  async next(): Promise<ShowItem> {
    while (!this.queue.length) await new Promise<void>((r) => (this.wake = r));
    this.wake = null;
    return this.queue.shift()!;
  }
}

type BeatType = Beat['type'];
type Tab = 'stage' | 'camera' | 'beats' | 'sweeps' | 'script';

interface Bench {
  location: LocationId;
  time: TimeOfDay;
  cast: CastPlacement[];
  /** Guest-star slots in use. */
  guests: GuestStar[];
  wardrobe: Costume[];
  /** How the scene comes in when it's played as a scene. */
  scene: { transition?: Transition; label?: string; sound?: SoundCue | 'none' };
  queue: Beat[];
  /** The beat in the editor. */
  draft: Record<string, unknown>;
  /** Who the sweeps, the camera menu and the beat templates are about. */
  a: CharacterId;
  b: CharacterId;
  tab: Tab;
  marks: boolean;
  nav: boolean;
  script: string;
}

const KEY = 'himyllm.playground';
const GANG: CharacterId[] = ['ted', 'marshall', 'lily', 'robin', 'barney'];

const fresh = (): Bench => ({
  location: 'maclarens', time: 'night',
  cast: [
    { character: 'ted', mark: 'booth_end' }, { character: 'marshall', mark: 'booth_left_front' }, { character: 'lily', mark: 'booth_left_back' },
    { character: 'robin', mark: 'booth_right_back' }, { character: 'barney', mark: 'booth_right_front' },
  ],
  guests: [], wardrobe: [], scene: {}, queue: [],
  draft: { type: 'say', character: 'barney', line: 'Wait for it...', to: 'ted' },
  a: 'barney', b: 'ted', tab: 'stage', marks: false, nav: false, script: '',
});

function load(): Bench {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Bench> | null;
    const st = { ...fresh(), ...saved };
    if (!(LOCATION_IDS as readonly string[]).includes(st.location)) st.location = 'maclarens';
    return st;
  } catch {
    return fresh();
  }
}

// ---------------------------------------------------------------- tiny DOM kit

type Child = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { class?: string; data?: Record<string, string> } = {}, ...children: Child[]) {
  const e = document.createElement(tag);
  const { class: cls, data, ...rest } = props;
  if (cls) e.className = cls;
  Object.assign(e, rest);
  for (const [k, v] of Object.entries(data ?? {})) e.dataset[k] = v;
  for (const c of children) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}
const button = (text: string, onclick: () => void, title = '', cls = '') => h('button', { type: 'button', textContent: text, title, onclick, class: cls });
function select(values: readonly string[], value: string | undefined, onchange: (v: string) => void, o: { blank?: string; label?: (v: string) => string; title?: (v: string) => string } = {}) {
  const s = h('select');
  if (o.blank !== undefined) s.append(h('option', { value: '', textContent: o.blank }));
  for (const v of values) s.append(h('option', { value: v, textContent: o.label?.(v) ?? v, title: o.title?.(v) ?? '' }));
  s.value = value ?? '';
  s.onchange = () => onchange(s.value);
  return s;
}
const row = (label: string, ...controls: Child[]) => h('label', { class: 'pg-row' }, h('span', { textContent: label }), ...controls);
const note = (text: string) => h('p', { class: 'pg-note', textContent: text });

// ---------------------------------------------------------------- forms for beats, guests and costumes

interface Field {
  key: string;
  kind: 'enum' | 'text' | 'long' | 'number' | 'bool' | 'multi' | 'json';
  values?: () => readonly string[];
  required?: boolean;
  hint?: string;
}

/** A form for a flat object: changing a control rewrites that key (blank removes it) and calls back. */
function form(fields: Field[], value: Record<string, unknown>, changed: () => void) {
  const box = h('div', { class: 'pg-form' });
  for (const f of fields) {
    const set = (v: unknown) => {
      if (v === '' || v === undefined || (Array.isArray(v) && !v.length && !f.required)) delete value[f.key];
      else value[f.key] = v;
      changed();
    };
    const cur = value[f.key];
    let control: HTMLElement;
    switch (f.kind) {
      case 'enum':
        control = select(f.values!(), cur === undefined ? '' : String(cur), set, { blank: f.required ? undefined : '—', label: (v) => labelFor(f.key, v) });
        if (f.required && cur === undefined) set((control as HTMLSelectElement).value);
        break;
      case 'text':
        control = h('input', { type: 'text', value: String(cur ?? ''), oninput: (e: Event) => set((e.target as HTMLInputElement).value) });
        break;
      case 'long':
        control = h('textarea', { rows: 2, value: String(cur ?? ''), oninput: (e: Event) => set((e.target as HTMLTextAreaElement).value) });
        break;
      case 'number':
        control = h('input', { type: 'number', step: 'any', value: cur === undefined ? '' : String(cur), oninput: (e: Event) => {
          const t = (e.target as HTMLInputElement).value;
          set(t === '' ? undefined : Number(t));
        } });
        break;
      case 'bool':
        control = h('input', { type: 'checkbox', checked: !!cur, onchange: (e: Event) => set((e.target as HTMLInputElement).checked || undefined) });
        break;
      case 'multi': {
        const picked = new Set(Array.isArray(cur) ? (cur as string[]) : []);
        control = h('div', { class: 'pg-chips' });
        for (const v of f.values!()) {
          control.append(h('label', {}, h('input', { type: 'checkbox', checked: picked.has(v), onchange: (e: Event) => {
            if ((e.target as HTMLInputElement).checked) picked.add(v);
            else picked.delete(v);
            set(f.values!().filter((x) => picked.has(x)));
          } }), labelFor(f.key, v)));
        }
        break;
      }
      case 'json': {
        const area = h('textarea', { rows: 4, class: 'pg-json', value: cur === undefined ? '' : JSON.stringify(cur, null, 1), spellcheck: false });
        area.oninput = () => {
          if (!area.value.trim()) return area.classList.remove('bad'), set(undefined);
          try {
            const parsed = JSON.parse(area.value);
            area.classList.remove('bad');
            set(parsed);
          } catch {
            area.classList.add('bad');
          }
        };
        control = area;
        break;
      }
    }
    const r = row(`${f.key}${f.required ? ' *' : ''}`, control);
    if (f.hint) r.title = f.hint;
    if (f.kind === 'json' || f.kind === 'multi' || f.kind === 'long') r.classList.add('wide');
    box.append(r);
  }
  return box;
}

/** Characters show their names in pickers. */
function labelFor(key: string, v: string) {
  return ['character', 'to', 'chorus', 'from'].includes(key) && (CHARACTER_IDS as readonly string[]).includes(v) ? `${v} · ${charName(v)}` : v;
}

const GUEST_FIELDS: Field[] = [
  { key: 'name', kind: 'text', required: true }, { key: 'role', kind: 'text', required: true },
  { key: 'gender', kind: 'enum', values: () => ['male', 'female'], required: true },
  { key: 'height', kind: 'enum', values: () => ['short', 'average', 'tall'], required: true },
  { key: 'build', kind: 'enum', values: () => ['slim', 'average', 'broad'], required: true },
  { key: 'skin', kind: 'enum', values: () => GUEST_SKIN, required: true }, { key: 'hair', kind: 'enum', values: () => GUEST_HAIR, required: true },
  { key: 'hairStyle', kind: 'enum', values: () => GUEST_HAIR_STYLES, required: true }, { key: 'topStyle', kind: 'enum', values: () => GUEST_TOPS, required: true },
  { key: 'top', kind: 'enum', values: () => GUEST_COLORS, required: true }, { key: 'under', kind: 'enum', values: () => GUEST_COLORS },
  { key: 'tie', kind: 'enum', values: () => GUEST_COLORS }, { key: 'vest', kind: 'enum', values: () => GUEST_COLORS },
  { key: 'pants', kind: 'enum', values: () => GUEST_COLORS, required: true }, { key: 'extras', kind: 'multi', values: () => GUEST_EXTRAS },
];

const COSTUME_FIELDS: Field[] = [
  { key: 'topStyle', kind: 'enum', values: () => GUEST_TOPS }, { key: 'top', kind: 'enum', values: () => GUEST_COLORS },
  { key: 'under', kind: 'enum', values: () => GUEST_COLORS }, { key: 'tie', kind: 'enum', values: () => GUEST_COLORS },
  { key: 'vest', kind: 'enum', values: () => GUEST_COLORS }, { key: 'pants', kind: 'enum', values: () => GUEST_COLORS },
  { key: 'shoes', kind: 'enum', values: () => GUEST_COLORS }, { key: 'boots', kind: 'bool' },
  { key: 'hairStyle', kind: 'enum', values: () => GUEST_HAIR_STYLES }, { key: 'extras', kind: 'multi', values: () => GUEST_EXTRAS },
];

// ---------------------------------------------------------------- the playground

export function playground(o: { stage: Stage; director: Director; renderer: Renderer; player: Player; bench: Workbench }) {
  const { stage, director, renderer, player, bench } = o;
  const st = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));
  document.body.classList.add('playground');

  // ---- who's who
  const castIds = () => st.cast.map((c) => c.character);
  const people = () => [...new Set([...castIds(), ...CHARACTER_IDS])];
  const marksOf = (loc: LocationId = st.location) => Object.keys(stage.sets[loc].marks);
  const targets = () => [...marksOf(), ...people()];
  const freeMarks = (loc: LocationId) => {
    const s = stage.sets[loc];
    const blocked = new Set([s.door, ...(s.reserved ?? []), ...Object.values(s.entrances ?? {})]);
    const all = Object.keys(s.marks).filter((m) => !blocked.has(m));
    return [...all.filter((m) => s.marks[m].seat !== null), ...all.filter((m) => s.marks[m].seat === null)];
  };
  const someMark = (loc: LocationId, i = 0) => {
    const free = freeMarks(loc);
    return free[i % Math.max(1, free.length)] ?? 'center';
  };
  /** The subjects, kept to people in the cast. */
  function subjects() {
    const ids = castIds().filter((id) => !isKid(id));
    if (!ids.includes(st.a)) st.a = ids[0] ?? 'ted';
    if (!ids.includes(st.b) || st.b === st.a) st.b = ids.find((id) => id !== st.a) ?? st.a;
    return { a: st.a, b: st.b };
  }

  // ---- what to play
  const sceneLocation = (): SceneLocationId => (st.location === 'future' ? 'maclarens' : st.location);
  function scene(beats: Beat[], withEntrance = false): Scene {
    return {
      id: 'playground', location: st.location, time: st.time, cast: st.cast, beats,
      ...(st.wardrobe.length ? { wardrobe: st.wardrobe } : {}),
      ...(withEntrance ? st.scene : {}),
    };
  }
  function episode(beats: Beat[] = st.queue): EpisodeScript {
    return {
      code: 'S99E99', title: 'Playground', logline: 'Testing what the stage can do.',
      ...(st.guests.length ? { guests: st.guests } : {}),
      scenes: [scene(beats, true)],
    };
  }
  /** Beats ready to play in place, with any replay given what it replays (from the queue, or earlier in `beats`). */
  function resolved(beats: Beat[], context: Beat[] = []) {
    return resolveStrands(episode([...context, ...beats])).scenes[0].beats.slice(context.length);
  }
  let aired = 0;
  /** An episode's scenes on their own, from scene `from`: no couch, titles or credits. */
  function sceneItems(script: EpisodeScript, from = 0): ShowItem[] {
    const items = episodeItems(script, `playground-${++aired}`).flatMap((item): ShowItem[] => {
      if (item.kind === 'episode-start') return item.openingScene ? [{ kind: 'scene', episode: item.episode, index: 0, scene: item.openingScene }] : [];
      return item.kind === 'scene' ? [item] : [];
    });
    // (the episode's own costumes, which the skipped cold open would have put on)
    return items.flatMap((i) => i.kind === 'scene' && i.index >= from
      ? [{ ...i, scene: { ...i.scene, wardrobe: [...(script.wardrobe ?? []), ...(i.scene.wardrobe ?? [])] } }] : []);
  }

  // ---- the transport
  let generation = 0;
  const status = h('div', { class: 'pg-status', textContent: 'idle' });
  const say = (text: string) => (status.textContent = text);
  async function stop() {
    generation++;
    bench.clear();
    if (player.busy) player.skip('scene');
    while (player.busy) await sleep(20);
  }
  async function restage() {
    await stop();
    freeCam(false);
    stage.castGuests(st.guests);
    player.stageNow(scene([]));
    save();
    say(`staged ${stage.current.name} · ${st.time}`);
    document.getElementById('now-code')!.textContent = 'playground';
    document.getElementById('now-title')!.textContent = stage.current.name;
    document.getElementById('now-meta')!.textContent = `${st.location} · ${st.time} · ${st.cast.length} cast`;
    refreshCamera();
  }
  async function performHere(beats: Beat[], context: Beat[] = []) {
    await stop();
    freeCam(false);
    const run = generation;
    say(`playing ${beats.length} beat${beats.length === 1 ? '' : 's'} in place…`);
    await player.perform(resolved(beats, context));
    if (run === generation) say('idle');
  }
  async function air(items: ShowItem[], what: string, guests?: GuestStar[]) {
    await stop();
    freeCam(false);
    stage.castGuests(guests);
    bench.air(items);
    say(`airing ${what}…`);
    const run = generation;
    await sleep(100);
    while (player.busy) await sleep(100);
    if (run === generation) say('idle');
  }

  // ---- the panel
  const root = h('section', { id: 'playground' });
  const tabs = h('nav', { class: 'pg-tabs' });
  const body = h('div', { class: 'pg-body' });
  const TABS: [Tab, string][] = [['stage', 'Stage'], ['camera', 'Camera'], ['beats', 'Beats'], ['sweeps', 'Sweeps'], ['script', 'Script']];
  const transport = h('div', { class: 'pg-transport' },
    button('■ stop', () => void stop().then(() => say('stopped'))),
    button('restage', () => void restage(), 'Put the Stage tab back exactly as set up'),
    button('clear overlays', () => player.reset(), 'Take down captions, inserts, looks and music'),
  );
  root.append(h('header', { class: 'pg-head' }, h('b', { textContent: 'PLAYGROUND' }), transport), status, tabs, body);
  document.getElementById('panel')!.insertBefore(root, document.getElementById('transcript'));

  function render() {
    tabs.replaceChildren(...TABS.map(([id, name]) => button(name, () => { st.tab = id; save(); render(); }, '', st.tab === id ? 'on' : '')));
    subjects();
    body.replaceChildren(({ stage: stageTab, camera: cameraTab, beats: beatsTab, sweeps: sweepsTab, script: scriptTab })[st.tab]());
  }

  /** Subject (A) and partner (B): who the camera menu, templates and sweeps are about. */
  function pair() {
    const ids = castIds().filter((id) => !isKid(id));
    const pick = (k: 'a' | 'b') => select(ids, st[k], (v) => { st[k] = v as CharacterId; save(); render(); }, { label: (v) => charName(v) });
    return h('div', { class: 'pg-pair' }, row('A', pick('a')), row('B', pick('b')));
  }

  // ---------------------------------------------------------------- stage tab

  function stageTab() {
    const s = stage.sets[st.location];
    const restaged = () => { save(); void restage().then(render); };
    const out = h('div');
    out.append(
      h('div', { class: 'pg-grid' },
        row('location', select(LOCATION_IDS, st.location, (v) => {
          st.location = v as LocationId;
          // keep people on marks this set has (2030 is the kids' couch: nobody else)
          st.cast = st.location === 'future' ? [] : st.cast.map((c, i) => ({ ...c, mark: marksOf().includes(c.mark) ? c.mark : someMark(st.location, i) }));
          restaged();
        }, { label: (v) => `${stage.sets[v as LocationId].name} (${v})` })),
        row('time', select(['day', 'night'], st.time, (v) => { st.time = v as TimeOfDay; restaged(); })),
      ),
    );
    if (st.location === 'future') out.append(note('2030: Penny and Luke are seated automatically; their lines play here without cutting away.'));
    if (s.seated) out.append(note('A vehicle: everyone is seated; move slides seats, enter/exit uses the doors.'));

    // the cast, one row each
    const cast = h('div', { class: 'pg-cast' });
    const used = new Set(st.cast.map((c) => c.mark));
    st.cast.forEach((c, i) => {
      const marks = marksOf();
      cast.append(h('div', { class: 'pg-castrow' },
        select(people().filter((id) => id === c.character || !castIds().includes(id)), c.character, (v) => { st.cast[i] = { ...c, character: v as CharacterId }; restaged(); }, { label: (v) => charName(v) }),
        select(marks, c.mark, (v) => { st.cast[i] = { ...c, mark: v }; restaged(); }, {
          label: (m) => `${m}${s.marks[m].seat !== null ? ' (seat)' : ''}${m === s.door ? ' (door)' : ''}${used.has(m) && m !== c.mark ? ' ●' : ''}`,
          title: (m) => s.marks[m].hint,
        }),
        select(OUTFITS, c.outfit, (v) => { st.cast[i] = { ...c, outfit: (v || undefined) as CastPlacement['outfit'] }; if (!v) delete st.cast[i].outfit; restaged(); }, { blank: 'auto' }),
        button('✕', () => { st.cast.splice(i, 1); restaged(); }, 'Remove from the cast'),
      ));
    });
    const add = (id: CharacterId) => {
      if (castIds().includes(id)) return;
      const taken = new Set(st.cast.map((c) => c.mark));
      st.cast.push({ character: id, mark: freeMarks(st.location).find((m) => !taken.has(m)) ?? someMark(st.location) });
    };
    out.append(
      h('h4', { textContent: `Cast · ${st.cast.length}` }), cast,
      h('div', { class: 'pg-buttons' },
        select(CHARACTER_IDS.filter((id) => !castIds().includes(id) && !isKid(id)), undefined, (v) => { add(v as CharacterId); restaged(); }, { blank: '+ add someone', label: (v) => `${charName(v)} (${v})` }),
        button('+ gang', () => { GANG.forEach(add); restaged(); }),
        button('everyone', () => { CHARACTER_IDS.filter((id) => !isKid(id)).forEach(add); restaged(); }, 'Everyone in the show, one per mark (squeezed in when the marks run out)'),
        button('clear', () => { st.cast = []; restaged(); }),
      ),
    );
    if (s.background.length) out.append(note(`In the background unless cast: ${s.background.map((b) => `${charName(b.character)} at ${b.mark}`).join(', ')}.`));

    // guest stars
    out.append(h('h4', { textContent: 'Guest stars' }));
    GUEST_IDS.forEach((id, i) => {
      const g = st.guests.find((x) => x.id === id);
      const d = h('details', { class: 'pg-card' }, h('summary', {},
        h('input', { type: 'checkbox', checked: !!g, title: 'Cast this slot', onclick: (e: Event) => e.stopPropagation(), onchange: (e: Event) => {
          if ((e.target as HTMLInputElement).checked) st.guests.push({ ...placeholderGuest(id), name: `Guest ${i + 1}`, role: 'a guest star' });
          else st.guests = st.guests.filter((x) => x.id !== id);
          st.guests.sort((x, y) => x.id.localeCompare(y.id));
          restaged();
        } }),
        ` ${id}${g ? ` · ${g.name}` : ' (placeholder)'}`));
      if (g) {
        let timer = 0;
        d.append(form(GUEST_FIELDS, g as unknown as Record<string, unknown>, () => { clearTimeout(timer); timer = window.setTimeout(restaged, 350); }));
        d.append(row('voice', select(['low', 'medium', 'high'], g.voice.pitch, (v) => { g.voice.pitch = v as GuestStar['voice']['pitch']; restaged(); }),
          select(['slow', 'normal', 'fast'], g.voice.pace, (v) => { g.voice.pace = v as GuestStar['voice']['pace']; restaged(); })));
        if (!castIds().includes(id)) d.append(button(`+ put ${id} in the cast`, () => { add(id); restaged(); }));
      }
      out.append(d);
    });

    // costumes
    out.append(h('h4', { textContent: 'Wardrobe (scene costumes)' }));
    st.wardrobe.forEach((c, i) => {
      let timer = 0;
      const d = h('details', { class: 'pg-card', open: true }, h('summary', {}, `${charName(c.character)} `, button('✕', () => { st.wardrobe.splice(i, 1); restaged(); })));
      d.append(row('character', select(CHARACTER_IDS.filter((id) => !isKid(id)), c.character, (v) => { c.character = v as CharacterId; restaged(); }, { label: (v) => charName(v) })));
      d.append(form(COSTUME_FIELDS, c as unknown as Record<string, unknown>, () => { clearTimeout(timer); timer = window.setTimeout(restaged, 350); }));
      out.append(d);
    });
    out.append(h('div', { class: 'pg-buttons' }, button('+ costume', () => {
      st.wardrobe.push({ character: subjects().a, topStyle: 'suit', top: 'black', tie: 'red' });
      restaged();
    }), button('boots for Ted', () => { st.wardrobe.push({ character: 'ted', boots: true, shoes: 'red' }); restaged(); }, "Ted's red cowboy boots")));
    out.append(h('h4', { textContent: 'Debug layers' }), h('div', { class: 'pg-buttons' },
      h('label', {}, h('input', { type: 'checkbox', checked: st.marks, onchange: (e: Event) => { st.marks = (e.target as HTMLInputElement).checked; save(); } }), ' marks'),
      h('label', {}, h('input', { type: 'checkbox', checked: st.nav, onchange: (e: Event) => { st.nav = (e.target as HTMLInputElement).checked; save(); } }), ' walk graph'),
    ), note(`Click a mark on screen to walk A (${charName(subjects().a)}) there; shift-click to put them there instantly.`));
    return out;
  }

  // ---------------------------------------------------------------- camera tab

  const angleList = h('div', { class: 'pg-angles' });
  const camInfo = h('pre', { class: 'pg-caminfo' });
  type Angle = { name: string; go: () => void };
  function angles(): Angle[] {
    const s = stage.current;
    const on = stage.castIds();
    const { a, b } = subjects();
    const list: Angle[] = s.wides.map((w, i) => ({ name: w.label ?? `wide ${i}${i === 0 ? ' (master)' : ''}`, go: () => director.wide(i) }));
    list.push({ name: 'auto coverage', go: () => director.coverage(on) });
    for (const id of on) list.push({ name: `close-up · ${charName(id)}`, go: () => director.closeup(id) });
    if (a !== b) {
      list.push(
        { name: `close-up · ${charName(a)} toward ${charName(b)}`, go: () => director.closeup(a, b) },
        { name: `push-in · ${charName(a)}`, go: () => director.pushIn(a, b) },
        { name: `two-shot · ${charName(a)} & ${charName(b)}`, go: () => director.twoShot(a, b) },
        { name: `reverse two-shot · ${charName(b)} & ${charName(a)}`, go: () => director.twoShot(b, a) },
        { name: `over the shoulder · ${charName(a)} → ${charName(b)}`, go: () => director.overShoulder(a, b) },
        { name: `reverse shoulder · ${charName(b)} → ${charName(a)}`, go: () => director.overShoulder(b, a) },
      );
    }
    if (on.length > 2) list.push({ name: 'group (everyone)', go: () => director.group(on) });
    if (st.location !== 'future') {
      for (const kind of ['skyline', 'exterior', 'atlantic_city'] as const) {
        list.push({ name: `establishing · ${kind}`, go: () => director.establish(stage.establish(kind, st.location, st.time), true) });
      }
    }
    return list;
  }
  function cut(angle: Angle) {
    freeCam(false);
    stage.endEstablishing();
    angle.go();
    say(angle.name);
  }
  function refreshCamera() {
    if (st.tab !== 'camera') return;
    angleList.replaceChildren(...angles().map((angle) => button(angle.name, () => cut(angle))));
  }
  function cameraTab() {
    refreshCamera();
    return h('div', {}, pair(), h('h4', { textContent: 'Angles' }), angleList,
      h('div', { class: 'pg-buttons' },
        button('▶ sweep every angle', () => void sweepAngles(), 'Cut through every angle, 2 s each: for checking framing and clipping on a set'),
        button(free.on ? 'free camera: on' : 'free camera: off', () => { freeCam(!free.on); render(); }, 'Drag to orbit, right/shift-drag to pan, wheel to dolly'),
        button('copy shot', () => void navigator.clipboard.writeText(shotCode()), 'Copy the current camera as a set wide: { pos, target, fov }'),
      ),
      camInfo, note('Free camera: drag on the picture to orbit, shift- or right-drag to pan, scroll to dolly, alt-scroll to zoom.'));
  }
  async function sweepAngles() {
    await stop();
    const run = generation;
    for (const angle of angles()) {
      if (run !== generation) return;
      cut(angle);
      await sleep(2000);
    }
    stage.endEstablishing();
    director.wide(0);
    say('idle');
  }

  // free camera: an orbit around a point, for looking at sets from anywhere
  const free = { on: false, target: new THREE.Vector3(), r: 5, yaw: 0, pitch: 0.2 };
  const cam = renderer.camera;
  function freeCam(on: boolean) {
    if (on === free.on) return;
    free.on = on;
    director.held = on;
    if (on) {
      stage.endEstablishing();
      const dir = cam.getWorldDirection(new THREE.Vector3());
      free.r = 4;
      free.target.copy(cam.position).addScaledVector(dir, free.r);
      free.yaw = Math.atan2(-dir.x, -dir.z);
      free.pitch = Math.asin(THREE.MathUtils.clamp(-dir.y, -1, 1));
      orbit();
    } else director.wide(0);
  }
  function orbit() {
    const cp = Math.cos(free.pitch);
    cam.position.set(free.target.x + Math.sin(free.yaw) * cp * free.r, free.target.y + Math.sin(free.pitch) * free.r, free.target.z + Math.cos(free.yaw) * cp * free.r);
    cam.far = 600;
    cam.updateProjectionMatrix();
    cam.lookAt(free.target);
  }
  const screen = document.getElementById('screen')!;
  let drag: { x: number; y: number; pan: boolean } | null = null;
  screen.addEventListener('contextmenu', (e) => free.on && e.preventDefault());
  screen.addEventListener('pointerdown', (e) => {
    if (!free.on || (e.target as HTMLElement).closest('.pg-mark')) return;
    drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
    screen.setPointerCapture(e.pointerId);
  });
  screen.addEventListener('pointerup', () => (drag = null));
  screen.addEventListener('pointermove', (e) => {
    if (!drag || !free.on) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (drag.pan) {
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const k = free.r * 0.0015;
      free.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
    } else {
      free.yaw -= dx * 0.005;
      free.pitch = THREE.MathUtils.clamp(free.pitch + dy * 0.005, -0.3, 1.5);
    }
    orbit();
  });
  screen.addEventListener('wheel', (e) => {
    if (!free.on) return;
    e.preventDefault();
    if (e.altKey) {
      cam.fov = THREE.MathUtils.clamp(cam.fov * Math.exp(e.deltaY * 0.001), 10, 100);
      cam.updateProjectionMatrix();
    } else free.r = THREE.MathUtils.clamp(free.r * Math.exp(e.deltaY * 0.001), 0.3, 120);
    orbit();
  }, { passive: false });
  const f2 = (n: number) => Number(n.toFixed(2));
  function shotCode() {
    const t = free.on ? free.target : cam.position.clone().addScaledVector(cam.getWorldDirection(new THREE.Vector3()), 4);
    return `{ pos: v3(${f2(cam.position.x)}, ${f2(cam.position.y)}, ${f2(cam.position.z)}), target: v3(${f2(t.x)}, ${f2(t.y)}, ${f2(t.z)}), fov: ${Math.round(cam.fov)} }`;
  }

  // ---------------------------------------------------------------- beats tab

  const chars = () => people();
  const BEAT_FIELDS: Record<BeatType, Field[]> = {
    say: [
      { key: 'character', kind: 'enum', values: chars, required: true }, { key: 'line', kind: 'long', required: true },
      { key: 'to', kind: 'enum', values: chars }, { key: 'emotion', kind: 'enum', values: () => EMOTIONS }, { key: 'gesture', kind: 'enum', values: () => GESTURES },
      { key: 'delivery', kind: 'enum', values: () => DELIVERIES }, { key: 'laugh', kind: 'enum', values: () => LAUGHS }, { key: 'shot', kind: 'enum', values: () => SHOTS },
      { key: 'offscreen', kind: 'enum', values: () => OFFSCREEN }, { key: 'accompanied', kind: 'bool', hint: 'a guitar under a sung line' },
      { key: 'interrupted', kind: 'bool', hint: 'the next beat cuts this line off' }, { key: 'chorus', kind: 'multi', values: castIds },
      { key: 'react', kind: 'json', hint: '[{ "character", "emotion"?, "gesture"? }]' },
    ],
    narrate: [{ key: 'line', kind: 'long', required: true }, { key: 'laugh', kind: 'enum', values: () => LAUGHS }, { key: 'over', kind: 'bool', hint: 'the next beats play while Future Ted talks' }],
    move: [{ key: 'character', kind: 'enum', values: chars, required: true }, { key: 'to', kind: 'enum', values: targets, required: true, hint: 'a mark, or a person to walk over to' }],
    enter: [{ key: 'character', kind: 'enum', values: chars, required: true }, { key: 'to', kind: 'enum', values: targets }],
    exit: [{ key: 'character', kind: 'enum', values: chars, required: true }],
    act: [
      { key: 'character', kind: 'enum', values: chars, required: true }, { key: 'gesture', kind: 'enum', values: () => GESTURES, required: true },
      { key: 'to', kind: 'enum', values: chars }, { key: 'emotion', kind: 'enum', values: () => EMOTIONS }, { key: 'shot', kind: 'enum', values: () => SHOTS },
    ],
    laugh: [{ key: 'laugh', kind: 'enum', values: () => LAUGHS, required: true }],
    pause: [{ key: 'seconds', kind: 'number', required: true }],
    sound: [{ key: 'sound', kind: 'enum', values: () => SOUND_CUES, required: true }],
    score: [{ key: 'music', kind: 'enum', values: () => SCORES, required: true }],
    hold: [{ key: 'character', kind: 'enum', values: chars, required: true }, { key: 'prop', kind: 'enum', values: () => [...PROPS, 'none'], required: true }, { key: 'shot', kind: 'enum', values: () => SHOTS }],
    give: [
      { key: 'character', kind: 'enum', values: chars, required: true }, { key: 'to', kind: 'enum', values: chars, required: true },
      { key: 'prop', kind: 'enum', values: () => PROPS }, { key: 'shot', kind: 'enum', values: () => SHOTS },
    ],
    freeze: [
      { key: 'line', kind: 'long', required: true }, { key: 'character', kind: 'enum', values: castIds }, { key: 'gesture', kind: 'enum', values: () => GESTURES },
      { key: 'to', kind: 'enum', values: castIds }, { key: 'emotion', kind: 'enum', values: () => EMOTIONS }, { key: 'laugh', kind: 'enum', values: () => LAUGHS },
      { key: 'shot', kind: 'enum', values: () => SHOTS }, { key: 'sound', kind: 'enum', values: () => SOUND_CUES },
    ],
    insert: [
      { key: 'kind', kind: 'enum', values: () => INSERT_KINDS, required: true }, { key: 'title', kind: 'text' }, { key: 'character', kind: 'enum', values: chars },
      { key: 'line', kind: 'long' }, { key: 'chart', kind: 'enum', values: () => CHART_STYLES }, { key: 'laugh', kind: 'enum', values: () => LAUGHS },
      { key: 'sound', kind: 'enum', values: () => [...SOUND_CUES, 'none'] }, { key: 'lines', kind: 'json', hint: '["bullet", ...]' },
      { key: 'messages', kind: 'json', hint: '[{ "from", "text" }]' }, { key: 'items', kind: 'json', hint: '[{ "label", "value" }]' }, { key: 'react', kind: 'json' },
    ],
    cutaway: [
      { key: 'id', kind: 'text', hint: 'name it so a replay can show it again' }, { key: 'style', kind: 'enum', values: () => CUTAWAY_STYLES, required: true },
      { key: 'location', kind: 'enum', values: () => SCENE_LOCATION_IDS, required: true }, { key: 'time', kind: 'enum', values: () => ['day', 'night'], required: true },
      { key: 'label', kind: 'text' }, { key: 'look', kind: 'enum', values: () => CUTAWAY_LOOKS }, { key: 'transition', kind: 'enum', values: () => CUTAWAY_TRANSITIONS },
      { key: 'sound', kind: 'enum', values: () => SOUND_CUES }, { key: 'cast', kind: 'json', required: true }, { key: 'wardrobe', kind: 'json' }, { key: 'beats', kind: 'json', required: true },
    ],
    montage: [{ key: 'label', kind: 'text' }, { key: 'music', kind: 'enum', values: () => MONTAGE_MUSIC, required: true }, { key: 'shots', kind: 'json', required: true }],
    replay: [
      { key: 'of', kind: 'text', required: true, hint: 'a cutaway id in the queue, or "playground" for this scene' }, { key: 'style', kind: 'enum', values: () => CUTAWAY_STYLES },
      { key: 'from', kind: 'number' }, { key: 'to', kind: 'number' }, { key: 'label', kind: 'text' }, { key: 'look', kind: 'enum', values: () => CUTAWAY_LOOKS },
      { key: 'transition', kind: 'enum', values: () => CUTAWAY_TRANSITIONS }, { key: 'sound', kind: 'enum', values: () => SOUND_CUES },
      { key: 'add', kind: 'json' }, { key: 'changes', kind: 'json', hint: '[{ "at", "replace"?: [beats], "insert"?: [beats] }]' }, { key: 'wardrobe', kind: 'json' },
    ],
    split: [{ key: 'label', kind: 'text' }, { key: 'sound', kind: 'enum', values: () => SOUND_CUES }, { key: 'panels', kind: 'json', required: true }, { key: 'beats', kind: 'json', required: true }],
  };
  const BEAT_TYPES = Object.keys(BEAT_FIELDS) as BeatType[];

  const insertExample = (kind: InsertKind, a: CharacterId, b: CharacterId): Record<string, unknown> => ({
    text: { character: a, title: charName(b), messages: [{ from: b, text: 'Where are you?' }, { from: a, text: "MacLaren's. Booth." }, { from: b, text: 'Suit up.' }] },
    chart: { character: 'barney', chart: 'bar', title: 'Awesomeness by suit', items: [{ label: 'Gray', value: 7 }, { label: 'Navy', value: 9 }, { label: 'No suit', value: 1 }] },
    slides: { character: 'barney', title: 'Operation Wingman', lines: ['Phase 1: Suit up', 'Phase 2: Have you met Ted?', 'Phase 3: ???'] },
    sign: { title: 'CLOSED', lines: ['for a private event'] },
    playbook: { character: 'barney', title: 'The Lorenzo Von Matterhorn', lines: ['Set up the websites', 'Tell her to Google me', 'Wait for it'] },
  })[kind];

  function template(type: BeatType, prev: Record<string, unknown> = {}): Record<string, unknown> {
    const { a, b } = subjects();
    const there = sceneLocation();
    const markOf = (id: CharacterId) => st.cast.find((c) => c.character === id)?.mark ?? someMark(there);
    const line = (character: CharacterId, text: string): Beat => ({ type: 'say', character, line: text });
    const free = freeMarks(st.location).find((m) => !st.cast.some((c) => c.mark === m)) ?? someMark(st.location, 1);
    switch (type) {
      case 'say': return { character: a, line: 'Wait for it...', to: b };
      case 'narrate': return { line: 'Kids, this is where it gets good.' };
      case 'move': return { character: a, to: free };
      case 'enter': return { character: CHARACTER_IDS.find((id) => !castIds().includes(id) && !isKid(id)) ?? a, to: free };
      case 'exit': return { character: a };
      case 'act': return { character: a, gesture: 'high_five', to: b };
      case 'laugh': return { laugh: 'laugh' };
      case 'pause': return { seconds: 1 };
      case 'sound': return { sound: 'knock' };
      case 'score': return { music: 'upbeat' };
      case 'hold': return { character: a, prop: 'beer' };
      case 'give': return { character: a, to: b, prop: 'envelope' };
      case 'freeze': return { line: 'Kids, this was the moment everything changed.', character: a, gesture: 'jaw_drop' };
      case 'insert': {
        const kind = (INSERT_KINDS as readonly string[]).includes(String(prev.kind)) ? prev.kind as InsertKind : 'text';
        return { kind, ...insertExample(kind, a, b) };
      }
      case 'cutaway': return {
        id: 'pg-cutaway', style: 'imagined', label: `How ${charName(a)} imagined it`, look: 'dream', transition: 'ripple', location: there, time: st.time,
        cast: [{ character: a, mark: markOf(a) }, { character: b, mark: markOf(b) }],
        beats: [line(a, "And then I said the perfect thing."), { type: 'act', character: b, gesture: 'slow_clap' }],
      };
      case 'montage': return {
        label: 'Three weeks of practice', music: 'upbeat',
        shots: (['apartment', 'maclarens', 'rooftop'] as SceneLocationId[]).map((loc, i) => ({
          location: loc, time: i === 2 ? 'night' : 'day', label: `Day ${i * 7 + 1}`, cast: [{ character: a, mark: someMark(loc) }],
          beats: [line(a, ['Okay. Again.', 'Getting there.', 'Nailed it.'][i])],
        })),
      };
      case 'replay': return {
        of: 'pg-cutaway', style: 'flashback', label: 'What really happened', look: 'memory', transition: 'rewind',
        changes: [{ at: 0, replace: [line(a, 'And then I said nothing at all.')] }],
      };
      case 'split': return {
        label: 'Meanwhile', panels: [
          { location: 'apartment', time: st.time, cast: [{ character: a, mark: someMark('apartment') }] },
          { location: 'office', time: st.time, cast: [{ character: b, mark: someMark('office') }] },
        ],
        beats: [{ type: 'hold', character: a, prop: 'phone' }, { type: 'hold', character: b, prop: 'phone' }, line(a, 'Are you there?'), line(b, "I'm here.")],
      };
    }
  }

  const beatOf = (draft: Record<string, unknown>) => ({ ...draft }) as unknown as Beat;
  function summary(b: Beat): string {
    const who = 'character' in b && b.character ? `${charName(b.character)}: ` : '';
    switch (b.type) {
      case 'say': case 'narrate': case 'freeze': return `${b.type} · ${who}${b.line ?? ''}`;
      case 'act': return `act · ${who}${b.gesture}${b.to ? ` → ${b.to}` : ''}`;
      case 'move': case 'enter': return `${b.type} · ${who}${b.to ?? ''}`;
      case 'hold': return `hold · ${who}${b.prop}`;
      case 'give': return `give · ${who}${b.prop ?? 'it'} → ${b.to}`;
      case 'insert': return `insert · ${b.kind}${b.title ? ` "${b.title}"` : ''}`;
      case 'cutaway': return `cutaway · ${b.style} at ${b.location} (${b.beats?.length ?? 0} beats)`;
      case 'montage': return `montage · ${b.shots?.length ?? 0} shots, ${b.music}`;
      case 'replay': return `replay · ${b.of}`;
      case 'split': return `split · ${b.panels?.length ?? 0} panels`;
      case 'laugh': return `laugh · ${b.laugh}`;
      case 'pause': return `pause · ${b.seconds}s`;
      case 'sound': return `sound · ${b.sound}`;
      case 'score': return `score · ${b.music}`;
      case 'exit': return `exit · ${who}`;
    }
  }

  /** What the checker says about the queue as one scene of an episode: can a writer actually write this? */
  function issues(): Report {
    return validateEpisode(episode(), stage.sets);
  }
  type Report = { errors: Issue[]; warnings: Issue[] };
  function reportList(r: Report, empty = 'The checker accepts it.') {
    if (!r.errors.length && !r.warnings.length) return h('div', { class: 'pg-ok', textContent: `✓ ${empty}` });
    return h('ul', { class: 'pg-issues' },
      ...r.errors.map((i) => h('li', { class: 'err', textContent: `${i.path}: ${i.message}` })),
      ...r.warnings.map((i) => h('li', { class: 'warn', textContent: `${i.path}: ${i.message}` })));
  }

  function beatsTab() {
    const out = h('div');
    const type = String(st.draft.type ?? 'say') as BeatType;
    const draft = { ...st.draft };
    delete draft.type;
    const json = h('textarea', { class: 'pg-json', rows: 6, spellcheck: false });
    const sync = () => {
      st.draft = { type, ...draft };
      json.value = JSON.stringify(st.draft, null, 1);
      json.classList.remove('bad');
      save();
    };
    json.oninput = () => {
      try {
        const parsed = JSON.parse(json.value);
        st.draft = parsed;
        json.classList.remove('bad');
        save();
      } catch {
        json.classList.add('bad');
      }
    };
    out.append(pair(), h('div', { class: 'pg-grid' },
      row('beat', select(BEAT_TYPES, type, (v) => { st.draft = { type: v, ...template(v as BeatType) }; save(); render(); })),
      h('div', { class: 'pg-buttons' }, button('template', () => { st.draft = { type, ...template(type, draft) }; save(); render(); }, 'Fill in an example for this beat (inserts: for the kind picked)')),
    ));
    out.append(form(BEAT_FIELDS[type], draft, sync));
    sync();
    out.append(h('details', { class: 'pg-card' }, h('summary', { textContent: 'JSON (edit freely: this is what plays)' }), json));
    const queued = st.queue.length;
    out.append(h('div', { class: 'pg-buttons' },
      button('▶ play here', () => void performHere([beatOf(st.draft)], st.queue), 'Play this beat in the scene as it stands now', 'primary'),
      button('+ queue', () => { st.queue.push(beatOf(st.draft)); save(); render(); }),
    ));

    // the queue
    const list = h('ol', { class: 'pg-queue' });
    st.queue.forEach((b, i) => {
      const move = (d: number) => { const [x] = st.queue.splice(i, 1); st.queue.splice(Math.max(0, i + d), 0, x); save(); render(); };
      list.append(h('li', {},
        h('span', { textContent: summary(b), title: JSON.stringify(b, null, 1), onclick: () => { st.draft = { ...b }; save(); render(); } }),
        button('▶', () => void performHere([b], st.queue.slice(0, i)), 'Play just this beat'),
        button('▲', () => move(-1)), button('▼', () => move(1)),
        button('✕', () => { st.queue.splice(i, 1); save(); render(); }),
      ));
    });
    out.append(h('h4', { textContent: `Queue · ${queued}` }), queued ? list : note('Queue beats to play them in a row, as a scene, or as an episode.'));
    out.append(h('div', { class: 'pg-grid' },
      row('transition', select(TRANSITIONS, st.scene.transition, (v) => { st.scene.transition = (v || undefined) as Transition; save(); }, { blank: 'auto' })),
      row('sound', select([...SOUND_CUES, 'none'], st.scene.sound, (v) => { st.scene.sound = (v || undefined) as SoundCue; save(); }, { blank: 'automatic' })),
      row('label', h('input', { type: 'text', value: st.scene.label ?? '', placeholder: 'Meanwhile…', oninput: (e: Event) => {
        st.scene.label = (e.target as HTMLInputElement).value || undefined;
        save();
      } })),
    ));
    out.append(h('div', { class: 'pg-buttons' },
      button('▶ play queue here', () => void performHere(st.queue), 'Play the queue in the scene as it stands now', 'primary'),
      button('▶ as a scene', () => { stage.castGuests(st.guests); void air(sceneItems(episode()), 'the queue as a scene', st.guests); }, 'Restage and play it as a scene, with its transition, label and sound'),
      button('▶ as an episode', () => void air(episodeItems(resolveStrands(episode()), `playground-${++aired}`), 'the queue as an episode'), 'With the main titles and closing credits'),
      button('to script', () => { st.script = JSON.stringify(episode(), null, 2); st.tab = 'script'; save(); render(); }),
      button('clear', () => { st.queue = []; save(); render(); }),
    ));
    out.append(h('h4', { textContent: 'Checker' }), reportList(issues()));
    return out;
  }

  // ---------------------------------------------------------------- sweeps tab

  const SWEEPS: { name: string; hint: string; beats?: () => Beat[]; run?: () => Promise<void> }[] = [
    { name: 'Camera angles', hint: 'Every angle on this set, 2 s each', run: sweepAngles },
    { name: 'Emotions', hint: 'A on each of the 19 emotions, in close-up', beats: () => EMOTIONS.map((e) => ({ type: 'say', character: st.a, line: `${e}.`, emotion: e, shot: 'closeup' })) },
    { name: 'Gestures', hint: 'A does every gesture to B', beats: () => GESTURES.flatMap((g): Beat[] => [{ type: 'act', character: st.a, gesture: g, to: st.b }, { type: 'pause', seconds: 0.4 }]) },
    { name: 'Paired gestures', hint: 'High five, hug, slap, kiss, fist bump between A and B', beats: () => PAIRED_GESTURES.flatMap((g): Beat[] => [{ type: 'act', character: st.a, gesture: g, to: st.b, shot: 'two' }, { type: 'pause', seconds: 0.5 }]) },
    { name: 'Props', hint: 'A holds every prop, then hands the last one to B', beats: () => [...PROPS.flatMap((p): Beat[] => [{ type: 'hold', character: st.a, prop: p, shot: 'closeup' }, { type: 'pause', seconds: 0.9 }]), { type: 'give', character: st.a, to: st.b }] },
    { name: 'Deliveries', hint: 'Whisper, shout, sing, deadpan, fast, slow', beats: () => DELIVERIES.map((d) => ({ type: 'say', character: st.a, line: `This is how I say it: ${d}.`, delivery: d, to: st.b })) },
    { name: 'Shot intents', hint: 'A line under each camera intent', beats: () => SHOTS.map((s): Beat => ({ type: 'say', character: st.a, line: `Shot: ${s}.`, shot: s, to: st.b })) },
    { name: 'Lines', hint: 'Reactions, a chorus, an interrupted line, offscreen phone and voice, a sung line', beats: () => [
      { type: 'say', character: st.a, line: "I'm moving to Chicago.", to: st.b, react: castIds().filter((id) => id !== st.a).map((id, i) => ({ character: id, emotion: (['surprised', 'sad', 'angry', 'confused'] as const)[i % 4], gesture: i === 0 ? 'jaw_drop' : undefined })) },
      { type: 'say', character: st.b, line: 'What?!', chorus: castIds().filter((id) => id !== st.a && id !== st.b) },
      { type: 'say', character: st.a, line: 'Okay, so here is the thing, I was going to tell you all', interrupted: true },
      { type: 'say', character: st.b, line: 'Nope.', delivery: 'deadpan' },
      { type: 'say', character: 'ranjit', line: 'I am outside. Your chariot awaits.', offscreen: 'phone' },
      { type: 'say', character: 'lily', line: 'I can hear you from the kitchen!', offscreen: 'voice' },
      { type: 'say', character: st.a, line: 'Let\'s go to the mall, today!', delivery: 'sing', accompanied: true },
    ] },
    { name: 'Laughs', hint: 'Every laugh-track response', beats: () => LAUGHS.flatMap((l): Beat[] => [{ type: 'laugh', laugh: l }, { type: 'pause', seconds: 0.4 }]) },
    { name: 'Sound cues', hint: 'Every placed sound', beats: () => SOUND_CUES.flatMap((s): Beat[] => [{ type: 'sound', sound: s }, { type: 'pause', seconds: 1.2 }]) },
    { name: 'Score', hint: 'Each music bed, then none, then silence', beats: () => SCORES.flatMap((m): Beat[] => [{ type: 'score', music: m }, { type: 'pause', seconds: 3 }]) },
    { name: 'Inserts', hint: 'A text thread, a chart in each style, slides, a sign, the Playbook', beats: () => [
      ...INSERT_KINDS.map((k) => ({ type: 'insert', kind: k, ...insertExample(k, st.a, st.b) }) as Beat),
      ...CHART_STYLES.filter((c) => c !== 'bar').map((c) => ({ type: 'insert', ...insertExample('chart', st.a, st.b), chart: c }) as Beat),
    ] },
    { name: 'Narration', hint: 'Future Ted: a plain line, a voice-over under action, a freeze frame', beats: () => [
      { type: 'narrate', line: 'Kids, some nights are legendary.' },
      { type: 'narrate', line: 'And this was not one of them, because about two seconds later...', over: true },
      { type: 'act', character: st.a, gesture: 'spit_take' },
      { type: 'freeze', line: 'This is what a man looks like right before he learns something.', character: st.b, gesture: 'jaw_drop', sound: 'scratch' },
    ] },
    { name: 'Cutaway looks', hint: 'Every look × every transition, styles cycling', beats: () => CUTAWAY_LOOKS.flatMap((look, i) => CUTAWAY_TRANSITIONS.map((transition, j): Beat => {
      const loc = sceneLocation();
      return {
        type: 'cutaway', style: CUTAWAY_STYLES[(i * 4 + j) % CUTAWAY_STYLES.length], look, transition, label: `${look} · ${transition}`, location: loc, time: st.time,
        cast: [{ character: st.a, mark: st.cast.find((c) => c.character === st.a)?.mark ?? someMark(loc) }],
        beats: [{ type: 'say', character: st.a, line: `This is the ${look} look, in on a ${transition}.` }],
      };
    })) },
    { name: 'Cutaway, nested + replay', hint: 'A cutaway inside a cutaway, then a replay of it with a change', beats: () => {
      const loc = sceneLocation();
      const inner: Beat = { type: 'cutaway', id: 'pg-inner', style: 'flashback', look: 'memory', label: 'Three years earlier', location: 'wesleyan_dorm', time: 'night',
        cast: [{ character: st.b, mark: someMark('wesleyan_dorm') }], beats: [{ type: 'say', character: st.b, line: 'This is a memory inside a story.' }] };
      return [
        { type: 'cutaway', id: 'pg-outer', style: 'imagined', look: 'dream', transition: 'ripple', label: 'The story', location: 'apartment', time: 'day',
          cast: [{ character: st.a, mark: someMark('apartment') }], beats: [{ type: 'say', character: st.a, line: 'So I remembered something.' }, inner] },
        { type: 'replay', of: 'pg-inner', style: 'misremembered', label: 'What really happened', transition: 'rewind', sound: 'rewind',
          changes: [{ at: 0, replace: [{ type: 'say', character: st.b, line: 'Fine. It was a little different.' }] }] },
        { type: 'replay', of: 'playground', label: 'Previously', look: 'video', to: 0, add: [{ character: 'barney', mark: someMark(loc, 3) }] },
      ];
    } },
    { name: 'Montage', hint: 'Montages over each music bed', beats: () => MONTAGE_MUSIC.map((music) => ({ ...template('montage'), type: 'montage', music, label: `Montage · ${music}` }) as Beat) },
    { name: 'Split screens', hint: 'A two-way phone call, then a three-way split', beats: () => [
      { type: 'split', ...template('split') } as Beat,
      { type: 'split', label: 'Three places at once', panels: (['apartment', 'barneys', 'office'] as SceneLocationId[]).map((loc, i) => ({ location: loc, time: st.time, cast: [{ character: [st.a, st.b, 'lily' as CharacterId][i], mark: someMark(loc) }] })),
        beats: [{ type: 'say', character: st.a, line: 'One.' }, { type: 'say', character: st.b, line: 'Two.' }, { type: 'say', character: 'lily', line: 'Three.' }] },
    ] },
    { name: 'The kids', hint: 'Penny and Luke chime in from 2030, Future Ted answers', beats: () => [
      { type: 'say', character: st.a, line: 'And that is the whole story.' },
      { type: 'say', character: 'penny', line: 'Dad, that is not the whole story.' },
      { type: 'say', character: 'luke', line: 'Is this going to take long?', emotion: 'bored' },
      { type: 'narrate', line: 'Fine. It took a little longer.' },
      { type: 'say', character: st.b, line: 'And we are back.' },
    ] },
    { name: 'Walk every mark', hint: 'A walks to every mark on the set (vehicles: slides between seats)', beats: () => marksOf().filter((m) => !st.cast.some((c) => c.mark === m && c.character !== st.a))
      .flatMap((m): Beat[] => [{ type: 'move', character: st.a, to: m }, { type: 'pause', seconds: 0.5 }]) },
    { name: 'Exit & enter', hint: 'A leaves through the door and comes back; someone new walks in', beats: () => [
      { type: 'exit', character: st.a }, { type: 'pause', seconds: 0.6 }, { type: 'enter', character: st.a, to: st.cast.find((c) => c.character === st.a)?.mark },
      { type: 'enter', character: (['ranjit', 'carl', 'wendy'] as CharacterId[]).find((id) => !castIds().includes(id)) ?? 'ranjit', to: st.a },
    ] },
    { name: 'Every character', hint: 'Each recurring character in turn, in close-up, saying their name', run: () => parade() },
    { name: 'Work clothes', hint: 'Everyone with work clothes, casual then work', run: () => parade(true) },
    { name: 'Every location', hint: 'The gang at every set, day and night, every wide', run: () => tour() },
  ];

  /** One character at a time on A's mark: every model, or everyone's casual and work clothes. */
  async function parade(work = false) {
    await stop();
    const run = generation;
    const mark = st.cast.find((c) => c.character === st.a)?.mark ?? someMark(st.location);
    const ids = CHARACTER_IDS.filter((id) => !isKid(id) && (!work || CHARACTERS[id].work));
    for (const id of ids) {
      for (const outfit of work ? (['casual', 'work'] as const) : [undefined]) {
        if (run !== generation) return;
        player.stageNow({ ...scene([]), cast: [{ character: id, mark, ...(outfit ? { outfit } : {}) }] });
        director.closeup(id);
        say(`${charName(id)} (${id})${outfit ? ` · ${outfit}` : ''}`);
        await player.perform([{ type: 'say', character: id, line: `I'm ${charName(id)}.`, shot: 'closeup' }]);
        if (run !== generation) return;
      }
    }
    void restage();
  }
  async function tour() {
    await stop();
    const run = generation;
    for (const loc of LOCATION_IDS) {
      for (const time of ['day', 'night'] as const) {
        if (run !== generation) return;
        const cast = (loc === 'future' ? [] : GANG).map((id, i) => ({ character: id, mark: someMark(loc, i) }));
        player.stageNow({ id: 'playground', location: loc, time, cast, beats: [] });
        for (const [i, w] of stage.current.wides.entries()) {
          if (run !== generation) return;
          director.wide(i);
          say(`${stage.current.name} · ${time} · ${w.label ?? `wide ${i}`}`);
          await sleep(1400);
        }
      }
    }
    void restage();
  }

  function sweepsTab() {
    return h('div', {}, pair(), note('Sweeps play through the real player in the scene as staged. Stop or restage at any time.'),
      h('div', { class: 'pg-sweeps' }, ...SWEEPS.map((s) => h('div', { class: 'pg-sweep' },
        button(`▶ ${s.name}`, () => { if (s.run) void s.run(); else void performHere(s.beats!()); }, s.hint),
        h('span', { textContent: s.hint }),
        s.beats ? button('queue', () => { st.queue.push(...s.beats!()); save(); say(`queued ${s.name}`); }, 'Add these beats to the queue to edit them') : null,
      ))));
  }

  // ---------------------------------------------------------------- script tab

  function scriptTab() {
    const out = h('div');
    const area = h('textarea', { class: 'pg-json pg-script', rows: 18, spellcheck: false, value: st.script || JSON.stringify(episode(), null, 2) });
    const report = h('div');
    const parse = (): EpisodeScript | null => {
      try {
        return JSON.parse(area.value) as EpisodeScript;
      } catch (e) {
        report.replaceChildren(h('div', { class: 'pg-issues err', textContent: `Not JSON: ${(e as Error).message}` }));
        return null;
      }
    };
    const check = () => {
      const ep = parse();
      if (ep) report.replaceChildren(reportList(validateEpisode(ep, stage.sets), 'bun run episodes check would accept this.'));
      return ep;
    };
    area.oninput = () => { st.script = area.value; save(); };
    const scenes = h('select');
    const fillScenes = () => {
      const ep = parse();
      scenes.replaceChildren(...(ep?.scenes ?? []).map((s, i) => h('option', { value: String(i), textContent: `${i + 1} · ${s.location ?? s.resume} · ${s.summary ?? s.label ?? ''}`.slice(0, 60) })));
    };
    out.append(
      h('div', { class: 'pg-buttons' },
        select(EPISODES.map((e) => e.code), undefined, (code) => {
          const ep = EPISODES.find((e) => e.code === code);
          if (!ep) return;
          area.value = st.script = JSON.stringify(ep, null, 2);
          save();
          fillScenes();
          check();
        }, { blank: 'load an episode…', label: (c) => `${c} · ${EPISODES.find((e) => e.code === c)?.title}` }),
        button('from playground', () => { area.value = st.script = JSON.stringify(episode(), null, 2); save(); fillScenes(); check(); }, 'The Stage tab and the queue, as an episode'),
        button('check', () => void check(), 'Run the episode checker (same as bun run episodes check)'),
      ),
      area,
      h('div', { class: 'pg-buttons' },
        button('▶ whole episode', () => { const ep = check(); if (ep) void air(episodeItems(ep, `playground-${++aired}`), ep.code); }, 'Couch, titles, every scene, credits', 'primary'),
        scenes,
        button('▶ from this scene', () => {
          const ep = check();
          if (ep) void air(sceneItems(ep, Number(scenes.value) || 0), `${ep.code} from scene ${(Number(scenes.value) || 0) + 1}`, ep.guests);
        }, 'Just the scenes, from the one picked: no couch, titles or credits'),
      ),
      h('div', { class: 'pg-buttons' },
        button('▶ main titles', () => void air([{ kind: 'episode-start', episode: { id: `playground-${++aired}`, code: 'S99E99', title: 'Playground', logline: '' } }], 'the main titles'), 'The six-photo title sequence on its own'),
        button('▶ closing credits', () => void air([{ kind: 'episode-end', episode: { id: `playground-${++aired}`, code: 'S99E99', title: 'Playground', logline: '' } }], 'the closing credits')),
        button('▶ couch cold open', () => void air([{ kind: 'episode-start', episode: { id: `playground-${++aired}`, code: 'S99E99', title: 'Playground', logline: '' },
          coldOpen: 'Kids, I want to tell you about the playground.',
          couch: [{ type: 'say', character: 'penny', line: 'Is this another architecture story?' }, { type: 'narrate', line: 'No. Well. Partly.' }, { type: 'say', character: 'luke', line: 'Ugh.', emotion: 'bored' }] }], 'a couch cold open')),
      ),
      h('h4', { textContent: 'Checker' }), report,
    );
    fillScenes();
    check();
    return out;
  }

  // ---------------------------------------------------------------- marks and the walk graph, drawn over the picture

  const layer = h('div', { class: 'pg-layer' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  layer.append(svg);
  screen.append(layer);
  const tags = new Map<string, HTMLElement>();
  const project = (p: THREE.Vector3) => {
    const v = p.clone().project(cam);
    return v.z > 1 || v.z < -1 ? null : { x: (v.x + 1) * 50, y: (1 - v.y) * 50 };
  };
  layer.addEventListener('click', (e) => {
    const m = (e.target as HTMLElement).closest<HTMLElement>('.pg-mark')?.dataset.mark;
    if (!m) return;
    const { a } = subjects();
    if (e.shiftKey) {
      const taken = st.cast.find((c) => c.mark === m && c.character !== a);
      const mine = st.cast.find((c) => c.character === a);
      if (taken && mine) taken.mark = mine.mark;
      if (mine) mine.mark = m;
      void restage().then(render);
    } else void performHere([{ type: 'move', character: a, to: m }]);
  });
  function draw() {
    requestAnimationFrame(draw);
    if (st.tab === 'camera') {
      const shot = director.current;
      camInfo.textContent = `${free.on ? 'free camera' : shot?.kind ?? '—'}${shot?.subject ? ` on ${shot.subject}` : ''}\n${shotCode()}`;
    }
    const s = stage.current;
    const show = (st.marks || st.nav) && s.id === st.location;
    layer.classList.toggle('hidden', !show);
    if (!show) return;
    cam.updateMatrixWorld();
    const seen = new Set<string>();
    if (st.marks) {
      for (const [name, m] of Object.entries(s.marks)) {
        const p = project(m.pos.clone().setY((m.seat ?? 0) + 0.02));
        if (!p || p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) continue;
        const key = `${s.id}:${name}`;
        seen.add(key);
        let el = tags.get(key);
        if (!el) {
          el = h('div', { class: `pg-mark${m.seat !== null ? ' seat' : ''}${name === s.door ? ' door' : ''}`, title: m.hint, data: { mark: name } }, h('i'), name);
          tags.set(key, el);
          layer.append(el);
        }
        el.style.left = `${p.x}%`;
        el.style.top = `${p.y}%`;
      }
    }
    for (const [key, el] of tags) el.classList.toggle('hidden', !seen.has(key));
    if (st.nav) {
      const pts = Object.fromEntries(Object.entries(s.nodes).map(([k, v]) => [k, project(v)]));
      const lines = s.edges.flatMap(([x, y]) => (pts[x] && pts[y] ? [`M${pts[x]!.x},${pts[x]!.y}L${pts[y]!.x},${pts[y]!.y}`] : [])).join('');
      const dots = Object.values(pts).flatMap((p) => (p ? [`M${p.x - 0.3},${p.y}a0.3,0.3 0 1,0 0.6,0a0.3,0.3 0 1,0 -0.6,0`] : [])).join('');
      svg.innerHTML = `<path d="${lines}" class="edge"/><path d="${dots}" class="node"/>`;
    } else svg.innerHTML = '';
  }

  render();
  void restage();
  requestAnimationFrame(draw);
}
