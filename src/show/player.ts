import type { Stage } from './stage';
import type { Director } from './director';
import type { Renderer } from '../engine/renderer';
import type { Overlay, Panel } from '../ui/overlay';
import { audio } from '../audio/audio';
import { speech, deliveryRate, estimateDuration } from '../audio/speech';
import { CHARACTERS, FUTURE_TED_VOICE, charName } from '../world/characters';
import {
  CHARACTER_IDS, KIDS, PAIRED_GESTURES, isKid,
  type Beat, type CharacterId, type Costume, type CutawayBeat, type CutawayStyle, type Emotion, type FreezeBeat, type Gesture, type InsertBeat, type LaughKind,
  type MontageBeat, type Reaction, type Scene, type ShowItem,
} from '../script/types';
import { GRIP, PROP_NAME } from '../world/props';
import { sleep, clamp, pick, rand } from '../util';
import { lipTrack } from '../world/lipsync';
import { gestureDuration, impliedEmotion } from '../world/actor';
import { sceneTransition } from './transitions';
import { BURSTS, GANG, HUDDLE_AT, TITLE_TAIL, type Burst } from './mainTitles';
import { openingCredits, closingCredits, type CreditCard } from './credits';

export interface ContentSource {
  next(onWaiting: (msg: string) => void): Promise<ShowItem>;
}

class Skip extends Error {}

const isChar = (s: string | undefined): s is CharacterId => !!s && (CHARACTER_IDS as readonly string[]).includes(s);
/** Lines and reactions from Penny or Luke: these happen on the couch in 2030. */
const isKidBeat = (b: Beat) => (b.type === 'say' || b.type === 'act') && isKid(b.character);

/** Everyone a beat puts on stage: the speaker and whoever says it with them or reacts, both ends of a hand-off. */
function participants(b: Beat): string[] {
  switch (b.type) {
    case 'say': return [b.character, ...(b.chorus ?? []), ...(b.react ?? []).map((r) => r.character)];
    case 'give': return [b.character, b.to];
    case 'insert': return (b.react ?? []).map((r) => r.character);
    case 'act': case 'hold': case 'move': case 'exit': return [b.character];
    case 'freeze': return b.character ? [b.character] : [];
    default: return [];
  }
}

/** The episode's costumes with the scene's over them. */
function mergeWardrobe(episode: Costume[] = [], scene: Costume[] = []): Costume[] {
  const out = new Map(episode.map((c) => [c.character, c]));
  for (const c of scene) {
    const ep = out.get(c.character);
    out.set(c.character, ep ? { ...ep, ...c, extras: [...new Set([...(ep.extras ?? []), ...(c.extras ?? [])])] } : c);
  }
  return [...out.values()];
}

/** Plays show items: main titles, scenes beat by beat, closing credits. */
export class Player {
  paused = false;
  private skipLevel: 'none' | 'scene' | 'episode' = 'none';
  private skipWaiters: (() => void)[] = [];
  private currentEpisode: string | null = null;
  private previousScene: Scene | null = null;
  /** This episode's costumes, worn in every scene. */
  private episodeWardrobe: Costume[] = [];
  /** Opening credits still to show over the first scenes of this episode. */
  private credits: CreditCard[] = [];
  private billing: ReturnType<typeof openingCredits> | null = null;
  private rollingCredits = false;
  /** Items played so far (the last one is on screen), so dev mode can step back through them. */
  private history: ShowItem[] = [];
  /** Played items queued again by back(), ahead of anything new from the source. */
  private rewound: ShowItem[] = [];
  private fetching: Promise<ShowItem> | null = null;
  private wake: (() => void) | null = null;
  private playing = false;
  onItem: ((item: ShowItem) => void) | null = null;

  constructor(
    private stage: Stage,
    private director: Director,
    private renderer: Renderer,
    private overlay: Overlay,
    private panel: Panel,
    private source: ContentSource,
  ) {}

  skip(level: 'scene' | 'episode') {
    this.skipLevel = level;
    speech.cancel();
    this.skipWaiters.splice(0).forEach((f) => f());
  }

  /** Replay the previous scene, or the previous episode from its cold open (the current one if it is the first). */
  back(level: 'scene' | 'episode') {
    const h = this.history;
    if (!h.length) return;
    // While waiting on the writers, the last item has finished: stepping back replays it.
    const current = this.playing ? h.length - 1 : h.length;
    const episodeStart = (i: number) => {
      while (i > 0 && h[i - 1].episode.id === h[i].episode.id) i--;
      return i;
    };
    let to = Math.max(0, current - 1);
    if (level === 'episode') {
      const start = episodeStart(Math.min(current, h.length - 1));
      to = start > 0 ? episodeStart(start - 1) : 0;
    }
    this.rewound.unshift(...h.splice(to));
    this.skip('scene');
    this.wake?.();
  }

  /** Cut away from what's on screen and air whatever the source brings next (after it has been re-cued). */
  cue() {
    this.rewound = [];
    this.fetching = null;
    this.skip('scene');
    this.wake?.();
  }

  private async nextItem(): Promise<ShowItem> {
    for (;;) {
      if (this.rewound.length) return this.rewound.shift()!;
      // Keep a pending fetch across a back() so the item it brings is not lost.
      const fetching = (this.fetching ??= this.source.next((msg) => this.overlay.standby(true, msg)));
      const item = await Promise.race([fetching, new Promise<null>((r) => (this.wake = () => r(null)))]);
      this.wake = null;
      if (item) {
        this.fetching = null;
        return item;
      }
    }
  }

  /** Playback time freezes on pause; all waits and fades abort on skip. */
  private wait(seconds: number) {
    return this.animate(seconds, () => {});
  }

