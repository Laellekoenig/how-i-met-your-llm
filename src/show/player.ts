import type { Stage } from './stage';
import type { Director } from './director';
import type { Renderer } from '../engine/renderer';
import type { Overlay, Panel } from '../ui/overlay';
import { audio } from '../audio/audio';
import { speech } from '../audio/speech';
import { CHARACTERS, FUTURE_TED_VOICE, charName } from '../world/characters';
import { CHARACTER_IDS, KIDS, isKid, type Beat, type CharacterId, type Scene, type ShowItem, type LaughKind, type Gesture } from '../script/types';
import { sleep, clamp, pick } from '../util';
import { sceneTransition } from './transitions';

export interface ContentSource {
  next(onWaiting: (msg: string) => void): Promise<ShowItem>;
}

class Skip extends Error {}

const LOCATION_LABEL: Record<string, string> = {
  maclarens: "MacLaren's Pub",
  apartment: 'The Apartment',
  barneys: "Barney's Place",
  rooftop: 'The Roof',
  barneys_office: "Barney's Office",
  office: 'The Office',
  metro_news_one: 'Metro News One',
  store: 'The Store',
  restaurant: 'The Restaurant',
  lecture_hall: "Ted's Lecture Hall",
  limo: "Barney's Limo",
  taxi: 'A Cab',
};

const isChar = (s: string | undefined): s is CharacterId => !!s && (CHARACTER_IDS as readonly string[]).includes(s);
/** Lines and reactions from Penny or Luke: these happen on the couch in 2030. */
const isKidBeat = (b: Beat) => (b.type === 'say' || b.type === 'act') && isKid(b.character);

