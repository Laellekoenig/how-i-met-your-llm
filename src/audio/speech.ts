import type { VoiceProfile } from '../world/characters';
import type { Delivery } from '../script/types';
import { sleep } from '../util';

// Browser speech synthesis: one shared American voice per gender.

const FEMALE = /^google us english$|samantha|karen|moira|tessa|victoria|allison|ava|susan|zoe|kate|serena|fiona|veena|nicky|aria|jenny|michelle|emma|libby|sonia|natasha|clara|female|kathy|shelley|sandy|flo|grandma|joanna|salli|kimberly|ivy|kendra|amy|nora|catherine|hazel|zira|heera|martha|ellen/i;
const MALE = /alex|daniel|fred|aaron|arthur|gordon|rishi|tom|oliver|lee|guy|ryan|eric|christopher|roger|steffan|andrew|brian|davis|jason|tony|thomas|male|ralph|reed|rocko|eddy|grandpa|albert|bruce|junior|evan|nathan|matthew|joey|justin|george|james|william|liam|david|mark|ravi|prabhat/i;

// macOS novelty voices and the robotic "Eloquence" voices. Never auto-cast these.
const NOVELTY = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|pipe organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|junior|ralph|fred|kathy|grandpa|grandma|eddy|flo|reed|rocko|sandy|shelley)\b/i;
const NATURAL = /natural|neural|premium|enhanced|online|siri/i;

// Shared cast voices, best first. Only American (en-US) voices are considered when any exist.
const AMERICAN = {
  male: ['Andrew', 'Christopher', 'Guy', 'Eric', 'Brian', 'Roger', 'Steffan', 'Evan', 'Nathan', 'Aaron', 'Tom', 'Alex'],
  female: ['Ava', 'Jenny', 'Aria', 'Emma', 'Michelle', 'Allison', 'Samantha', 'Susan', 'Zoe', 'Google US English', 'Nicky'],
};
const isAmerican = (v: SpeechSynthesisVoice) => /^en[-_]us$/i.test(v.lang);

export interface SpeakHandle {
  done: Promise<void>;
}

export interface SpeakOptions {
  delivery?: Delivery;
  /** Stop mid-word as the last word starts, as if someone talked over it. */
  cutOff?: boolean;
  /** The voice has reached the word starting at this character (only real voices report it). */
  onWord?: (charIndex: number) => void;
}

/** How each delivery bends the voice. Pitch stays near 1: big shifts make good voices sound warped. */
const DELIVERY: Record<Delivery, { rate: number; pitch: number; volume: number; maxPitch?: number }> = {
  whisper: { rate: 0.9, pitch: -0.04, volume: 0.45 },
  shout: { rate: 1.08, pitch: 0.14, volume: 1, maxPitch: 1.34 },
  sing: { rate: 0.82, pitch: 0.16, volume: 0.95, maxPitch: 1.36 },
  deadpan: { rate: 0.9, pitch: -0.07, volume: 0.9 },
  fast: { rate: 1.32, pitch: 0.03, volume: 1 },
  slow: { rate: 0.76, pitch: -0.03, volume: 1 },
};

/** Words spoken per second scale with this, so captions and timeouts stay honest. */
export const deliveryRate = (d?: Delivery) => (d ? DELIVERY[d].rate : 1);