  private async animate(seconds: number, update: (progress: number) => void) {
    await this.untilUnpaused();
    let elapsed = 0;
    let last = performance.now();
    update(0);
    while (elapsed < seconds) {
      await this.race(sleep(16));
      const now = performance.now();
      if (!this.paused) {
        elapsed += (now - last) / 1000;
        update(clamp(elapsed / seconds, 0, 1));
      }
      last = now;
    }
  }

  private race<T>(p: Promise<T>): Promise<T> {
    if (this.skipLevel !== 'none') return Promise.reject(new Skip());
    return new Promise<T>((resolve, reject) => {
      const onSkip = () => reject(new Skip());
      this.skipWaiters.push(onSkip);
      p.then(
        (v) => {
          this.skipWaiters = this.skipWaiters.filter((f) => f !== onSkip);
          resolve(v);
        },
        (e) => {
          this.skipWaiters = this.skipWaiters.filter((f) => f !== onSkip);
          reject(e);
        },
      );
    });
  }

  private async untilUnpaused() {
    if (this.skipLevel !== 'none') throw new Skip();
    while (this.paused) await this.race(sleep(50));
  }

  async run() {
    for (;;) {
      const item = await this.nextItem();
      this.overlay.standby(false);
      // skipping an episode drops the rest of its items
      if (this.skipLevel === 'episode' && 'episode' in item && item.episode.id === this.currentEpisode) {
        if (item.kind === 'episode-end') this.skipLevel = 'none';
        continue;
      }
      this.skipLevel = 'none';
      this.history.push(item);
      if (this.history.length > 400) this.history.splice(0, 100);
      this.onItem?.(item);
      this.playing = true;
      try {
        await this.untilUnpaused();
        await this.play(item);
      } catch (e) {
        if (!(e instanceof Skip)) console.error(e);
        this.cleanup();
        // (re-read: skip() may have changed it while we were awaiting)
        if ((this.skipLevel as string) === 'scene') this.skipLevel = 'none';
      } finally {
        this.playing = false;
      }
    }
  }

  /** The cold open cuts to six still photographs: the name early, creators on the last group portrait. */
  private async mainTitles() {
    const st = this.stage, r = this.renderer;
    const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.overlay.hideCaption();
    this.overlay.hideLocation();
    this.overlay.year(false);
    audio.ambience('none');
    const credits = this.billing ??= openingCredits();
    this.credits = credits.cast;
    try {
      st.setLocation('maclarens', 'night');
      for (const bg of st.current.background) {
        st.place(bg.character, bg.mark);
        st.setBackground(bg.character, true);
      }
      r.fade = 1;
      r.snap = 1;
      r.trail = 0;
      // Capture each pose once. Reframing the resulting print cannot introduce live animation or ghost faces.
      const photos = BURSTS.map((burst) => {
        this.burst(burst);
        return r.photo(1280);
      });
      const { beat } = audio.theme();
      const total = BURSTS.reduce((n, b) => n + b.beats * beat, 0) + TITLE_TAIL;
      let current = -1;
      await this.animate(total, (u) => {
        const elapsed = u * total;
        let index = 0, start = 0;
        while (index < BURSTS.length - 1 && elapsed >= start + BURSTS[index].beats * beat) {
          start += BURSTS[index++].beats * beat;
        }
        const burst = BURSTS[index];
        const duration = burst.beats * beat + (index === BURSTS.length - 1 ? TITLE_TAIL : 0);
        if (index !== current) {
          this.overlay.showTitle(photos[index], burst.card === 'name');
          this.overlay.credit(burst.card === 'creators' ? credits.creators : null, 'creators');
          current = index;
        }
        this.overlay.moveTitle(clamp((elapsed - start) / duration, 0, 1), burst, reducedMotion,
          index > 0 ? Math.max(0, 1 - (elapsed - start) / 0.12) : 0);
      });
    } finally {
      st.strobe = 0;
      r.snap = r.trail = 0;
      this.overlay.showTitle(null);
      this.overlay.credit(null);
      for (const id of GANG) st.actors[id].talking = false;
      audio.stopSting();
    }
  }

  /** Stage a candid photograph with space between faces and deliberately held expressions. */
  private burst(b: Burst) {
    const st = this.stage, d = this.director;
    for (const id of GANG) {
      const at = b.layout[id];
      if (!at) { st.actors[id].root.visible = false; continue; }
      st.stand(id, HUDDLE_AT[0] + at[0], HUDDLE_AT[1] + at[1], 0);
    }
    d.selfie(b.who.map((id) => st.actors[id].headWorld), b);
    const lens = d.current!.pos;
    for (const [i, id] of b.who.entries()) {
      const a = st.actors[id];
      a.faceTowards(lens, 0);
      a.facing = a.targetFacing;
      a.setEmotion(id === 'barney' ? 'smug' : 'happy');
      a.talking = id !== 'barney';
      a.talkLevel = 0.7;
      // Turn a little toward a friend while keeping three-quarter faces readable.
      a.lookAt = b.looks?.[id] ? lens.clone().lerp(st.actors[b.looks[id]!].headWorld, 0.55) : lens.clone();
      a.onGestureBeat = null;
      const move = b.moves.find(([who]) => who === id);
      if (move) a.doGesture(move[1]);
      a.update(0.32, 1.1 + i * 0.37, true);
      a.root.updateWorldMatrix(true, true);
    }
  }

