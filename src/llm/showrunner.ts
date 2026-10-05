import { chat, type ChatMessage } from './openrouter';
import { showBible, PLAN_TOOL, SCENE_TOOL } from './prompts';
import { normalizeScene, normalizeGuests, asChar, asLocation, asTime, asTransition, type Casting } from './normalize';
import type { StageSet } from '../world/sets/common';
import { EMOTIONS, isKid, type Beat, type EpisodeMeta, type Emotion, type GuestStar, type Scene, type ShowItem, type LocationId, type TimeOfDay, type CharacterId, type Transition } from '../script/types';
import { charName } from '../world/characters';
import { sampleEpisode } from '../script/samples';
import { sleep, uid, pick } from '../util';
import type { ContentSource } from '../show/player';

interface PlannedScene {
  location: LocationId;
  time: TimeOfDay;
  transition?: Transition;
  summary: string;
  characters: CharacterId[];
}

interface Plan {
  meta: EpisodeMeta;
  coldOpen: string;
  couch: Beat[]; // the kids' reaction to the cold open
  guests: GuestStar[];
  scenes: PlannedScene[];
}

const HISTORY_KEY = 'himyllm.history';
const COUNTER_KEY = 'himyllm.episodeCounter';

export interface WriterEvents {
  status(text: string, state: 'idle' | 'busy' | 'error'): void;
  log(text: string, error?: boolean): void;
  stats(text: string): void;
}

/** Writes episodes ahead of playback: plan → scene → scene → ... */
export class Showrunner {
  apiKey = '';
  model = 'anthropic/claude-sonnet-5.5';
  running = false;
  readonly queue: ShowItem[] = [];
  private abandoned = new Set<string>();
  private cost = 0;
  private calls = 0;
  private abort: AbortController | null = null;
  private failures = 0;
  lastError = '';

  constructor(private sets: Record<string, StageSet>, private ev: WriterEvents) {}

  start() {
    if (this.running) return;
    if (!this.apiKey) {
      this.ev.status('add an OpenRouter API key first', 'error');
      return;
    }
    this.running = true;
    this.failures = 0;
    void this.loop();
  }

  stop() {
    this.running = false;
    this.abort?.abort();
    this.queue.length = 0;
    this.ev.status('offline', 'idle');
  }

