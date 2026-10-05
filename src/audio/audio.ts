import { TITLE_BEAT, TITLE_BEATS, TITLE_TAIL } from '../show/mainTitles';
import type { LaughKind } from '../script/types';
import type { Ambience, DoorSound } from '../world/sets/common';
import { rand, pick } from '../util';

// Everything here is synthesized with WebAudio — no samples. A crowd laugh is
// ~30 formant-filtered "ha-ha-ha" voices with jittered timing into a reverb.

type Vowel = [number, number, number];
const VOWEL_A: Vowel = [800, 1200, 2600];
const VOWEL_AE: Vowel = [700, 1700, 2500];
const VOWEL_OO: Vowel = [320, 870, 2250];
const VOWEL_AW: Vowel = [570, 880, 2400];

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private laughBus!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private stingGain: GainNode | null = null;
  private ambBus!: GainNode;
  private reverb!: ConvolverNode;
  private noise!: AudioBuffer;
  private clapBuf!: AudioBuffer;
  private ambNodes: AudioNode[] = [];
  private ambTimer: number | null = null;
  volume = 0.8;
  /** Silent mode for automated testing: everything still runs, nothing reaches the speakers. */
  muted = false;

  /** A context the browser hasn't let start yet (autoplay policy): it goes live on the first user gesture. */
  private pending: AudioContext | null = null;

  /** Start the audio graph. Safe to call repeatedly; call it again from a user gesture to unlock autoplay. */
  init() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    if (!this.pending) {
      const ctx = (this.pending = new AudioContext());
      ctx.onstatechange = () => {
        if (ctx.state !== 'running' || this.ctx) return;
        this.pending = null;
        this.build(ctx);
      };
    }
    // Sounds scheduled on a suspended clock would all fire at once on unlock, so until the
    // context runs `ctx` stays null and every cue is skipped.
    if (this.pending.state === 'running') {
      this.build(this.pending);
      this.pending = null;
    } else void this.pending.resume();
  }

  private build(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(1.8, 2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    this.reverb.connect(wet).connect(this.master);

    const mk = (g: number, rev = 0) => {
      const n = ctx.createGain();
      n.gain.value = g;
      n.connect(this.master);
      if (rev) {
        const s = ctx.createGain();
        s.gain.value = rev;
        n.connect(s).connect(this.reverb);
      }
      return n;
    };
    this.laughBus = mk(0.9, 0.9);
    this.sfxBus = mk(0.8, 0.3);
    this.musicBus = mk(0.55, 0.4);
    this.ambBus = mk(0.5, 0.2);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    this.clapBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
    const cd = this.clapBuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++) {
      const t = i / ctx.sampleRate;
      const env = t < 0.012 ? Math.exp(-t * 300) * (1 + Math.sin(t * 900)) * 0.5 + Math.exp(-t * 120) * 0.5 : Math.exp(-t * 120) * 0.5;
      cd[i] = (Math.random() * 2 - 1) * env;
    }
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.05);
  }

  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  private noiseSrc(t0: number, dur: number) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = rand(0, 1.5);
    s.start(t0, rand(0, 1.5));
    s.stop(t0 + dur);
    return s;
  }

  // ------------------------------------------------------------- laughs

  /** One synthetic voice laughing/ooh-ing. Returns end time. */
  private voice(t0: number, o: { f0: number; dur: number; vowel: Vowel; female: boolean; gain: number; pulse: number | null; glide: number; pan: number }) {
    const ctx = this.ctx!;
    const end = t0 + o.dur;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const f = o.f0;
    osc.frequency.setValueAtTime(f * (1 + o.glide * 0.3), t0);
    osc.frequency.linearRampToValueAtTime(f * (1 + o.glide), t0 + o.dur * 0.3);
    osc.frequency.exponentialRampToValueAtTime(f * (o.glide >= 0 ? 0.78 : 0.7), end);
    const vib = ctx.createOscillator();
    vib.frequency.value = rand(4, 7);
    const vibG = ctx.createGain();
    vibG.gain.value = f * 0.03;
    vib.connect(vibG).connect(osc.frequency);

    const src = ctx.createGain();
    osc.connect(src);
    const nz = this.noiseSrc(t0, o.dur + 0.1);
    const nzG = ctx.createGain();
    nzG.gain.value = o.pulse ? 0.55 : 0.25;
    nz.connect(nzG).connect(src);

    const env = ctx.createGain();
    env.gain.value = 0;
    const scale = o.female ? 1.17 : 1;
    const gains = [1, 0.6, 0.25];
    o.vowel.forEach((fr, i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = fr * scale * rand(0.94, 1.06);
      bp.Q.value = [6, 8, 10][i];
      const g = ctx.createGain();
      g.gain.value = gains[i] * 2.2;
      src.connect(bp).connect(g).connect(env);
    });
    const pan = ctx.createStereoPanner();
    pan.pan.value = o.pan;
    env.connect(pan).connect(this.laughBus);

    const G = env.gain;
    G.setValueAtTime(0.0001, t0);
    if (o.pulse) {
      let t = t0;
      while (t < end - 0.05) {
        const life = (t - t0) / o.dur;
        const amp = o.gain * Math.pow(1 - life, 0.6) * rand(0.6, 1);
        const per = o.pulse * rand(0.85, 1.15) * (1 + life * 0.5);
        G.setValueAtTime(0.0001, t);
        G.linearRampToValueAtTime(amp, t + 0.025);
        G.exponentialRampToValueAtTime(Math.max(amp * 0.2, 0.0001), t + per * 0.55);
        G.linearRampToValueAtTime(0.0001, t + per * 0.92);
        t += per;
      }
    } else {
      G.linearRampToValueAtTime(o.gain, t0 + o.dur * 0.25);
      G.linearRampToValueAtTime(o.gain * 0.7, t0 + o.dur * 0.7);
      G.linearRampToValueAtTime(0.0001, end);
    }
    osc.start(t0);
    vib.start(t0);
    osc.stop(end + 0.05);
    vib.stop(end + 0.05);
    return end;
  }

  private crowdBed(t0: number, dur: number, gain: number, freq = 900) {
    const ctx = this.ctx!;
    const nz = this.noiseSrc(t0, dur + 0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.25);
    g.gain.linearRampToValueAtTime(gain * 0.6, t0 + dur * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    nz.connect(bp).connect(g).connect(this.laughBus);
  }

  private applause(t0: number, dur: number, n: number, gain: number) {
    const ctx = this.ctx!;
    for (let i = 0; i < n; i++) {
      const per = rand(0.16, 0.28);
      const pan = rand(-0.8, 0.8);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = rand(900, 2600);
      bp.Q.value = rand(0.8, 2);
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      bp.connect(p).connect(this.laughBus);
      let t = t0 + rand(0, 0.35);
      const myEnd = t0 + dur * rand(0.7, 1);
      while (t < myEnd) {
        const life = (t - t0) / dur;
        const s = ctx.createBufferSource();
        s.buffer = this.clapBuf;
        s.playbackRate.value = rand(0.8, 1.3);
        const g = ctx.createGain();
        g.gain.value = gain * rand(0.5, 1) * (life < 0.15 ? life / 0.15 : 1 - Math.max(0, life - 0.6) / 0.4);
        s.connect(g).connect(bp);
        s.start(t);
        t += per * rand(0.9, 1.1);
      }
    }
  }

  /** Plays a laugh-track reaction. Returns its duration in seconds. */
  laugh(kind: LaughKind): number {
    if (!this.ctx) return 0;
    const t0 = this.ctx.currentTime + 0.05;
    const crowd = (n: number, durA: number, durB: number, gain: number, spread: number, vowelSet: Vowel[], pulse: [number, number] | null, glide = 0) => {
      let end = t0;
      for (let i = 0; i < n; i++) {
        const female = Math.random() < 0.5;
        const start = t0 + Math.pow(Math.random(), 2) * spread;
        end = Math.max(end, this.voice(start, {
          f0: female ? rand(190, 320) : rand(95, 170),
          dur: rand(durA, durB),
          vowel: pick(vowelSet),
          female,
          gain: gain * rand(0.5, 1),
          pulse: pulse ? rand(pulse[0], pulse[1]) : null,
          glide: glide * rand(0.6, 1.3),
          pan: rand(-0.9, 0.9),
        }));
      }
      return end - t0;
    };
    switch (kind) {
      case 'chuckle': {
        this.crowdBed(t0, 1.2, 0.03);
        return crowd(10, 0.6, 1.3, 0.05, 0.25, [VOWEL_A, VOWEL_AE], [0.17, 0.24]);
      }
      case 'laugh': {
        this.crowdBed(t0, 2.4, 0.06);
        return crowd(26, 1.3, 2.6, 0.06, 0.35, [VOWEL_A, VOWEL_AE, VOWEL_AW], [0.15, 0.21]);
      }
      case 'big': {
        this.crowdBed(t0, 3.8, 0.09);
        const d = crowd(40, 2.0, 3.8, 0.065, 0.45, [VOWEL_A, VOWEL_AE, VOWEL_AW], [0.14, 0.2]);
        if (Math.random() < 0.5) this.applause(t0 + 0.6, 2.6, 14, 0.25);
        return d;
      }
      case 'ooh':
        this.crowdBed(t0, 1.6, 0.025, 500);
        return crowd(28, 1.3, 1.9, 0.045, 0.2, [VOWEL_OO], null, 0.25);
      case 'aww':
        this.crowdBed(t0, 1.8, 0.02, 600);
        return crowd(28, 1.4, 2.0, 0.045, 0.2, [VOWEL_AW], null, -0.2);
      case 'woo': {
        crowd(16, 0.8, 1.4, 0.05, 0.3, [VOWEL_OO], null, 0.6);
        this.applause(t0, 3.2, 30, 0.35);
        return 3.0;
      }
      case 'applause':
        this.applause(t0, 3.5, 36, 0.35);
        return 3.3;
      case 'gasp': {
        const ctx = this.ctx;
        for (let i = 0; i < 18; i++) {
          const s = t0 + rand(0, 0.15);
          const nz = this.noiseSrc(s, 0.5);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.Q.value = 3;
          bp.frequency.setValueAtTime(rand(700, 1000), s);
          bp.frequency.linearRampToValueAtTime(rand(1600, 2400), s + 0.35);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, s);
          g.gain.linearRampToValueAtTime(0.06, s + 0.08);
          g.gain.linearRampToValueAtTime(0.0001, s + 0.45);
          nz.connect(bp).connect(g).connect(this.laughBus);
        }
        return 0.8;
      }
    }
  }

  // ------------------------------------------------------------- sfx

  slap() {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.clapBuf;
    s.playbackRate.value = 0.75;
    const g = this.ctx.createGain();
    g.gain.value = 1.4;
    s.connect(g).connect(this.sfxBus);
    s.start();
  }

  clink(when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    for (const f of [2600, 3900, 5200]) {
      const o = this.ctx.createOscillator();
      o.frequency.value = f * rand(0.97, 1.03);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.03, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(this.ambBus);
      o.start(t);
      o.stop(t + 0.55);
    }
  }

  door(kind: DoorSound) {
    if (kind === 'bell') this.doorbell();
    else if (kind === 'car') this.carDoor();
    else if (kind === 'elevator') this.elevatorDing();
  }

  /** A car door: a muffled thump with a little latch click on top. */
  carDoor() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.25;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.5, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(og).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.3);
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    n.connect(lp).connect(ng).connect(this.sfxBus);
    n.start(t, rand(0, 1), 0.15);
  }

  /** Elevator arrival chime. */
  elevatorDing() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [f, a] of [[1318, 0.12], [2636, 0.03], [3954, 0.015]]) {
      const o = this.ctx.createOscillator();
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(a, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g).connect(this.sfxBus);
      o.start(t);
      o.stop(t + 1.7);
    }
  }

  /** Something far off in the city: a car horn or, now and then, a siren going by. */
  private cityNoise(when = 0, siren = false) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    const g = ctx.createGain();
    lp.connect(g).connect(this.ambBus);
    if (siren) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      const dur = 4;
      for (let i = 0; i < dur * 1.5; i++) {
        o.frequency.setValueAtTime(700, t + i / 1.5);
        o.frequency.linearRampToValueAtTime(980, t + i / 1.5 + 0.33);
      }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.012, t + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur);
      return;
    }
    const len = rand(0.15, 0.5);
    for (const f of [410, 520].map((f) => f * rand(0.92, 1.08))) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      o.connect(lp);
      o.start(t);
      o.stop(t + len);
    }
    g.gain.setValueAtTime(0.008, t);
    g.gain.setValueAtTime(0.008, t + len - 0.03);
    g.gain.linearRampToValueAtTime(0, t + len);
  }

  /** Office phone trilling a couple of desks away. */
  private phoneRing(when = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.frequency.value = 1150;
    const trill = ctx.createOscillator();
    trill.type = 'square';
    trill.frequency.value = 18;
    const tg = ctx.createGain();
    tg.gain.value = 120;
    trill.connect(tg).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.value = 0;
    for (const s of [0, 0.4]) {
      g.gain.setValueAtTime(0.01, t + s);
      g.gain.setValueAtTime(0, t + s + 0.3);
    }
    o.connect(g).connect(this.ambBus);
    o.start(t);
    trill.start(t);
    o.stop(t + 0.8);
    trill.stop(t + 0.8);
  }

  /** A burst of typing. */
  private typing(when = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    let t = t0;
    for (let i = 0, n = Math.floor(rand(5, 16)); i < n; i++) {
      t += rand(0.06, 0.2);
      const s = ctx.createBufferSource();
      s.buffer = this.clapBuf;
      s.playbackRate.value = rand(2.5, 3.5);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2500;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      s.connect(hp).connect(g).connect(this.ambBus);
      s.start(t);
    }
  }

  doorbell() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [[659, 0], [523, 0.35]].forEach(([f, d]) => {
      const o = this.ctx!.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0.15, t + d);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.8);
      o.connect(g).connect(this.sfxBus);
      o.start(t + d);
      o.stop(t + d + 0.85);
    });
  }

  // ------------------------------------------------------------- music

  /** Karplus-Strong plucked string. */
  private pluck(freq: number, dur = 1.6, bright = 0.5) {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / freq));
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0;
    const decay = 0.996;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx];
      const next = ring[(idx + 1) % N];
      // `bright` keeps more of the raw sample, so high partials ring longer
      ring[idx] = decay * ((1 - bright) * 0.5 * (cur + next) + bright * cur);
      d[i] = cur;
      idx = (idx + 1) % N;
    }
    return buf;
  }

  private note(buf: AudioBuffer, t: number, gain: number, dest: AudioNode) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    s.connect(g).connect(dest);
    s.start(t);
  }

  private guitarOut(out = this.cueOutput()) {
    const ctx = this.ctx!;
    const drive = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 2.2);
    }
    drive.curve = curve;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    drive.connect(tone).connect(out);
    return drive;
  }

  private cueOutput() {
    this.stopSting();
    const out = this.ctx!.createGain();
    out.connect(this.musicBus);
    this.stingGain = out;
    return out;
  }

  /** Silence even scheduled notes when a viewer skips a scene or episode. */
  stopSting() {
    if (!this.ctx || !this.stingGain) return;
    this.stingGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
    this.stingGain = null;
  }

  /** Original, short descending tape-like zip to punctuate an intentional flashback. */
  rewind() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const duration = 0.5;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buf.getChannelData(0);
    let phase = 0;
    for (let i = 0; i < data.length; i++) {
      const u = i / data.length;
      phase += (1100 * Math.pow(0.12, u)) * 2 * Math.PI / ctx.sampleRate;
      data[i] = (Math.sin(phase) * 0.6 + (Math.random() * 2 - 1) * 0.15) * Math.sin(Math.PI * u) ** 2;
    }
    this.note(buf, ctx.currentTime, 0.28, this.cueOutput());
  }

  /** A bright harp glissando into someone's imagination (or back down out of it). Returns duration. */
  dream(into = true) {
    if (!this.ctx) return 0;
    const ctx = this.ctx;
    const out = this.cueOutput();
    const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
    // E major pentatonic over two octaves, clean (no drive): it's a different sound from the guitar
    const run = [64, 66, 68, 71, 73, 76, 78, 80, 83, 85, 88];
    const notes = into ? run : [...run].reverse();
    const t0 = ctx.currentTime + 0.02;
    notes.forEach((m, i) => this.note(this.pluck(hz(m), 1.4, 0.65), t0 + i * 0.045, 0.22, out));
    return notes.length * 0.045 + 0.5;
  }

  /** Soft fingerpicked chords under a sung line. */
  serenade(seconds: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const out = this.cueOutput();
    const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
    const chords = [[52, 59, 64, 68], [57, 64, 69, 73], [59, 66, 71, 75], [52, 59, 64, 68]];
    const step = 0.24;
    const t0 = ctx.currentTime + 0.03;
    for (let i = 0; i * step < seconds; i++) {
      const chord = chords[Math.floor(i / 4) % chords.length];
      this.note(this.pluck(hz(chord[[0, 2, 1, 3][i % 4]]), 1.2, 0.3), t0 + i * step, 0.16, out);
    }
  }

  /**
   * The main-title theme: an original, driving power-pop riff (palm-muted eighths, a jangly lead, a little kit),
   * six bars long, ringing out over the final group photograph. `beat` is one eighth note, for cutting on.
   */
  theme(): { beat: number; duration: number } {
    const beat = TITLE_BEAT;
    const duration = TITLE_BEATS * beat + TITLE_TAIL;
    if (!this.ctx) return { beat, duration };
    const ctx = this.ctx;
    const out = this.cueOutput();
    const gtr = this.guitarOut(out);
    const t0 = ctx.currentTime + 0.05;
    const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
    // the same few notes come back again and again: pluck each once
    const bufs = new Map<string, AudioBuffer>();
    const pluck = (m: number, dur: number, bright: number) => {
      const k = `${m}/${dur}/${bright}`;
      if (!bufs.has(k)) bufs.set(k, this.pluck(hz(m), dur, bright));
      return bufs.get(k)!;
    };
    const strum = (chord: number[], t: number, gain: number, dur = 1.6, down = true) =>
      (down ? chord : [...chord].reverse()).forEach((m, i) => this.note(pluck(m, dur, 0.4), t + i * 0.011, gain, gtr));
    const E = [40, 47, 52, 56, 59, 64], B = [47, 54, 59, 63, 66], Cs = [49, 56, 61, 64, 68], A = [45, 52, 57, 61, 64];
    // E | B | C#m | A | E B | A B | E (ring out)
    const bars = [[E, E], [B, B], [Cs, Cs], [A, A], [E, B], [A, B]];
    bars.forEach((halves, bar) => {
      for (let i = 0; i < 8; i++) {
        const t = t0 + (bar * 8 + i) * beat;
        const chord = halves[i < 4 ? 0 : 1];
        // accents ring open; everything else is a tight palm-muted chug
        if (i === 0 || i === 3 || i === 4 || i === 6) strum(chord, t, 0.24, 1.2, i !== 3);
        else strum(chord.slice(0, 3), t, 0.2, 0.22);
      }
    });
    const lead = [
      [71, 73, 76, 0, 76, 78, 76, 73],
      [75, 0, 71, 0, 75, 76, 75, 71],
      [73, 0, 68, 0, 73, 75, 73, 68],
      [69, 71, 73, 0, 76, 73, 71, 69],
      [71, 73, 76, 0, 75, 76, 75, 71],
      [69, 71, 73, 76, 78, 76, 75, 71],
    ].flat();
    lead.forEach((m, i) => m && this.note(pluck(m + 12, 0.9, 0.25), t0 + i * beat + 0.005, 0.3, gtr));
    const end = t0 + TITLE_BEATS * beat;
    strum(E, end, 0.42, 2.6);
    strum([64, 68, 71, 76], end + 0.04, 0.3, 2.6);
    // the kit: kick on the downbeats, snare on the backbeat, eighth-note hats, a crash on the title
    for (let i = 0; i < TITLE_BEATS; i++) {
      const t = t0 + i * beat;
      if (i % 4 === 0 || i % 8 === 7) this.kick(t, out);
      if (i % 4 === 2) this.hit(t, 0.16, 1800, 0.35, out);
      this.hit(t, 0.04, 7000, i % 2 ? 0.05 : 0.08, out);
    }
    this.hit(end - beat, 0.12, 1800, 0.3, out);
    this.hit(end - beat / 2, 0.12, 1800, 0.38, out);
    this.kick(end, out);
    this.hit(end, 1.8, 5000, 0.16, out);
    return { beat, duration };
  }

  private kick(t: number, out: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.25);
  }

  /** A filtered noise hit: snare, hi-hat or crash. */
  private hit(t: number, dur: number, freq: number, gain: number, out: AudioNode) {
    const ctx = this.ctx!;
    const s = this.noiseSrc(t, dur + 0.05);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(out);
  }

  /** Upbeat jangly guitar transition riff. Returns duration. */
  sting(variant: 'transition' | 'outro' = 'transition') {
    if (!this.ctx) return 0;
    const ctx = this.ctx;
    const out = this.guitarOut();
    const t0 = ctx.currentTime + 0.05;
    const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
    const E = [40, 47, 52, 56, 59, 64];
    const A = [45, 52, 57, 61, 64];
    const B = [47, 54, 59, 63, 66];
    const strum = (chord: number[], t: number, down = true, gain = 0.32) => {
      const notes = down ? chord : [...chord].reverse();
      notes.forEach((m, i) => this.note(this.pluck(hz(m), 1.8, 0.4), t + i * 0.012, gain, out));
    };
    const lick = (notes: number[], t: number, step: number) => notes.forEach((m, i) => this.note(this.pluck(hz(m), 1.0, 0.2), t + i * step, 0.45, out));
    const beat = 0.21;
    if (variant === 'outro') {
      strum(A, t0);
      strum(B, t0 + beat * 2);
      strum(E, t0 + beat * 4, true, 0.4);
      lick([76, 75, 71, 68], t0 + beat * 5, beat * 0.5);
      return beat * 8 + 1;
    }
    strum(E, t0, true);
    strum(E, t0 + beat, false);
    lick([64, 68, 71, 73, 76], t0 + beat * 2, beat * 0.5);
    strum(A, t0 + beat * 5, true, 0.25);
    return beat * 6 + 0.6;
  }

  // ------------------------------------------------------------- ambience

  ambience(kind: Ambience) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    for (const n of this.ambNodes) {
      try {
        (n as AudioScheduledSourceNode).stop?.();
      } catch {
        /* already stopped */
      }
      n.disconnect();
    }
    this.ambNodes = [];
    if (this.ambTimer) clearInterval(this.ambTimer);
    this.ambTimer = null;
    if (kind === 'none') return;

    // the room tone: filtered noise (bar chatter, HVAC, traffic wash, road rumble)
    const tone: Partial<Record<Ambience, [number, number]>> = { bar: [650, 0.05], city: [420, 0.05], office: [220, 0.035], car: [170, 0.12] };
    const [freq, gain] = tone[kind] ?? [280, 0.025];
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(lp).connect(g).connect(this.ambBus);
    src.start();
    this.ambNodes.push(src, lp, g);
    /** A noise band whose level drifts with a slow LFO (wind gusts, engine load). */
    const drift = (type: BiquadFilterType, f: number, level: number, rate: number, depth: number) => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = type;
      bp.frequency.value = f;
      const mg = ctx.createGain();
      mg.gain.value = level;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const lg = ctx.createGain();
      lg.gain.value = depth;
      lfo.connect(lg).connect(mg.gain);
      s.connect(bp).connect(mg).connect(this.ambBus);
      s.start(rand(0, 1.5));
      lfo.start();
      this.ambNodes.push(s, bp, mg, lfo, lg);
    };
    if (kind === 'city') {
      drift('highpass', 1800, 0.012, 0.13, 0.01); // wind over the roof
      this.ambTimer = window.setInterval(() => {
        if (Math.random() < 0.35) this.cityNoise(rand(0, 1));
        else if (Math.random() < 0.05) this.cityNoise(0, true);
      }, 3000);
    }
    if (kind === 'office') {
      this.ambTimer = window.setInterval(() => {
        if (Math.random() < 0.3) this.typing(rand(0, 1));
        if (Math.random() < 0.06) this.phoneRing(rand(0, 1));
      }, 2500);
    }
    if (kind === 'car') {
      drift('bandpass', 90, 0.06, 0.21, 0.03); // the engine pulling
      drift('bandpass', 1200, 0.008, 0.08, 0.006); // tyre hiss
      this.ambTimer = window.setInterval(() => {
        if (Math.random() < 0.3) this.cityNoise(rand(0, 1));
      }, 3500);
    }
    if (kind === 'bar') {
      // murmur: a few slowly modulated "voice" bands
      for (let i = 0; i < 3; i++) {
        const s = ctx.createBufferSource();
        s.buffer = this.noise;
        s.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 400 + i * 350;
        bp.Q.value = 4;
        const mg = ctx.createGain();
        mg.gain.value = 0.02;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.3 + i * 0.17;
        const lg = ctx.createGain();
        lg.gain.value = 0.015;
        lfo.connect(lg).connect(mg.gain);
        s.connect(bp).connect(mg).connect(this.ambBus);
        s.start();
        lfo.start();
        this.ambNodes.push(s, bp, mg, lfo, lg);
      }
      this.ambTimer = window.setInterval(() => {
        if (Math.random() < 0.4) this.clink(rand(0, 1));
      }, 2500);
    }
  }
}

export const audio = new AudioEngine();