  /** Cast and creators, one card at a time, over the first scenes (never on the 2030 couch). */
  private async rollCredits() {
    if (this.rollingCredits || !this.credits.length) return;
    this.rollingCredits = true;
    try {
      await this.wait(1.2);
      while (this.credits.length) {
        if (!this.stage.inCutaway && this.stage.current.id !== 'future') this.overlay.credit(this.credits.shift()!, 'cast');
        await this.wait(3);
      }
    } catch {
      // skipped: the next scene picks up where we left off
    } finally {
      this.rollingCredits = false;
    }
  }

  /** Brief, static crew cards on black, cut to the theme reprise with the playback clock. */
  private async endCredits() {
    this.credits = [];
    this.overlay.hideCaption();
    this.overlay.hideLocation();
    this.overlay.hideCards();
    this.overlay.year(false);
    audio.ambience('none');
    this.renderer.fade = 0;
    const pages = closingCredits((this.billing ?? openingCredits()).creators);
    try {
      const { duration } = audio.theme();
      let current = -1;
      await this.animate(duration, (u) => {
        const index = Math.min(pages.length - 1, Math.floor(u * pages.length));
        if (index !== current) {
          this.overlay.closingCredit(pages[index]);
          current = index;
        }
      });
    } finally {
      this.overlay.closingCredit(null);
      audio.stopSting();
    }
  }

  private cleanup() {
    speech.cancel();
    this.overlay.hideCaption();
    this.overlay.hideCards();
    this.overlay.insert(null);
    this.overlay.year(false);
    this.renderer.fade = 1;
    this.renderer.rewind = 0;
    this.renderer.dream = this.renderer.ripple = this.renderer.memory = this.renderer.still = 0;
    this.stage.frozen = this.director.held = false;
    audio.stopSting();
    audio.stopBed(0.05);
    for (const a of Object.values(this.stage.actors)) a.talking = false;
  }

  private async fade(to: number, seconds: number) {
    const from = this.renderer.fade;
    await this.animate(seconds, (u) => { this.renderer.fade = from + (to - from) * u; });
  }

  private async play(item: ShowItem) {
    switch (item.kind) {
      case 'episode-start': {
        // The script chooses a couch exchange or a story scene before the titles.
        this.currentEpisode = item.episode.id;
        this.previousScene = null;
        this.billing = openingCredits();
        this.credits = [];
        this.panel.line('sep', `${item.episode.code} — ${item.episode.title}`);
        this.stage.castGuests(item.guests);
        for (const g of item.guests ?? []) this.panel.line('stage', `Guest star: ${g.name}${g.role ? ` (${g.role})` : ''}.`);
        // the titles show everyone in their usual clothes; the costumes go on in the first scene
        this.episodeWardrobe = item.wardrobe ?? [];
        this.stage.setWardrobe([]);
        if (item.openingScene) {
          this.stage.setWardrobe(mergeWardrobe(this.episodeWardrobe, item.openingScene.wardrobe));
          await this.playScene(item.openingScene, 0);
        } else if (item.coldOpen || item.couch?.length) {
          this.stage.setLocation('future', 'night');
          this.stage.seatKids();
          this.director.wide(0);
          audio.ambience('none');
          this.renderer.fade = 0;
          await this.fade(1, 0.6);
          this.overlay.year(true);
          await this.wait(0.8);
          if (item.coldOpen) await this.narrate(item.coldOpen);
          for (const b of item.couch ?? []) {
            await this.untilUnpaused();
            await this.beat(b);
          }
          await this.wait(0.3);
        }
        this.stage.setWardrobe([]);
        await this.mainTitles();
        break;
      }
      case 'scene':
        if (item.episode.id !== this.currentEpisode) {
          // Stepped back into an earlier episode past its cold open: bring back its guest stars.
          const start = [...this.history].reverse().find((i) => i.kind === 'episode-start' && i.episode.id === item.episode.id);
          if (start?.kind === 'episode-start') this.stage.castGuests(start.guests);
          this.episodeWardrobe = start?.kind === 'episode-start' ? start.wardrobe ?? [] : [];
          this.currentEpisode = item.episode.id;
        }
        this.stage.setWardrobe(mergeWardrobe(this.episodeWardrobe, item.scene.wardrobe));
        await this.playScene(item.scene, item.index);
        break;
      case 'episode-end': {
        await this.endCredits();
        break;
      }
    }
  }

  private async playScene(scene: Scene, index: number) {
    await this.untilUnpaused();
    this.overlay.hideCaption();
    this.overlay.hideLocation();
    this.overlay.year(false);
    const transition = sceneTransition(scene, this.previousScene, index);
    const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let firstBeat = 0;
    if (transition === 'skyline' || transition === 'exterior' || transition === 'atlantic_city') {
      const shot = this.director.current;
      const ambience = this.stage.current.ambience;
      try {
        this.director.establish(this.stage.establish(transition, scene.location, scene.time), !reducedMotion);
        audio.ambience('none');
        this.renderer.fade = 1;
        audio.sting('transition');
        const opening = scene.beats[0];
        if (opening?.type === 'narrate') {
          // Start Ted over the city, then cut inside when his setup lands. Never repeat this beat.
          await Promise.all([this.wait(1.9), this.narrate(opening.line, opening.laugh)]);
          firstBeat = 1;
        } else await this.wait(1.9);
      } finally {
        this.stage.endEstablishing();
        this.director.resume(shot);
        audio.ambience(ambience);
      }
    }
    if (transition === 'rewind') {
      audio.rewind();
      if (!reducedMotion) {
        try {
          await this.animate(0.22, (u) => { this.renderer.rewind = u; });
          this.stageScene(scene);
          this.renderer.fade = 1;
          await this.animate(0.28, (u) => { this.renderer.rewind = 1 - u; });
        } finally {
          this.renderer.rewind = 0;
        }
      } else this.stageScene(scene);
    } else {
      this.stageScene(scene);
      if (transition === 'cut' && index > 0 && scene.location !== 'future') audio.sting('transition');
    }
    this.renderer.fade = 1;
    this.previousScene = scene;
    void this.rollCredits();
    await this.wait(0.25);

    await this.playBeats(scene.beats.slice(firstBeat), scene.location === 'future');
    await this.wait(0.6);
  }