export class Speech {
  /** Silent mode for automated testing: lines keep their timing but are never spoken. */
  muted = false;
  private voices: SpeechSynthesisVoice[] = [];
  private shared: Record<'male' | 'female', SpeechSynthesisVoice | null> = { male: null, female: null };
  private keep: SpeechSynthesisUtterance[] = []; // Chrome GC bug workaround
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  constructor() {
    if (!this.supported) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
      this.shared = { male: this.pick('male'), female: this.pick('female') };
    };
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  }

  private gender(v: SpeechSynthesisVoice): 'male' | 'female' | null {
    if (FEMALE.test(v.name)) return 'female';
    if (MALE.test(v.name)) return 'male';
    return null;
  }

  private score(v: SpeechSynthesisVoice, prefer: string[]) {
    const i = prefer.findIndex((p) => v.name.toLowerCase().includes(p.toLowerCase()));
    return (NATURAL.test(v.name) ? 4 : 0) + (v.localService ? 0 : 1) + (i < 0 ? 0 : 2 * (1 - i / prefer.length));
  }

  /** Best American voice of a gender (falls back to any English voice of that gender, then anything). */
  private pick(gender: 'male' | 'female'): SpeechSynthesisVoice | null {
    const usable = this.voices.filter((v) => !NOVELTY.test(v.name));
    const pool = usable.filter((v) => this.gender(v) === gender);
    const us = pool.filter(isAmerican);
    const cands = us.length ? us : pool.length ? pool : usable;
    return [...cands].sort((a, b) => this.score(b, AMERICAN[gender]) - this.score(a, AMERICAN[gender]))[0] ?? null;
  }

  /** Speak a line. Resolves when finished (with a timeout fallback for flaky engines). */
  speak(text: string, profile: VoiceProfile, onStart?: () => void, opts: SpeakOptions = {}): SpeakHandle {
    const d = opts.delivery ? DELIVERY[opts.delivery] : undefined;
    const rate = profile.rate * (d?.rate ?? 1);
    // a line that gets cut off stops early; without boundary events, we stop it on time
    const estimate = estimateDuration(text, rate) * (opts.cutOff ? 0.88 : 1);
    if (this.muted || !this.supported || !this.voices.length) {
      onStart?.();
      return { done: sleep(estimate * 1000) };
    }
    const u = new SpeechSynthesisUtterance(text.replace(/[-–—]+$/, ''));
    // Every man shares one American voice and every woman another; pitch and rate set them apart.
    const v = this.shared[profile.gender];
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'en-US';
    // big pitch shifts make good voices sound warped; keep them subtle
    u.pitch = Math.min(d?.maxPitch ?? 1.2, Math.max(0.8, profile.pitch + (d?.pitch ?? 0)));
    u.rate = rate;
    u.volume = d?.volume ?? 1;
    this.keep.push(u);
    const done = new Promise<void>((resolve) => {
      let finished = false;
      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        onStart?.();
      };
      const finish = () => {
        if (finished) return;
        finished = true;
        this.keep = this.keep.filter((x) => x !== u);
        resolve();
      };
      u.onstart = start;
      u.onend = finish;
      // Blocked until the first user gesture (autoplay policy): keep the line's timing, silently.
      u.onerror = (e) => {
        if (e.error !== 'not-allowed' || started) return finish();
        start();
        setTimeout(finish, estimate * 1000);
      };
      // If the engine never starts, fall back to a silent, timed line.
      setTimeout(() => {
        if (!started) {
          start();
          setTimeout(finish, estimate * 1000);
        }
      }, 1200);
      // never cancel whoever speaks next
      const cut = () => {
        if (!finished) speechSynthesis.cancel();
      };
      const lastWord = u.text.trimEnd().search(/\S+$/);
      u.onboundary = (e) => {
        if (e.name !== 'word') return;
        opts.onWord?.(e.charIndex);
        if (opts.cutOff && e.charIndex >= lastWord) setTimeout(cut, 140);
      };
      if (opts.cutOff) u.addEventListener('start', () => setTimeout(cut, estimate * 1000 + 400));
      setTimeout(finish, estimate * 2600 + 3000);
    });
    speechSynthesis.speak(u);
    return { done };
  }

  cancel() {
    if (this.supported) speechSynthesis.cancel();
  }
}

export function estimateDuration(text: string, rate = 1) {
  const words = text.trim().split(/\s+/).length;
  return (0.5 + words * 0.36) / rate;
}

export const speech = new Speech();
