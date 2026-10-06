import { byCode } from './episodes';
import type { EpisodeScript } from './types';

// The writers' continuity ledger: what each episode's `continuity` notes say is true, in airing order. The
// timeline is loose, and unreliable narration is allowed, but a fact that quietly changes between episodes is
// usually a mistake: changes have to be listed as such.

export interface Ledger {
  /** Each fact's latest value, and the episode that set it. */
  facts: Map<string, { value: string; code: string }>;
  /** Threads (bets, promises, a costume someone has to keep wearing) opened and not yet paid off. */
  open: Map<string, { note: string; code: string }>;
  eras: { code: string; era: string }[];
  issues: { code: string; message: string }[];
}

export function ledger(episodes: EpisodeScript[]): Ledger {
  const out: Ledger = { facts: new Map(), open: new Map(), eras: [], issues: [] };
  for (const ep of [...episodes].sort(byCode)) {
    const c = ep.continuity;
    if (!c) continue;
    const flag = (message: string) => out.issues.push({ code: ep.code, message });
    if (c.era) out.eras.push({ code: ep.code, era: c.era });
    for (const [key, value] of Object.entries(c.facts ?? {})) {
      const before = out.facts.get(key);
      if (before && before.value !== value && !c.changes?.includes(key)) {
        flag(`${key} is "${value}" here but "${before.value}" in ${before.code}: list it in "changes" if that's on purpose`);
      }
      out.facts.set(key, { value, code: ep.code });
    }
    for (const id of c.closes ?? []) {
      if (!out.open.has(id)) flag(`closes "${id}", which no earlier episode left open`);
      out.open.delete(id);
    }
    for (const { id, note } of c.opens ?? []) {
      const already = out.open.get(id);
      if (already) flag(`opens "${id}", already open since ${already.code}`);
      out.open.set(id, { note, code: ep.code });
    }
  }
  return out;
}