  private async playBeats(beats: Beat[], onCouch: boolean) {
    for (let i = 0; i < beats.length; i++) {
      await this.untilUnpaused();
      if (onCouch || !isKidBeat(beats[i])) {
        await this.beat(beats[i]);
        continue;
      }
      // the kids chime in: stay on the couch through their lines and Dad's answers
      let j = i + 1;
      while (j < beats.length && (isKidBeat(beats[j]) || ['narrate', 'laugh', 'pause'].includes(beats[j].type))) j++;
      await this.cutaway(beats.slice(i, j));
      i = j - 1;
    }
  }

  /**
   * Into somebody's imagination (a harp run and a wavy dissolve) or back in time (the rewind smear), play the
   * sequence on its own set, then return to the scene exactly as we left it.
   */
  private async playCutaway(c: CutawayBeat) {
    const st = this.stage, r = this.renderer;
    const shot = this.director.current;
    const ambience = st.current.ambience;
    const frozen = st.freeze();
    const imagined = c.style === 'imagined';
    const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const label = c.label || (imagined ? 'Picture this' : 'Earlier');
    this.overlay.hideCaption();
    this.panel.line('stage', `${imagined ? 'Imagined' : 'Flashback'}: ${label}.`);
    try {
      if (imagined) {
        audio.dream(true);
        if (!reducedMotion) await this.animate(0.45, (u) => { r.ripple = u; r.dream = u; });
      } else {
        audio.rewind();
        if (!reducedMotion) await this.animate(0.22, (u) => { r.rewind = u; });
      }
      this.stageScene({ location: c.location, time: c.time, cast: c.cast, beats: c.beats }, { label, style: c.style });
      r.dream = imagined ? 1 : 0;
      r.memory = imagined ? 0 : 1;
      if (!reducedMotion) await this.animate(imagined ? 0.45 : 0.28, (u) => {
        if (imagined) r.ripple = 1 - u;
        else r.rewind = 1 - u;
      });
      r.ripple = r.rewind = 0;
      await this.wait(0.2);
      await this.playBeats(c.beats, false);
      await this.wait(0.3);
      this.overlay.hideCaption();
      if (imagined) {
        audio.dream(false);
        if (!reducedMotion) await this.animate(0.35, (u) => { r.ripple = u; });
      } else if (!reducedMotion) await this.animate(0.16, (u) => { r.rewind = u; });
    } finally {
      r.dream = r.memory = r.ripple = r.rewind = 0;
      st.thaw(frozen);
      this.overlay.year(st.current.id === 'future');
      audio.ambience(ambience);
      this.director.resume(shot);
    }
    await this.wait(0.25);
  }

  /** Stage and frame the interior in one synchronous cut, including the midpoint of a flashback. */
  private stageScene(scene: Pick<Scene, 'location' | 'time' | 'cast' | 'beats'>, cutaway?: { label: string; style: CutawayStyle | 'montage' }) {
    this.stage.setLocation(scene.location, scene.time);
    audio.ambience(this.stage.current.ambience);
    const onCouch = scene.location === 'future';
    if (onCouch) this.stage.seatKids();

    // Anyone who acts in the scene without entering is assumed to already be there.
    // (Except the kids: they're in 2030, and get cut to.)
    const entering = new Set<CharacterId>();
    const present = new Set<CharacterId>();
    for (const c of scene.cast) {
      if (!isChar(c.character) || isKid(c.character) || present.has(c.character)) continue;
      present.add(c.character);
      if (c.outfit) this.stage.dress(c.character, c.outfit);
      this.stage.place(c.character, c.mark);
    }
    for (const b of scene.beats) {
      if (b.type === 'enter') {
        if (!present.has(b.character) && !isKid(b.character)) entering.add(b.character);
        continue;
      }
      for (const who of participants(b)) {
        if (!isChar(who) || isKid(who) || present.has(who) || entering.has(who)) continue;
        present.add(who);
        this.stage.place(who, this.stage.resolveMark(undefined, who));
      }
    }
    for (const bg of this.stage.current.background) {
      if (!present.has(bg.character) && !entering.has(bg.character)) {
        this.stage.place(bg.character, bg.mark);
        this.stage.setBackground(bg.character, true);
      }
    }

    this.director.coverage(this.stage.castIds());
    this.overlay.year(onCouch);
    if (cutaway?.label) this.overlay.location(cutaway.label, cutaway.style);
    else this.overlay.hideLocation();
  }

  /**
   * "And that's how it went for three weeks": hard cuts between quick shots on any set over a music bed,
   * each with its own little card, then back to the scene exactly as we left it.
   */
  private async playMontage(m: MontageBeat) {
    const st = this.stage;
    const shot = this.director.current;
    const ambience = st.current.ambience;
    const frozen = st.freeze();
    this.overlay.hideCaption();
    this.panel.line('stage', `Montage${m.label ? `: ${m.label}` : ''}.`);
    audio.montage(m.music);
    try {
      for (const [i, s] of m.shots.entries()) {
        await this.untilUnpaused();
        const label = i === 0 && m.label ? m.label + (s.label ? ` · ${s.label}` : '') : s.label ?? '';
        this.stageScene({ location: s.location, time: s.time, cast: s.cast, beats: s.beats }, { label, style: 'montage' });
        // the music carries it; no room tone
        audio.ambience('none');
        await this.wait(0.15);
        await Promise.all([this.playBeats(s.beats, false), this.wait(1.6)]);
        await this.wait(0.35);
      }
    } finally {
      audio.stopBed();
      st.thaw(frozen);
      this.overlay.hideLocation();
      this.overlay.year(st.current.id === 'future');
      audio.ambience(ambience);
      this.director.resume(shot);
    }
    await this.wait(0.3);
  }

