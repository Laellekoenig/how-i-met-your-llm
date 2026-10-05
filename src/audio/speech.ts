import type { VoiceProfile } from '../world/characters';
import { sleep } from '../util';

// Browser speech synthesis with per-character voice casting.

const FEMALE = /samantha|karen|moira|tessa|victoria|allison|ava|susan|zoe|kate|serena|fiona|veena|nicky|aria|jenny|michelle|emma|libby|sonia|natasha|clara|female|kathy|shelley|sandy|flo|grandma|joanna|salli|kimberly|ivy|kendra|amy|nora|catherine|hazel|zira|heera|martha|ellen/i;
const MALE = /alex|daniel|fred|aaron|arthur|gordon|rishi|tom|oliver|lee|guy|ryan|eric|christopher|roger|steffan|andrew|brian|davis|jason|tony|thomas|male|ralph|reed|rocko|eddy|grandpa|albert|bruce|junior|evan|nathan|matthew|joey|justin|george|james|william|liam|david|mark|ravi|prabhat/i;

// macOS novelty voices and the robotic "Eloquence" voices. Never auto-cast these.
const NOVELTY = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|pipe organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|junior|ralph|fred|kathy|grandpa|grandma|eddy|flo|reed|rocko|sandy|shelley)\b/i;
const NATURAL = /natural|neural|premium|enhanced|online|siri/i;

const OVERRIDES_KEY = 'himyllm.voices';

export interface SpeakHandle {
  done: Promise<void>;
}

export class Speech {
  enabled = true;
  private voices: SpeechSynthesisVoice[] = [];
  private cast = new Map<string, SpeechSynthesisVoice | null>();
  private roles: [string, VoiceProfile][] = [];
  private overrides: Record<string, string> = {};
  private keep: SpeechSynthesisUtterance[] = []; // Chrome GC bug workaround
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  onVoicesChanged: (() => void) | null = null;

  constructor() {
    try {
      this.overrides = JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}');
    } catch {
      this.overrides = {};
    }
    if (!this.supported) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
      this.recast();
      this.onVoicesChanged?.();
    };
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  }

  /** Register speaking roles in casting priority order (earlier roles get the best voices). */
  setRoles(roles: [string, VoiceProfile][]) {
    this.roles = roles;
    this.recast();
  }

  get allVoices() {
    return this.voices;
  }

  isNovelty(v: SpeechSynthesisVoice) {
    return NOVELTY.test(v.name);
  }

  voiceName(key: string) {
    return this.cast.get(key)?.name ?? null;
  }

  override(key: string) {
    return this.overrides[key] ?? '';
  }

  setOverride(key: string, voiceName: string) {
    if (voiceName) this.overrides[key] = voiceName;
    else delete this.overrides[key];
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(this.overrides));
    this.recast();
  }

  private gender(v: SpeechSynthesisVoice): 'male' | 'female' | null {
    if (FEMALE.test(v.name)) return 'female';
    if (MALE.test(v.name)) return 'male';
    return null;
  }

  private score(v: SpeechSynthesisVoice) {
    return (NATURAL.test(v.name) ? 4 : 0) + (v.localService ? 0 : 1) + (v.lang === 'en-US' ? 0.5 : 0);
  }

  /** Assign every role a voice: manual overrides first, then preferences, then best remaining same-gender voice. */
  private recast() {
    this.cast.clear();
    const usable = this.voices.filter((v) => !this.isNovelty(v));
    const uses = new Map<string, number>();
    const mainUse = new Set<string>();
    const MAIN = new Set(['ted', 'marshall', 'lily', 'robin', 'barney']);
    const claim = (key: string, v: SpeechSynthesisVoice | null) => {
      this.cast.set(key, v);
      if (!v) return;
      uses.set(v.name, (uses.get(v.name) ?? 0) + 1);
      if (MAIN.has(key)) mainUse.add(v.name);
    };
    // pass 1: manual overrides, then each role's own preferred voices (e.g. Ranjit keeps Rishi)
    for (const [key, p] of this.roles) {
      const forced = this.overrides[key] ? this.voices.find((v) => v.name === this.overrides[key]) : undefined;
      if (forced) {
        claim(key, forced);
        continue;
      }
      for (const pref of p.prefer) {
        const m = usable.filter((v) => v.name.toLowerCase().includes(pref.toLowerCase()) && !uses.has(v.name)).sort((a, b) => this.score(b) - this.score(a));
        if (m.length) {
          claim(key, m[0]);
          break;
        }
      }
    }
    // pass 2: everyone else gets the least-shared decent voice of their gender
    // (reusing a good voice beats falling back to a robotic one; avoid doubling up the main cast)
    for (const [key, p] of this.roles) {
      if (this.cast.has(key)) continue;
      const pool = usable.filter((v) => this.gender(v) === p.gender);
      const cands = pool.length ? pool : usable;
      const cost = (v: SpeechSynthesisVoice) => (uses.get(v.name) ?? 0) * 10 + (MAIN.has(key) && mainUse.has(v.name) ? 6 : 0) - this.score(v);
      claim(key, [...cands].sort((a, b) => cost(a) - cost(b))[0] ?? null);
    }
  }

  /** Speak a line. Resolves when finished (with a timeout fallback for flaky engines). */
  speak(key: string, text: string, profile: VoiceProfile, onStart?: () => void): SpeakHandle {
    const estimate = estimateDuration(text, profile.rate);
    if (!this.enabled || !this.supported || !this.voices.length) {
      onStart?.();
      return { done: sleep(estimate * 1000) };
    }
    const u = new SpeechSynthesisUtterance(text);
    const v = this.cast.has(key) ? this.cast.get(key) : null;
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'en-US';
    // big pitch shifts make good voices sound warped; keep them subtle
    u.pitch = Math.min(1.2, Math.max(0.85, profile.pitch));
    u.rate = profile.rate;
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
      u.onerror = finish;
      // If the engine never starts, fall back to a silent, timed line.
      setTimeout(() => {
        if (!started) {
          start();
          setTimeout(finish, estimate * 1000);
        }
      }, 1200);
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
