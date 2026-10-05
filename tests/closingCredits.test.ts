import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { Player } from '../src/show/player';
import { audio } from '../src/audio/audio';
import { openingCredits, type CreditCard } from '../src/show/credits';
import type { ShowItem } from '../src/script/types';

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const spies: { mockRestore(): void }[] = [];
afterEach(() => spies.splice(0).forEach(s => s.mockRestore()));

async function eventually(check: () => boolean, timeout = 1000) {
  const start = performance.now();
  while (!check()) {
    if (performance.now() - start > timeout) throw new Error('Closing credits did not reach the expected state');
    await sleep(10);
  }
}

function playback() {
  const stage = { actors: {}, current: { id: 'future' } };
  const renderer = { fade: 1, rewind: 0, dream: 0, ripple: 0, memory: 0 };
  const shown: CreditCard[][] = [];
  let visible: CreditCard[] | null = null;
  let caption = true, location = true, year = true;
  const overlay = {
    standby() {},
    hideCaption() { caption = false; },
    hideLocation() { location = false; },
    year(on: boolean) { year = on; },
    hideCards() { visible = null; },
    closingCredit(cards: CreditCard[] | null) { visible = cards; if (cards) shown.push(cards); },
  };
  const episode = { id: 'ending', code: 'S09E99', title: 'Never Put This On Screen', logline: 'No logline either' };
  const billing = openingCredits();
  let requests = 0;
  const source = { next: () => ++requests === 1
    ? Promise.resolve<ShowItem>({ kind: 'episode-end', episode })
    : new Promise<ShowItem>(() => {}) };
  const player = new Player(stage as never, {} as never, renderer as never, overlay as never, {} as never, source);
  // Seed the billing selected by the opening of the same episode.
  Object.assign(player, { billing });
  void player.run();
  return { player, renderer, shown, billing, episode, visible: () => visible,
    graphics: () => ({ caption, location, year }), finished: () => requests > 1 };
}

describe('closing-credit playback', () => {
  test('plays a short crew sequence without episode metadata, then clears it for the next episode', async () => {
    const theme = spyOn(audio, 'theme');
    const stop = spyOn(audio, 'stopSting');
    const ambience = spyOn(audio, 'ambience');
    spies.push(theme, stop, ambience);
    const p = playback();
    await eventually(() => p.visible() !== null);
    expect(p.renderer.fade).toBe(0);
    expect(p.graphics()).toEqual({ caption: false, location: false, year: false });
    expect(ambience).toHaveBeenCalledWith('none');
    const started = performance.now();
    await eventually(p.finished, 14000);
    expect(performance.now() - started).toBeGreaterThan(11500);
    expect(p.shown.length).toBeGreaterThan(1);
    expect(p.shown[0][0].name).toBe(p.billing.creators.name.replace(' &\n', '\n'));
    const text = p.shown.flat().map(c => `${c.label} ${c.name}`).join(' ');
    for (const metadata of [p.episode.title, p.episode.code, p.episode.logline, "and that's how it happened."]) {
      expect(text).not.toContain(metadata);
    }
    expect(text).toContain('costume designer');
    expect(text).toContain('music by');
    expect(theme).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalled();
    expect(p.visible()).toBeNull();
  }, 16000);

  for (const level of ['scene', 'episode'] as const) test(`pause freezes credits and ${level} skip clears them immediately`, async () => {
    // A short cue makes crossing a card boundary during pause observable without a long wait.
    const theme = spyOn(audio, 'theme').mockReturnValue({ beat: 0.2, duration: 0.4 });
    const stop = spyOn(audio, 'stopSting');
    spies.push(theme, stop);
    const p = playback();
    await eventually(() => p.visible() !== null);
    p.player.paused = true;
    const first = p.visible();
    await sleep(200);
    expect(p.visible()).toBe(first);
    expect(p.shown).toHaveLength(1);
    expect(p.finished()).toBe(false);
    p.player.skip(level);
    await eventually(p.finished);
    expect(p.visible()).toBeNull();
    expect(stop).toHaveBeenCalled();
    expect(p.renderer.fade).toBe(1);
  });
});