  /** Future Ted talks over a frozen frame, maybe caught mid-gesture; then it all carries on. */
  private async freeze(b: FreezeBeat) {
    const st = this.stage, r = this.renderer;
    const who = isChar(b.character) && st.onStage(b.character) ? b.character : undefined;
    let rest = 0;
    if (who) {
      st.actors[who].setEmotion(b.emotion);
      const to = isChar(b.to) && b.to !== who && st.onStage(b.to) ? b.to : undefined;
      if (b.shot) this.director.intent(b.shot, who, to);
      else if (to) this.director.twoShot(who, to);
      else this.director.closeup(who);
      const d = b.gesture ? this.gesture(who, b.gesture, to, 0, b.emotion) : 0;
      // caught at the height of it
      await this.wait(d ? d * 0.45 : 0.4);
      rest = d * 0.55;
    }
    audio.freezeFrame();
    st.frozen = this.director.held = true;
    r.still = 1;
    this.panel.line('stage', '[freeze frame]');
    try {
      await this.narrate(b.line, b.laugh);
    } finally {
      st.frozen = this.director.held = false;
      r.still = 0;
    }
    if (rest) await this.wait(rest);
  }

  /**
   * Cut to the thing itself, full screen: the text, the chart, the slide, the sign, the Playbook page. Its items
   * come in one at a time while someone (or Future Ted) reads over it; then back to the room for the reaction.
   */
  private async insert(b: InsertBeat) {
    this.overlay.hideCaption();
    this.overlay.insert(b);
    if (b.kind !== 'text') audio.whoosh();
    this.panel.line('stage', insertText(b));
    const n = this.overlay.revealInsert(0);
    const words = [b.title, ...(b.lines ?? []), ...(b.messages ?? []).map((m) => m.text), ...(b.items ?? []).map((i) => i.label)]
      .join(' ').split(/\s+/).filter(Boolean).length;
    const step = b.kind === 'text' ? 1.1 : clamp(2.4 / Math.max(1, n), 0.35, 0.9);
    let shown = 0;
    const reveal = this.animate(0.3 + n * step, (u) => {
      const k = Math.min(n, Math.floor((u * (0.3 + n * step)) / step) + (b.kind === 'text' ? 1 : 0));
      if (k === shown) return;
      shown = k;
      this.overlay.revealInsert(k);
      if (b.kind === 'text') audio.textChime();
    });
    const line = clean(b.line ?? '');
    const reader = isChar(b.character) && !isKid(b.character) ? b.character : undefined;
    let read: Promise<unknown> = Promise.resolve();
    if (line && reader) {
      const def = CHARACTERS[reader];
      this.panel.line('say', line, def.name, def.color);
      read = this.race(speech.speak(line, def.voice, () => this.overlay.showCaption(def.name, def.color, line)).done);
    } else if (line) read = this.narrate(line);
    try {
      await Promise.all([reveal, read, this.wait(clamp(1.2 + words * 0.28, 2.6, 8))]);
      this.overlay.hideCaption();
      if (b.laugh && !b.react?.length) await this.laugh(b.laugh);
    } finally {
      this.overlay.insert(null);
    }
    if (b.react?.length) {
      await this.react(b.react, reader);
      if (b.laugh) await this.laugh(b.laugh);
    }
  }

  /** The listeners' faces once a line lands: one closeup, a two-shot or the whole table. */
  private async react(reactions: Reaction[], speaker?: CharacterId) {
    const st = this.stage;
    const who = reactions.filter((r) => isChar(r.character) && r.character !== speaker && st.onStage(r.character));
    if (!who.length) return;
    let longest = 0;
    // it lands on the first face at once, and on the others a beat apart
    for (const [i, r] of who.entries()) {
      const delay = i ? 0.08 + 0.1 * i + rand(0, 0.08) : 0;
      const a = st.actors[r.character];
      const emotion = r.emotion ?? (r.gesture ? undefined : 'surprised');
      const d = r.gesture ? gestureDuration(r.gesture) : 0;
      a.later(delay, () => {
        a.setEmotion(emotion);
        if (r.gesture) this.gesture(r.character, r.gesture, speaker && st.onStage(speaker) ? speaker : undefined, 0, r.emotion);
      });
      longest = Math.max(longest, d + delay);
    }
    this.panel.line('stage', `${groupName(who.map((r) => r.character), st.castIds())} ${who.length > 1 ? 'react' : 'reacts'}.`);
    const toward = speaker && st.onStage(speaker) ? speaker : undefined;
    const ids = who.map((r) => r.character);
    // a single take cheats out toward the lens, so the face reads
    const take = (id: CharacterId) => {
      this.director.closeup(id, toward);
      const lens = this.director.current?.pos;
      if (lens) st.actors[id].lookAt = (toward ? st.actors[toward].headWorld : st.actors[id].headWorld).lerp(lens, 0.7);
    };
    const spread = Math.max(0, ...ids.flatMap((a) => ids.map((b) => st.actors[a].position.distanceTo(st.actors[b].position))));
    if (ids.length > 2 && spread > 2.6) {
      // too far apart for one shot: cut from face to face
      for (const id of ids.slice(0, 3)) {
        take(id);
        await this.wait(0.6);
      }
      await this.wait(clamp(longest * 0.8 - 1.8, 0, 0.6));
      return;
    }
    if (ids.length === 1) take(ids[0]);
    else this.director.group(ids, toward);
    await this.wait(clamp(longest * 0.8, 0.9, 2.2));
  }

