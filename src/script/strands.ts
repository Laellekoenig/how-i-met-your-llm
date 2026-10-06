import type { Beat, EpisodeScript, ReplayBeat, Scene, Strand } from './types';

// Intercutting and replays. A scene or cutaway with an `id` is a strand: a later scene can `resume` it exactly as
// it was left, and a `replay` beat can show it again with changes. Before an episode airs, every resumed scene
// and replay is given the strand it refers to, so the player never has to look anything up.

/** The original's beats from `from` to `to`, with the replay's changes made. */
export function replayBeats(original: Beat[], r: Pick<ReplayBeat, 'from' | 'to' | 'changes'>): Beat[] {
  const from = r.from ?? 0;
  const to = Math.min(r.to ?? original.length - 1, original.length - 1);
  const changes = r.changes ?? [];
  const out: Beat[] = [];
  for (let i = from; i <= to + 1; i++) {
    for (const c of changes) if (c.at === i && c.insert) out.push(...c.insert);
    if (i > to) break;
    const swap = changes.find((c) => c.at === i && c.replace);
    out.push(...(swap ? swap.replace! : [original[i]]));
  }
  return out;
}

/** The episode with each resumed scene's `strand` and each replay's `strand` filled in. */
export function resolveStrands(ep: EpisodeScript): EpisodeScript {
  /** What each id names: one scene or cutaway, for replays. */
  const segments = new Map<string, Strand>();
  /** How each strand stood when we last left it, for the next scene that resumes it. */
  const latest = new Map<string, Strand>();

  const walk = (beats: Beat[]): Beat[] => beats.map((b): Beat => {
    switch (b.type) {
      case 'cutaway': {
        const c = { ...b, beats: walk(b.beats) };
        if (b.id) segments.set(b.id, { location: b.location, time: b.time, cast: b.cast, before: [], beats: c.beats, style: b.style, wardrobe: b.wardrobe });
        return c;
      }
      case 'montage':
        return { ...b, shots: b.shots.map((s) => ({ ...s, beats: walk(s.beats) })) };
      case 'split':
        return { ...b, beats: walk(b.beats) };
      case 'replay': {
        const changes = b.changes?.map((c) => ({ ...c, replace: c.replace && walk(c.replace), insert: c.insert && walk(c.insert) }));
        const strand = segments.get(b.of);
        return { ...b, changes, ...(strand ? { strand } : {}) };
      }
      default:
        return b;
    }
  });

  const scenes = ep.scenes.map((scene): Scene => {
    let s: Scene = scene;
    const from = scene.resume ? latest.get(scene.resume) : undefined;
    if (from) {
      s = {
        ...scene, location: from.location, time: from.time, cast: from.cast, wardrobe: scene.wardrobe ?? from.wardrobe,
        strand: { ...from, before: [...from.before, ...from.beats], beats: scene.beats },
      };
    }
    s = { ...s, beats: walk(s.beats) };
    if (s.location === 'future') return s;
    const own: Strand = { location: s.location, time: s.time, cast: s.cast, before: s.strand?.before ?? [], beats: s.beats, wardrobe: s.wardrobe };
    if (scene.resume && from) latest.set(scene.resume, own);
    if (scene.id) {
      segments.set(scene.id, own);
      latest.set(scene.id, own);
    }
    return s;
  });
  return { ...ep, scenes };
}