/** Plays show items: title cards, scenes beat by beat, end cards. */
export class Player {
  paused = false;
  private skipLevel: 'none' | 'scene' | 'episode' = 'none';
  private skipWaiters: (() => void)[] = [];
  private currentEpisode: string | null = null;
  private previousScene: Scene | null = null;
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
      const item = await this.source.next((msg) => this.overlay.standby(true, msg));
      this.overlay.standby(false);
      // skipping an episode drops the rest of its items
      if (this.skipLevel === 'episode' && 'episode' in item && item.episode.id === this.currentEpisode) {
        if (item.kind === 'episode-end') this.skipLevel = 'none';
        continue;
      }
      this.skipLevel = 'none';
      this.onItem?.(item);
      try {
        await this.untilUnpaused();
        await this.play(item);
      } catch (e) {
        if (!(e instanceof Skip)) console.error(e);
        this.cleanup();
        // (re-read: skip() may have changed it while we were awaiting)
        if ((this.skipLevel as string) === 'scene') this.skipLevel = 'none';
      }
    }
  }

  private cleanup() {
    speech.cancel();
    this.overlay.hideCaption();
    this.overlay.hideCards();
    this.renderer.fade = 1;
    this.renderer.rewind = 0;
    audio.stopSting();
    for (const a of Object.values(this.stage.actors)) a.talking = false;
  }

  private async fade(to: number, seconds: number) {
    const from = this.renderer.fade;
    await this.animate(seconds, (u) => { this.renderer.fade = from + (to - from) * u; });
  }

  private async play(item: ShowItem) {
    switch (item.kind) {
      case 'episode-start': {
        // Kids, ... : every episode opens on Penny and Luke on the couch in 2030, then the titles
        this.currentEpisode = item.episode.id;
        this.previousScene = null;
        this.panel.line('sep', `${item.episode.code} — ${item.episode.title}`);
        this.stage.setLocation('future', 'night');
        this.stage.seatKids();
        this.director.wide(0, 0.02);
        audio.ambience('none');
        this.renderer.fade = 0;
        await this.fade(1, 0.6);
        this.overlay.location('the year 2030');
        await this.wait(0.8);
        if (item.coldOpen) await this.narrate(item.coldOpen);
        for (const b of item.couch ?? []) {
          await this.untilUnpaused();
          await this.beat(b);
        }
        await this.wait(0.4);
        const d = audio.sting('intro');
        await this.fade(0.35, 0.4);
        await this.race(this.overlay.title(item.episode, Math.max(4.2, d)));
        await this.fade(0, 0.5);
        break;
      }
      case 'scene':
        await this.playScene(item.scene, item.index);
        break;
      case 'episode-end': {
        this.overlay.hideCaption();
        const d = audio.sting('outro');
        audio.laugh('applause');
        await this.fade(0.3, 0.6);
        await this.race(this.overlay.end(item.episode, Math.max(3.5, d)));
        this.renderer.fade = 0;
        break;
      }
    }
  }

  private async playScene(scene: Scene, index: number) {
    await this.untilUnpaused();
    this.overlay.hideCaption();
    this.overlay.hideLocation();
    const transition = sceneTransition(scene, this.previousScene, index);
    const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let firstBeat = 0;
    if (transition === 'skyline' || transition === 'exterior') {
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
    await this.wait(0.25);

    const onCouch = scene.location === 'future';
    const beats = scene.beats;
    for (let i = firstBeat; i < beats.length; i++) {
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
    await this.wait(0.6);
  }

  /** Stage and frame the interior in one synchronous cut, including the midpoint of a flashback. */
  private stageScene(scene: Scene) {
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
      this.stage.place(c.character, c.mark);
    }
    for (const b of scene.beats) {
      if (b.type === 'enter') {
        if (!present.has(b.character) && !isKid(b.character)) entering.add(b.character);
        continue;
      }
      const who = 'character' in b ? b.character : undefined;
      if (isChar(who) && !isKid(who) && !present.has(who) && !entering.has(who)) {
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
    this.overlay.location(onCouch ? 'the year 2030' : `${LOCATION_LABEL[scene.location] ?? scene.location} · ${scene.time}`);
  }

  /** Hard cut to Penny and Luke on the couch in 2030, play their beats, then cut straight back to the story. */
  private async cutaway(beats: Beat[]) {
    const st = this.stage;
    const shot = this.director.current;
    const ambience = st.current.ambience;
    st.cutToKids();
    audio.ambience('none');
    this.director.wide(0, 0.02);
    try {
      await this.wait(0.35);
      for (const b of beats) {
        await this.untilUnpaused();
        await this.beat(b);
      }
      await this.wait(0.3);
    } finally {
      st.cutBack();
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
    const h = speech.speak('future-ted', text, FUTURE_TED_VOICE, () => this.overlay.showCaption('Future Ted', '', text, true));
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
        a.setEmotion(b.emotion);
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
          const others = st.onStageIds().filter((i) => i !== b.character);
          a.lookAt = others.length ? st.actors[pick(others)].headWorld : null;
        }
        this.lookAtSpeaker(b.character);
        if (isKid(b.character)) this.director.onCouchLine(b.character);
        else this.director.onLine(b.character, to);
        const def = CHARACTERS[b.character];
        this.panel.line('say', text, def.name, def.color);
        if (b.gesture && b.gesture !== 'none') this.gesture(b.character, b.gesture, to);
        const h = speech.speak(b.character, text, def.voice, () => {
          a.talking = true;
          this.overlay.showCaption(def.name, def.color, text);
        });
        try {
          await this.race(h.done);
        } finally {
          a.talking = false;
        }
        this.overlay.hideCaption();
        if (b.laugh) await this.laugh(b.laugh);
        else await this.wait(0.18);
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
        if (to && ['high_five', 'hug', 'slap'].includes(b.gesture)) {
          const a = st.actors[b.character], o = st.actors[to];
          if (a.position.distanceTo(o.position) > 1.4 && !a.isSitting) await this.race(Promise.race([st.moveTo(b.character, to), sleep(2500)]));
          this.director.twoShot(b.character, to);
        } else if (to) this.director.twoShot(b.character, to);
        else if (Math.random() < 0.6) this.director.closeup(b.character);
        const d = this.gesture(b.character, b.gesture, to);
        await this.wait(Math.max(0.6, d * 0.85));
        break;
      }
      case 'laugh':
        await this.laugh(b.laugh);
        break;
      case 'pause':
        await this.wait(clamp(Number(b.seconds) || 1, 0.3, 4));
        break;
    }
  }

  private gesture(id: CharacterId, g: Gesture, to?: CharacterId) {
    const a = this.stage.actors[id];
    const other = to ? this.stage.actors[to] : undefined;
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
      else if (gg === 'cheers') audio.clink();
    };
    if (other && (g === 'high_five' || g === 'hug' || g === 'cheers')) {
      if (!other.isSitting) other.faceTowards(a.position, 0.1);
      other.lookAt = a.headWorld;
      other.doGesture(g);
    }
    return a.doGesture(g);
  }
}

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
    suit_up: 'adjusts his suit', facepalm: 'facepalms', arms_crossed: 'crosses arms', thumbs_up: 'gives a thumbs up',
    hands_up: 'throws hands up', shake_head: 'shakes head', cheers: `raises a glass${to ? ' to' + t : ''}`,
    drink: 'takes a sip', think: 'ponders',
  };
  return map[g] ?? `${g.replace(/_/g, ' ')}s`;
}