  /** Hard cut to Penny and Luke on the couch in 2030, play their beats, then cut straight back to the story. */
  private async cutaway(beats: Beat[]) {
    const st = this.stage;
    const shot = this.director.current;
    const ambience = st.current.ambience;
    // 2030 is real: no fantasy haze or old-film grade on the couch
    const grade = { dream: this.renderer.dream, memory: this.renderer.memory };
    st.cutToKids();
    audio.ambience('none');
    this.renderer.dream = this.renderer.memory = 0;
    this.director.wide(0);
    this.overlay.year(true);
    try {
      await this.wait(0.35);
      for (const b of beats) {
        await this.untilUnpaused();
        await this.beat(b);
      }
      await this.wait(0.3);
    } finally {
      st.cutBack();
      this.overlay.year(false);
      Object.assign(this.renderer, grade);
      audio.ambience(ambience);
      this.director.resume(shot);
    }
  }

  private async narrate(line: string, laugh?: LaughKind) {
    const text = clean(line);
    if (!text) return;
    this.panel.line('narr', text, 'Future Ted');
    // the kids look back at their dad
    for (const id of KIDS) if (this.stage.onStage(id)) this.stage.actors[id].lookAt = null;
    const h = speech.speak(text, FUTURE_TED_VOICE, () => this.overlay.showCaption('Future Ted', '', text, true));
    await this.race(h.done);
    await this.untilUnpaused();
    this.overlay.hideCaption();
    if (laugh) await this.laugh(laugh);
    await this.wait(0.25);
  }

  private async laugh(kind: LaughKind) {
    const d = audio.laugh(kind);
    this.panel.line('laugh', `[${kind === 'big' ? 'big laugh' : kind}]`);
    // react on stage: everybody enjoys a good laugh line
    if (kind === 'big' || kind === 'laugh') this.stage.onStageIds().forEach((id) => Math.random() < 0.3 && this.stage.actors[id].setEmotion('happy'));
    await this.wait(d ? clamp(d * 0.6, 0.8, 2.6) : 0.4);
  }

  private lookAtSpeaker(speaker: CharacterId) {
    const head = this.stage.actors[speaker].headWorld;
    for (const id of this.stage.onStageIds()) {
      if (id === speaker) continue;
      const a = this.stage.actors[id];
      if (!a.isWalking) a.lookAt = head;
    }
  }

