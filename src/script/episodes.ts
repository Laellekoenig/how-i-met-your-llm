import type { CharacterId, Costume, EpisodeMeta, EpisodeScript, Scene, ShowItem } from './types';
import type { ContentSource } from '../show/player';
import { resolveStrands } from './strands';

/** Airing order: by season and episode code. */
export const byCode = (a: EpisodeScript, b: EpisodeScript) => a.code.localeCompare(b.code, 'en', { numeric: true });

/** Everything the player needs to air one episode, from the cold open to the closing credits. */
export function episodeItems(script: EpisodeScript, id: string): ShowItem[] {
  const resolved = resolveStrands(script);
  const ep = { ...resolved, scenes: keptWardrobe(resolved.scenes) };
  const meta: EpisodeMeta = { id, code: ep.code, title: ep.title, logline: ep.logline };
  const storyOpening = !ep.coldOpen && !ep.couch?.length;
  return [
    { kind: 'episode-start', episode: meta, coldOpen: ep.coldOpen, couch: ep.couch, openingScene: storyOpening ? ep.scenes[0] : undefined, guests: ep.guests, wardrobe: ep.wardrobe },
    ...ep.scenes.flatMap((scene, index) => storyOpening && index === 0 ? [] : [{ kind: 'scene' as const, episode: meta, index, scene }]),
    { kind: 'episode-end', episode: meta },
  ];
}

/**
 * A scene's costume marked `keep` stays on for the rest of the episode (the lost bet), under each later scene's
 * own costumes, until another `keep` costume replaces it (one with nothing else in it takes it off).
 */
function keptWardrobe(scenes: Scene[]): Scene[] {
  const kept = new Map<CharacterId, Costume>();
  return scenes.map((scene) => {
    const worn = new Map(kept);
    for (const { keep, ...c } of scene.wardrobe ?? []) {
      if (!keep) worn.set(c.character, { ...worn.get(c.character), ...c });
      else if (Object.keys(c).length > 1) {
        kept.set(c.character, c);
        worn.set(c.character, c);
      } else {
        kept.delete(c.character);
        worn.delete(c.character);
      }
    }
    return worn.size || scene.wardrobe ? { ...scene, wardrobe: [...worn.values()] } : scene;
  });
}

/** Airs the catalog back to back, in order, forever, once an episode is picked. */
export class Syndication implements ContentSource {
  private items: ShowItem[] = [];
  private aired = 0;
  private tuned: (() => void) | null = null;

  /** `at` null starts off the air: next() waits until an episode is picked with seek(). */
  constructor(private episodes: EpisodeScript[], private at: number | null = 0) {
    if (!episodes.length) throw new Error('no episodes to air');
  }

  /** The catalog position of an episode code ("S11E03", any case), if there is one. */
  static indexOf(episodes: EpisodeScript[], code: string | null) {
    return code ? episodes.findIndex((e) => e.code.toLowerCase() === code.toLowerCase()) : -1;
  }

  /** Air the episode at this catalog position next, from its cold open, dropping the rest of the current one. */
  seek(index: number) {
    this.at = index;
    this.items = [];
    this.tuned?.();
  }

  /** Go off the air (back to the guide): drop the rest of the current episode and air nothing until the next seek(). */
  off() {
    this.at = null;
    this.items = [];
  }

  async next(): Promise<ShowItem> {
    while (this.at === null) await new Promise<void>((r) => (this.tuned = r));
    this.tuned = null;
    if (!this.items.length) {
      const ep = this.episodes[this.at++ % this.episodes.length];
      this.items = episodeItems(ep, `${ep.code}-${++this.aired}`);
    }
    return this.items.shift()!;
  }
}