  /** Stop writing an episode the viewer skipped. */
  abandon(episodeId: string) {
    this.abandoned.add(episodeId);
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const it = this.queue[i];
      if (it.episode.id === episodeId) this.queue.splice(i, 1);
    }
  }

  private bufferedScenes() {
    return this.queue.filter((i) => i.kind === 'scene').length;
  }

  private async loop() {
    while (this.running) {
      try {
        // don't pitch the next episode until the current one is nearly on air
        while (this.running && this.bufferedScenes() >= 2) {
          this.ev.status('next episode on deck — waiting for airtime', 'idle');
          await sleep(1000);
        }
        if (!this.running) break;
        const plan = await this.plan();
        if (!this.running) break;
        this.queue.push({ kind: 'episode-start', episode: plan.meta, coldOpen: plan.coldOpen, couch: plan.couch, guests: plan.guests });
        const written: Scene[] = [];
        for (let i = 0; i < plan.scenes.length; i++) {
          while (this.running && this.bufferedScenes() >= 2 && !this.abandoned.has(plan.meta.id)) {
            this.ev.status(`scene ${i + 1} on deck — waiting for airtime`, 'idle');
            await sleep(1000);
          }
          if (!this.running || this.abandoned.has(plan.meta.id)) break;
          const scene = await this.writeScene(plan, i, written);
          if (!this.running || this.abandoned.has(plan.meta.id)) break;
          written.push(scene);
          this.queue.push({ kind: 'scene', episode: plan.meta, index: i, scene });
        }
        if (this.running && !this.abandoned.has(plan.meta.id)) {
          this.queue.push({ kind: 'episode-end', episode: plan.meta });
          this.remember(plan);
        }
        this.failures = 0;
      } catch (e) {
        if (!this.running) break;
        this.failures++;
        const msg = e instanceof Error ? e.message : String(e);
        this.lastError = msg;
        this.ev.log(`✗ ${msg}`, true);
        this.ev.status(`error: ${msg}`, 'error');
        if (/401|403|invalid|unauthori|key/i.test(msg) || this.failures >= 4) {
          this.ev.log('Giving up for now. Check your key/model and press start again.', true);
          this.running = false;
          this.ev.status(`stopped: ${msg}`, 'error');
          // keep the show going with reruns
          if (!this.queue.length) this.queue.push(...sampleEpisode());
          break;
        }
        await sleep(2000 * this.failures);
      }
    }
  }

  private async call(messages: ChatMessage[], tool: typeof PLAN_TOOL, maxTokens: number) {
    this.abort = new AbortController();
    let res = await chat({ apiKey: this.apiKey, model: this.model, messages, tool, maxTokens, signal: this.abort.signal }).catch(async (e) => {
      // some providers reject forced tool_choice; retry letting the model choose
      if (/tool_choice|tool choice/i.test(String(e?.message))) {
        return chat({ apiKey: this.apiKey, model: this.model, messages, tool, maxTokens, forceTool: false, signal: this.abort!.signal });
      }
      throw e;
    });
    this.track(res.cost);
    if (!res.toolArgs) {
      this.ev.log('Model answered without calling the tool; asking again…');
      res = await chat({
        apiKey: this.apiKey,
        model: this.model,
        messages: [...messages, { role: 'assistant', content: res.content.slice(0, 2000) }, { role: 'user', content: `Respond ONLY by calling the ${tool.function.name} tool with valid arguments.` }],
        tool,
        maxTokens,
        signal: this.abort.signal,
      });
      this.track(res.cost);
    }
    if (!res.toolArgs) throw new Error('model did not return a usable script');
    return res.toolArgs;
  }

  private track(cost: number) {
    this.calls++;
    this.cost += cost;
    this.ev.stats(`${this.calls} calls · $${this.cost.toFixed(4)} spent this session · ${this.model}`);
  }

  private history(): { title: string; logline: string }[] {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private remember(plan: Plan) {
    const h = [...this.history(), { title: plan.meta.title, logline: plan.meta.logline }].slice(-25);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  }

  private nextCode() {
    const n = Number(localStorage.getItem(COUNTER_KEY) ?? '0') + 1;
    localStorage.setItem(COUNTER_KEY, String(n));
    const season = 11 + Math.floor((n - 1) / 22);
    const ep = ((n - 1) % 22) + 1;
    return `S${season}E${String(ep).padStart(2, '0')}`;
  }

  private async plan(): Promise<Plan> {
    this.ev.status('pitching a new episode…', 'busy');
    const past = this.history();
    const user = [
      'Pitch and outline the next episode. Use 3 or 4 scenes; vary the sets; give every main character something to do; build to a satisfying, funny ending with a Future Ted button.',
      'Cast up to 3 guest stars if the story needs new faces (a date, a mark, a rival, a boss): give each a vivid look and a comic hook, and put their ids in the scenes that need them. Plan where an imagined cutaway or flashback would land a joke, if one would.',
      past.length ? `Recent episodes (don't repeat these premises):\n${past.slice(-12).map((p) => `- ${p.title}: ${p.logline}`).join('\n')}` : '',
      `Some random inspiration (optional): ${pick(INSPIRATION)}.`,
    ]
      .filter(Boolean)
      .join('\n\n');
    const args = await this.call([{ role: 'system', content: showBible(this.sets) }, { role: 'user', content: user }], PLAN_TOOL, 2500);
    const guests = normalizeGuests(args.guests);
    const casting: Casting = { guests };
    const rawScenes = Array.isArray(args.scenes) ? args.scenes : [];
    const scenes: PlannedScene[] = rawScenes.slice(0, 4).map((s: Record<string, unknown>) => ({
      location: asLocation(s.location),
      time: asTime(s.time),
      transition: asTransition(s.transition),
      summary: String(s.summary ?? ''),
      characters: (Array.isArray(s.characters) ? s.characters : []).map((c: unknown) => asChar(c, casting)).filter((c): c is CharacterId => !!c && !isKid(c)),
    }));
    if (!scenes.length) throw new Error('episode plan had no scenes');
    const meta: EpisodeMeta = {
      id: uid(),
      title: String(args.title ?? 'The Untitled Episode').slice(0, 80),
      logline: String(args.logline ?? '').slice(0, 300),
      code: this.nextCode(),
      source: 'llm',
    };
    const cameos = guests.length ? ` · guest stars: ${guests.map((g) => g.name).join(', ')}` : '';
    this.ev.log(`☂ Pitched ${meta.code} “${meta.title}” — ${meta.logline}${cameos}`);
    return { meta, coldOpen: String(args.cold_open ?? ''), couch: kidsReaction(args.kids_reaction), guests, scenes };
  }

  private async writeScene(plan: Plan, index: number, previous: Scene[]): Promise<Scene> {
    const ps = plan.scenes[index];
    const set = this.sets[ps.location];
    this.ev.status(`writing scene ${index + 1}/${plan.scenes.length} (${set.name})…`, 'busy');
    const outline = plan.scenes.map((s, i) => `${i + 1}. [${s.location}, ${s.time}, ${s.transition ?? 'automatic transition'}] ${s.summary}${i === index ? '   ← WRITE THIS ONE' : ''}`).join('\n');
    const name = (id: string) => plan.guests.find((g) => g.id === id)?.name ?? charName(id);
    const recap = previous
      .map((s, i) => `--- Scene ${i + 1} (${s.location}) ---\n` + s.beats.flatMap((b) => beatText(b, name)).slice(-40).join('\n'))
      .join('\n');
    const guests = plan.guests.length
      ? `Guest stars this episode (use these ids for them in cast, character and to):\n${plan.guests.map((g) => `- ${g.id} = ${g.name}${g.role ? `: ${g.role}` : ''}`).join('\n')}`
      : '';
    const last = index === plan.scenes.length - 1;
    const user = [
      `Episode ${plan.meta.code}: "${plan.meta.title}" — ${plan.meta.logline}`,
      `Cold open (already aired): ${plan.coldOpen}`,
      `Outline:\n${outline}`,
      guests,
      recap ? `What has aired so far this episode:\n${recap}` : '',
      `Now write scene ${index + 1} at ${set.name} (${ps.location}), ${ps.time}. Characters: ${ps.characters.map((c) => `${name(c)} (${c})`).join(', ') || 'your choice'}. Valid marks here: ${Object.keys(set.marks).join(', ')}.`,
      `Aim for 16-30 beats. Lines short and punchy. ${last ? 'This is the final scene: pay off the episode and end with a Future Ted narration button (a reaction from the kids on the couch can top it), then a laugh or aww.' : 'End on a strong button joke.'}`,
    ]
      .filter(Boolean)
      .join('\n\n');
    const args = await this.call([{ role: 'system', content: showBible(this.sets) }, { role: 'user', content: user }], SCENE_TOOL, 6000);
    const scene = normalizeScene(args, ps.location, ps.time, ps.summary, { guests: plan.guests });
    scene.transition ??= ps.transition;
    if (scene.beats.length < 4) throw new Error(`scene ${index + 1} came back nearly empty`);
    const lines = scene.beats.filter((b) => b.type === 'say').length;
    const cutaways = scene.beats.filter((b) => b.type === 'cutaway').length;
    this.ev.log(`✎ Scene ${index + 1}/${plan.scenes.length} at ${set.name}: ${scene.beats.length} beats, ${lines} lines${cutaways ? `, ${cutaways} cutaway${cutaways > 1 ? 's' : ''}` : ''}`);
    return scene;
  }
}

