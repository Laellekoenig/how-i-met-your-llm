import type { EpisodeMeta, EpisodeScript, ShowItem } from './types';
import type { ContentSource } from '../show/player';

/** Airing order: by season and episode code. */
export const byCode = (a: EpisodeScript, b: EpisodeScript) => a.code.localeCompare(b.code, 'en', { numeric: true });

/** Everything the player needs to air one episode, from the cold open to the closing credits. */
export function episodeItems(ep: EpisodeScript, id: string): ShowItem[] {
  const meta: EpisodeMeta = { id, code: ep.code, title: ep.title, logline: ep.logline };
  return [
    { kind: 'episode-start', episode: meta, coldOpen: ep.coldOpen, couch: ep.couch, guests: ep.guests },
    ...ep.scenes.map((scene, index) => ({ kind: 'scene' as const, episode: meta, index, scene })),
    { kind: 'episode-end', episode: meta },
  ];
}

/** Airs the catalog back to back, in order, forever. */
export class Syndication implements ContentSource {
  private items: ShowItem[] = [];
  private aired = 0;

  constructor(private episodes: EpisodeScript[], private at = 0) {
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
  }

  async next(): Promise<ShowItem> {
    if (!this.items.length) {
      const ep = this.episodes[this.at++ % this.episodes.length];
      this.items = episodeItems(ep, `${ep.code}-${++this.aired}`);
    }
    return this.items.shift()!;
  }
}