  private async beat(b: Beat) {
    const st = this.stage;
    switch (b.type) {
      case 'say': {
        if (!isChar(b.character)) return;
        const a = st.actors[b.character];
        if (isKid(b.character) && !st.onStage(b.character)) return;
        st.setBackground(b.character, false);
        if (!st.onStage(b.character)) st.place(b.character, st.resolveMark(undefined, b.character));
        const text = clean(b.line);
        if (!text) return;
        a.setEmotion(b.emotion ?? (b.delivery === 'deadpan' ? 'bored' : undefined));
        const to = isChar(b.to) && b.to !== b.character && st.onStage(b.to) ? b.to : undefined;
        if (to) {
          const th = st.actors[to].headWorld;
          a.lookAt = th;
          if (!a.isSitting && !a.isWalking) a.faceTowards(th);
        } else if (isKid(b.character)) {
          // talking to Dad, who is where the camera is
          a.lookAt = null;
        } else {
          // addressing the room: look at whoever's closest-ish, or the audience
          const others = st.onStageIds().filter((i) => i !== b.character && !b.chorus?.includes(i));
          a.lookAt = others.length ? st.actors[pick(others)].headWorld : null;
        }
        this.lookAtSpeaker(b.character);
        // a line said together: everyone in it talks at once, at the same person
        const chorus = (b.chorus ?? []).filter((id) => isChar(id) && id !== b.character && st.onStage(id));
        const voices = [a, ...chorus.map((id) => st.actors[id])];
        for (const id of chorus) {
          st.setBackground(id, false);
          st.actors[id].setEmotion(b.emotion);
          st.actors[id].lookAt = a.lookAt;
        }
        const delivery = b.delivery;
        if (isKid(b.character)) chorus.length ? this.director.wide(0) : this.director.onCouchLine(b.character);
        else if (b.shot) this.director.intent(b.shot, b.character, to);
        else if (chorus.length) this.director.group([b.character, ...chorus]);
        // a whisper is a two-shot secret; a shout gets the single
        else if (delivery === 'whisper' && to) this.director.twoShot(b.character, to);
        else if (delivery === 'shout') this.director.closeup(b.character, to);
        else this.director.onLine(b.character, to);
        const def = CHARACTERS[b.character];
        const name = chorus.length ? groupName([b.character, ...chorus], st.castIds()) : def.name;
        const color = chorus.length ? '#ffffff' : def.color;
        this.panel.line('say', delivery && delivery !== 'fast' && delivery !== 'slow' ? `(${delivery}) ${text}` : text, name, color);
        const seconds = estimateDuration(text, def.voice.rate * deliveryRate(delivery));
        if (b.gesture && b.gesture !== 'none') this.gesture(b.character, b.gesture, to, seconds, b.emotion);
        const level = delivery === 'shout' ? 1.6 : delivery === 'whisper' ? 0.45 : delivery === 'sing' ? 1.2 : 1;
        // the mouth follows the words: spelled out over the line's length, kept in step by the voice
        const track = lipTrack(text.replace(/[-–—]+$/, ''), seconds * (b.interrupted ? 0.88 : 1));
        const listeners = st.onStageIds().filter((id) => !voices.includes(st.actors[id]));
        for (const id of listeners) st.actors[id].listen(a.emotion);
        const h = speech.speak(text, def.voice, () => {
          for (const v of voices) {
            v.talking = true;
            v.talkLevel = level;
            v.speak(track);
          }
          this.overlay.showCaption(name, color, text, false, delivery);
          if (delivery === 'sing') audio.serenade(seconds);
        }, { delivery, cutOff: b.interrupted, onWord: (i) => voices.forEach((v) => v.syncWord(i)) });
        try {
          await this.race(h.done);
        } finally {
          for (const v of voices) {
            v.talking = false;
            v.talkLevel = 1;
            v.speak(null);
          }
          for (const id of listeners) st.actors[id].listen(null);
          if (delivery === 'sing') audio.stopSting();
        }
        this.overlay.hideCaption();
        if (b.react?.length && !b.interrupted) await this.react(b.react, b.character);
        if (b.laugh) await this.laugh(b.laugh);
        // whoever interrupts jumps straight in
        else if (!b.interrupted) await this.wait(0.18);
        break;
      }
      case 'narrate':
        await this.narrate(b.line, b.laugh);
        break;
      case 'move': {
        if (!isChar(b.character) || isKid(b.character)) return;
        const target = b.to === b.character ? 'center' : b.to;
        this.panel.line('stage', `${charName(b.character)} moves to ${humanize(target)}.`);
        const p = st.moveTo(b.character, target);
        this.director.coverage(st.castIds());
        await this.race(Promise.race([p, sleep(2200)]));
        break;
      }
      case 'enter': {
        if (!isChar(b.character) || isKid(b.character)) return;
        if (st.onStage(b.character)) {
          if (b.to) await this.beat({ type: 'move', character: b.character, to: b.to });
          return;
        }
        this.panel.line('stage', `${charName(b.character)} enters.`);
        audio.door(st.current.doorSound ?? 'bell');
        const p = st.enter(b.character, b.to);
        this.director.wide(0);
        this.lookAtSpeaker(b.character);
        await this.race(Promise.race([p, sleep(2600)]));
        break;
      }
      case 'exit': {
        if (!isChar(b.character) || isKid(b.character) || !st.onStage(b.character)) return;
        this.panel.line('stage', `${charName(b.character)} leaves.`);
        const p = st.exit(b.character);
        this.director.wide(0);
        await this.race(Promise.race([p, sleep(2400)]));
        break;
      }
      case 'act': {
        if (!isChar(b.character) || !b.gesture || b.gesture === 'none') return;
        if (!st.onStage(b.character)) return;
        st.actors[b.character].setEmotion(b.emotion);
        const to = isChar(b.to) && b.to !== b.character && st.onStage(b.to) ? b.to : undefined;
        this.panel.line('stage', `${charName(b.character)} ${gestureText(b.gesture, to)}.`);
        if (b.gesture === 'sit' || b.gesture === 'stand') {
          const p = b.gesture === 'sit' ? st.sitDown(b.character) : st.standUp(b.character);
          if (b.shot) this.director.intent(b.shot, b.character, to);
          else this.director.coverage(st.castIds());
          await this.race(Promise.race([p, sleep(2600)]));
          break;
        }
        if (to && (PAIRED_GESTURES as readonly Gesture[]).includes(b.gesture)) {
          const a = st.actors[b.character], o = st.actors[to];
          const reach = b.gesture === 'kiss' ? 1.1 : 1.4;
          if (a.position.distanceTo(o.position) > reach && !a.isSitting) await this.race(Promise.race([st.moveTo(b.character, to), sleep(2500)]));
          if (b.shot) this.director.intent(b.shot, b.character, to);
          else this.director.twoShot(b.character, to);
        } else if (b.shot) this.director.intent(b.shot, b.character, to);
        else if (to) this.director.twoShot(b.character, to);
        else if (Math.random() < 0.6) this.director.closeup(b.character);
        const d = this.gesture(b.character, b.gesture, to, 0, b.emotion);
        await this.wait(Math.max(0.6, d * 0.85));
        break;
      }
      case 'hold': {
        if (!isChar(b.character) || !st.onStage(b.character)) return;
        const a = st.actors[b.character];
        const prop = b.prop === 'none' ? null : b.prop;
        if (a.prop === prop) return;
        const was = a.prop;
        this.panel.line('stage', prop ? `${charName(b.character)} picks up ${PROP_NAME[prop]}.` : `${charName(b.character)} puts ${PROP_NAME[was!].replace(/^an? /, 'the ')} down.`);
        if (b.shot) this.director.intent(b.shot, b.character);
        else if ((prop && GRIP[prop] !== 'hang') || Math.random() < 0.5) this.director.closeup(b.character);
        // reach out, and it's in hand (or gone)
        a.onGestureBeat = () => a.hold(prop);
        const d = a.doGesture('give');
        await this.wait(d * 0.75);
        a.hold(prop);
        break;
      }
      case 'give': {
        const to = b.to;
        if (!isChar(b.character) || !isChar(to) || to === b.character || !st.onStage(b.character) || !st.onStage(to)) return;
        const a = st.actors[b.character], o = st.actors[to];
        const prop = b.prop ?? a.prop;
        if (!prop) return;
        a.hold(prop);
        this.panel.line('stage', `${charName(b.character)} hands ${charName(to)} ${PROP_NAME[prop]}.`);
        if (a.position.distanceTo(o.position) > 1.3 && !a.isSitting && !st.current.seated) await this.race(Promise.race([st.moveTo(b.character, to), sleep(2500)]));
        if (b.shot) this.director.intent(b.shot, b.character, to);
        else this.director.twoShot(b.character, to);
        if (!a.isSitting) a.faceTowards(o.position, 0.1);
        if (!o.isSitting) o.faceTowards(a.position, 0.1);
        a.lookAt = o.headWorld;
        o.lookAt = a.headWorld;
        const handOver = () => {
          if (a.prop !== prop) return;
          a.hold(null);
          o.hold(prop);
        };
        a.onGestureBeat = handOver;
        const d = a.doGesture('give');
        o.doGesture('give');
        await this.wait(d * 0.8);
        handOver();
        break;
      }
      case 'freeze':
        await this.freeze(b);
        break;
      case 'insert':
        await this.insert(b);
        break;
      case 'montage':
        if (!st.inCutaway) await this.playMontage(b);
        break;
      case 'laugh':
        await this.laugh(b.laugh);
        break;
      case 'pause':
        await this.wait(clamp(Number(b.seconds) || 1, 0.3, 4));
        break;
      case 'cutaway':
        // the kids' couch is the one place there's no cutting away from
        if (!st.inCutaway) await this.playCutaway(b);
        break;
    }
  }