/** The kids' lines after the cold open (and Future Ted's comebacks). */
function kidsReaction(raw: unknown): Beat[] {
  const out: Beat[] = [];
  for (const r of (Array.isArray(raw) ? raw : []).slice(0, 3)) {
    const line = String((r as Record<string, unknown>)?.line ?? '').trim();
    if (!line) continue;
    const who = asChar((r as Record<string, unknown>).speaker);
    const emotion = (EMOTIONS as readonly string[]).includes(String((r as Record<string, unknown>).emotion)) ? ((r as Record<string, unknown>).emotion as Emotion) : 'bored';
    out.push(who && isKid(who) ? { type: 'say', character: who, line, emotion } : { type: 'narrate', line });
  }
  return out;
}

function beatText(b: Beat, name: (id: string) => string): string[] {
  switch (b.type) {
    case 'say': return [`${name(b.character).toUpperCase()}${b.delivery ? ` (${b.delivery})` : ''}: ${b.line}`];
    case 'narrate': return [`FUTURE TED: ${b.line}`];
    case 'enter': return [`(${name(b.character)} enters)`];
    case 'exit': return [`(${name(b.character)} leaves)`];
    case 'cutaway': return [`[${b.style} cutaway at ${b.location}${b.label ? `: ${b.label}` : ''}]`, ...b.beats.flatMap((x) => beatText(x, name)), '[back to the scene]'];
    default: return [];
  }
}

const INSPIRATION = [
  'a misunderstanding about a text message', 'a new bar rule', 'a bet that spirals', 'an ex comes back', 'a lost object of great sentimental value',
  "Barney's most elaborate play yet", 'a game night gone wrong', 'Ted gets obsessed with a word', "Robin's news segment goes viral", 'Marshall and Lily try to be spontaneous',
  'the gang tries a new booth', 'a terrible roommate', 'a wedding toast', 'someone learns a secret skill', 'an intervention', 'a doppelganger sighting',
  'a pact made years ago comes due', 'a fake holiday invented by Barney', 'the gang gets banned from somewhere', 'a quest for the perfect sandwich',
];

/** Decides what airs next: live LLM episodes when available, reruns otherwise. */
export class Programming implements ContentSource {
  private local: ShowItem[] = [];
  constructor(private writer: Showrunner) {}

  dropEpisode(id: string) {
    this.local = this.local.filter((i) => i.episode.id !== id);
    this.writer.abandon(id);
  }

  async next(onWaiting: (msg: string) => void): Promise<ShowItem> {
    let waited = 0;
    for (;;) {
      if (this.local.length) return this.local.shift()!;
      if (this.writer.queue.length) return this.writer.queue.shift()!;
      if (!this.writer.running) {
        this.local.push(...sampleEpisode());
        continue;
      }
      if (waited % 6 === 0) onWaiting(pick(STANDBY));
      waited++;
      await sleep(1000);
    }
  }
}

const STANDBY = [
  "The writers are at MacLaren's. They'll be right back.",
  'Barney is suiting up. This may take a while.',
  "Ted is explaining the etymology of 'scene'. Please hold.",
  'Marshall is eating the craft services table.',
  'Lily is reading the script. Lily has notes.',
  'Robin is refusing to talk about Robin Sparkles.',
  'Wait for it…',
  'Kids, this next part took a while to write.',
];
