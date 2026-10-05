import type { EpisodeScript } from './types';
import { byCode } from './episodes';

// Every episode file in episodes/, bundled at build time. `bun run episodes check` validates them.
const files = import.meta.glob<EpisodeScript>('/episodes/*.json', { eager: true, import: 'default' });

export const EPISODES: EpisodeScript[] = Object.values(files).sort(byCode);
