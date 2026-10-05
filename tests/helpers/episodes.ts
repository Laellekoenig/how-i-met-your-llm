import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { byCode } from '../../src/script/episodes';
import type { EpisodeScript } from '../../src/script/types';

// The same catalog the app bundles with import.meta.glob, read straight from disk.
const DIR = join(import.meta.dir, '..', '..', 'episodes');

export const EPISODE_FILES = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();

export const EPISODES: EpisodeScript[] = EPISODE_FILES
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as EpisodeScript)
  .sort(byCode);

/** The four original reruns, which the tests lean on as fixtures. */
export const rerun = (title: string) => {
  const ep = EPISODES.find((e) => e.title === title);
  if (!ep) throw new Error(`no episode called ${title}`);
  return ep;
};
