import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { byCode } from '../../src/script/episodes';
import type { EpisodeScript } from '../../src/script/types';

const read = (dir: string, files: string[]) => files
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as EpisodeScript)
  .sort(byCode);
const jsonIn = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

// The same catalog the app bundles with import.meta.glob, read straight from disk.
const DIR = join(import.meta.dir, '..', '..', 'episodes');

export const EPISODE_FILES = jsonIn(DIR);

export const EPISODES: EpisodeScript[] = read(DIR, EPISODE_FILES);

// Retired episodes kept as fixtures, so the tests don't depend on what is currently airing.
const FIXTURE_DIR = join(import.meta.dir, '..', 'fixtures');

export const FIXTURES: EpisodeScript[] = read(FIXTURE_DIR, jsonIn(FIXTURE_DIR));

/** Every script the tests can lean on: the fixtures plus the current catalog. */
export const SCRIPTS: EpisodeScript[] = [...FIXTURES, ...EPISODES];

/** The original reruns, which the tests lean on as fixtures. */
export const rerun = (title: string) => {
  const ep = FIXTURES.find((e) => e.title === title);
  if (!ep) throw new Error(`no episode called ${title}`);
  return ep;
};
