import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { AudioEngine } from '../src/audio/audio';
import { THEME_CHORDS, scoreEvents } from '../src/audio/score';
import { MONTAGE_MUSIC, SCORES } from '../src/script/types';
import { validateEpisode } from '../src/script/validate';
import { testStage } from './helpers/sets';

const spies: { mockRestore(): void }[] = [];
afterEach(() => spies.splice(0).forEach((s) => s.mockRestore()));

/** A controllable audio clock: real synthesis buffers, recorded scheduling, no speakers or wall-clock timers. */
function rig() {
  const timers = new Set<() => void>();
  spies.push(spyOn(globalThis, 'setInterval').mockImplementation((fn) => {
    timers.add(fn as () => void);
    return fn as unknown as ReturnType<typeof setInterval>;
  }));
  spies.push(spyOn(globalThis, 'clearInterval').mockImplementation((id) => { timers.delete(id as unknown as () => void); }));
  const starts: { time: number; buffer: AudioBuffer | null }[] = [];
  const buffers: Float32Array[] = [];
  const gains: { value: number; fades: number[] }[] = [];
  const param = () => ({
    value: 1, fades: [] as number[],
    setValueAtTime(value: number) { this.value = value; },
    exponentialRampToValueAtTime() {},
    setTargetAtTime(value: number) { this.fades.push(value); },
  });
  const node = () => ({
    gain: param(), frequency: param(), buffer: null as AudioBuffer | null,
    connect(dest: unknown) { return dest; },
    start(time: number) { starts.push({ time, buffer: this.buffer }); },
    stop() {},
  });
  const clock = {
    currentTime: 0, sampleRate: 8000,
    createGain() { const n = node(); gains.push(n.gain); return n; },
    createBuffer(_channels: number, length: number, sampleRate: number) {
      const data = new Float32Array(length);
      buffers.push(data);
      return { length, duration: length / sampleRate, sampleRate, getChannelData: () => data } as AudioBuffer;
    },
    createBufferSource: node, createOscillator: node, createBiquadFilter: node, createWaveShaper: node,
  };
  const engine = new AudioEngine();
  engine.ctx = clock as unknown as AudioContext;
  Object.assign(engine, { musicBus: node(), noise: clock.createBuffer(1, 16000, clock.sampleRate) });
  return { engine, clock, timers, starts, buffers, gains, tick: () => timers.forEach((fn) => fn()) };
}

describe('score music', () => {
  test('every mood validates as both underscore and montage; stop controls remain score-only', () => {
    const sets = testStage().sets;
    const shot = { location: 'apartment', time: 'night', cast: [{ character: 'ted', mark: 'couch_left' }], beats: [] };
    const episode = (beats: unknown[]) => ({
      code: 'S99E01', title: 'Music', logline: 'A listening test.',
      scenes: [{ ...shot, beats }],
    });
    for (const music of MONTAGE_MUSIC) {
      expect(validateEpisode(episode([{ type: 'score', music }, { type: 'montage', music, shots: [shot, shot] }]), sets).errors).toEqual([]);
    }
    for (const music of ['none', 'silence']) {
      expect(validateEpisode(episode([{ type: 'score', music }]), sets).errors).toEqual([]);
      expect(validateEpisode(episode([{ type: 'montage', music, shots: [shot, shot] }]), sets).errors.length).toBeGreaterThan(0);
    }
    expect(validateEpisode(episode([{ type: 'score', music: 'unknown' }]), sets).errors.length).toBeGreaterThan(0);
    expect(SCORES).toHaveLength(12);
  });

  for (const kind of MONTAGE_MUSIC) {
    test(`${kind}: synthesizes finite audio, loops, holds on a paused clock, and cancels scheduled playback`, () => {
      const r = rig();
      r.engine.montage(kind);
      expect(r.engine.bedKind).toBe(kind);
      expect(r.timers.size).toBe(1);
      expect(r.starts.length).toBeGreaterThan(0);
      const first = r.starts.length;
      r.tick();
      r.tick();
      expect(r.starts.length).toBe(first); // suspended AudioContext holds the music's position
      for (let time = 0.3; time < 24; time += 0.3) {
        r.clock.currentTime = time;
        r.tick();
      }
      expect(r.starts.at(-1)!.time).toBeGreaterThan(23);
      for (const data of r.buffers.slice(1)) {
        expect(data.some((x) => Math.abs(x) > 0.001)).toBe(true);
        expect(data.every((x) => Number.isFinite(x) && Math.abs(x) <= 1.001)).toBe(true);
      }
      r.engine.stopBed();
      expect(r.engine.bedKind).toBeNull();
      expect(r.timers.size).toBe(0);
      expect(r.gains[0].fades).toEqual([0]); // the common output also silences notes already queued ahead
      const stopped = r.starts.length;
      r.clock.currentTime += 5;
      r.tick();
      expect(r.starts.length).toBe(stopped);
    });
  }

  test('no bed borrows the main-title theme\'s changes: the intro music is reserved for the titles', () => {
    const classes = (notes: number[]) => new Set(notes.map((m) => m % 12));
    const { E, B, Cs, A } = THEME_CHORDS;
    const theme = [E, B, Cs, A].map(classes);
    for (const kind of MONTAGE_MUSIC) {
      // the pitch classes sounding in each of the first 32 bars (one bar is eight ticks)
      const bars = Array.from({ length: 32 }, (_, bar) => classes(Array.from({ length: 8 }, (_, k) => scoreEvents(kind, bar * 8 + k))
        .flat().flatMap((e) => ('midi' in e ? [e.midi] : []))));
      for (let bar = 0; bar + theme.length <= bars.length; bar++) {
        const quotes = theme.every((chord, j) => [...chord].every((pc) => bars[bar + j].has(pc)));
        expect(quotes ? `${kind} plays the theme's changes from bar ${bar}` : null).toBeNull();
      }
    }
  });

  test('switching cues fades the previous output and leaves only one scheduler', () => {
    const r = rig();
    for (const kind of MONTAGE_MUSIC) {
      r.engine.montage(kind);
      expect(r.timers.size).toBe(1);
      expect(r.engine.bedKind).toBe(kind);
    }
    expect(r.gains.filter((g) => g.fades.includes(0))).toHaveLength(MONTAGE_MUSIC.length - 1);
    r.engine.stopBed();
    expect(r.timers.size).toBe(0);
  });

  test('a locked audio context skips music without creating a timer', () => {
    const r = rig();
    r.engine.ctx = null;
    r.engine.montage('dreamy');
    expect(r.engine.bedKind).toBeNull();
    expect(r.timers.size).toBe(0);
    expect(r.starts).toEqual([]);
  });
});