  /**
   * Start a gesture (with a partner joining in, for the paired ones); `seconds` holds a phone call for a whole line.
   * Some gestures bring their own face (cracking up, sobbing) unless the beat gave an `emotion`.
   */
  private gesture(id: CharacterId, g: Gesture, to?: CharacterId, seconds = 0, emotion?: Emotion) {
    const a = this.stage.actors[id];
    const implied = !emotion && g !== 'sit' && g !== 'stand' ? impliedEmotion(g) : undefined;
    const other = to ? this.stage.actors[to] : undefined;
    if (g === 'sit' || g === 'stand') {
      void (g === 'sit' ? this.stage.sitDown(id) : this.stage.standUp(id));
      return 0;
    }
    if (other) {
      if (!a.isSitting) a.faceTowards(other.position, 0.1);
      a.lookAt = other.headWorld;
    }
    a.onGestureBeat = (gg) => {
      if (gg === 'slap') {
        audio.slap();
        other?.react();
        if (other) other.setEmotion('angry');
      } else if (gg === 'high_five' && other) audio.slap();
      else if (gg === 'fist_bump' && other) audio.bump();
      else if (gg === 'cheers') audio.clink();
      else if (gg === 'spit_take') audio.spray();
      else if (gg === 'slow_clap') audio.clap();
    };
    const together = other && (g === 'high_five' || g === 'hug' || g === 'cheers' || g === 'kiss' || g === 'fist_bump');
    if (together) {
      if (!other.isSitting) other.faceTowards(a.position, 0.1);
      other.lookAt = a.headWorld;
      other.doGesture(g, { partner: true });
    }
    const held = HELD.includes(g) ? seconds : 0;
    const d = a.doGesture(g, { partner: !!together, dur: held });
    if (implied) a.later(d * implied.at, () => a.setEmotion(implied.emotion));
    return d;
  }
}

/** Gestures that last as long as the line they're on. */
const HELD: Gesture[] = ['phone_call', 'lean_in', 'arms_crossed', 'hands_on_hips', 'head_in_hands', 'sob'];

/** Strip stage directions like (laughs) or *sighs* from spoken lines. */
function clean(s: string) {
  return String(s ?? '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\*[^*]*\*/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

function humanize(s: string) {
  if (isChar(s)) return charName(s);
  return s.replace(/_/g, ' ');
}

function gestureText(g: Gesture, to?: CharacterId) {
  const t = to ? ` ${charName(to)}` : '';
  const map: Partial<Record<Gesture, string>> = {
    high_five: `high-fives${t}`, hug: `hugs${t}`, slap: `slaps${t}`, point: `points${to ? ' at' + t : ''}`,
    suit_up: 'suits up', facepalm: 'facepalms', arms_crossed: 'crosses arms', thumbs_up: 'gives a thumbs up',
    hands_up: 'throws hands up', shake_head: 'shakes head', cheers: `raises a glass${to ? ' to' + t : ''}`,
    drink: 'takes a sip', think: 'ponders', kiss: to ? `kisses${t}` : 'blows a kiss', phone_call: 'takes a call',
    sit: 'sits down', stand: 'stands up', lean_in: `leans in${to ? ' to' + t : ''}`, jaw_drop: 'gapes',
    fist_bump: `fist-bumps${t}`, spit_take: 'does a spit take',
  };
  return map[g] ?? `${g.replace(/_/g, ' ')}s`;
}

/** "Ted & Marshall", "Ted, Lily & Robin", or "Everyone" when it's the whole room. */
function groupName(ids: CharacterId[], room: CharacterId[]) {
  const names = ids.map(charName);
  if (ids.length >= 3 && room.every((id) => ids.includes(id))) return 'Everyone';
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names.at(-1)}` : names[0] ?? '';
}

/** The transcript's note for an insert. */
function insertText(b: InsertBeat) {
  const whose = b.character ? `${charName(b.character)}'s ` : '';
  const what = { text: 'phone', chart: 'chart', slides: 'slideshow', sign: 'sign', playbook: 'Playbook' }[b.kind];
  return `[${whose}${what}${b.title ? `: ${b.title}` : ''}]`;
}
