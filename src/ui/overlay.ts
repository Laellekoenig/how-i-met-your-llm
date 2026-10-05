import type { CutawayStyle, Delivery, EpisodeMeta } from '../script/types';
import { sleep } from '../util';
import type { PhotoMotion } from '../show/mainTitles';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** On-screen graphics: captions, title cards, location labels, standby. */
export class Overlay {
  captionsEnabled = true;
  private caption = $('caption');
  private capName = $('caption-name');
  private capText = $('caption-text');
  private titleCard = $('title-card');
  private creditEl = $('credit');
  private endCard = $('end-card');
  private standbyEl = $('standby');
  private standbyMsg = $('standby-msg');
  private loc = $('loc-label');
  private onair = $('onair');

  showCaption(name: string, color: string, text: string, narration = false, delivery?: Delivery) {
    if (!this.captionsEnabled) return;
    this.caption.className = '';
    this.caption.classList.toggle('narration', narration);
    if (delivery) this.caption.classList.add(delivery);
    this.capName.textContent = name;
    this.capName.style.color = narration ? '' : color;
    this.capText.textContent = text;
    this.caption.classList.remove('hidden');
  }

  hideCaption() {
    this.caption.classList.add('hidden');
  }

  /** Full-bleed still photo. The title belongs to the second photograph, like the show's opening. */
  showTitle(photo: HTMLCanvasElement | null, name = false) {
    this.titleCard.classList.toggle('hidden', !photo);
    this.titleCard.classList.toggle('with-name', !!photo && name);
    const frame = this.titleCard.querySelector('.title-photo') as HTMLElement;
    frame.replaceChildren(...(photo ? [photo] : []));
    frame.style.transform = '';
    frame.style.filter = '';
  }

  /** Driven by playback time so pauses freeze the pan and reduced motion leaves the print still. */
  moveTitle(u: number, motion: PhotoMotion, reducedMotion: boolean, shutter = 0) {
    const frame = this.titleCard.querySelector('.title-photo') as HTMLElement;
    if (reducedMotion) {
      frame.style.transform = 'none';
      frame.style.filter = 'none';
      return;
    }
    const drift = u - 0.5;
    const sweep = shutter * shutter;
    frame.style.transform = `translate(${motion.pan[0] * drift + sweep * motion.pan[0] * 5}%, ${motion.pan[1] * drift}%) rotate(${motion.tilt}deg) scale(${1.085 + motion.zoom * drift})`;
    frame.style.filter = shutter > 0 ? `blur(${sweep * 5}px)` : 'none';
  }

  /** An opening credit: a cast name low in the frame, or the creators beside the gang in the main titles. */
  credit(card: { label?: string; name: string } | null, kind: 'cast' | 'creators' = 'cast') {
    this.creditEl.classList.toggle('hidden', !card);
    if (!card) return;
    this.creditEl.className = kind;
    this.creditEl.replaceChildren();
    if (card.label) {
      const l = document.createElement('small');
      l.textContent = card.label;
      this.creditEl.append(l);
    }
    this.creditEl.append(card.name);
    this.creditEl.style.animation = 'none';
    void this.creditEl.offsetWidth;
    this.creditEl.style.animation = '';
  }

  async end(ep: EpisodeMeta, seconds: number) {
    $('end-sub').textContent = `${ep.code} · ${ep.title}`;
    this.endCard.classList.remove('hidden');
    await sleep(seconds * 1000);
    this.endCard.classList.add('hidden');
  }

  hideCards() {
    this.titleCard.classList.add('hidden');
    this.endCard.classList.add('hidden');
    this.creditEl.classList.add('hidden');
  }

  /** The location label; a cutaway gets its own styled card instead. */
  location(text: string, cutaway?: CutawayStyle) {
    this.loc.className = cutaway ? `cutaway ${cutaway}` : '';
    this.loc.textContent = text;
    this.loc.classList.remove('hidden');
    // restart the CSS animation
    this.loc.style.animation = 'none';
    void this.loc.offsetWidth;
    this.loc.style.animation = '';
  }

  hideLocation() {
    this.loc.classList.add('hidden');
  }

  standby(on: boolean, msg?: string) {
    this.standbyEl.classList.toggle('hidden', !on);
    if (msg) this.standbyMsg.textContent = msg;
  }

  setLive(live: boolean) {
    this.onair.classList.toggle('hidden', !live);
  }
}

/** Sidebar transcript + now-playing widgets. */
export class Panel {
  private transcript = $('transcript');

  nowPlaying(ep: EpisodeMeta, meta: string[]) {
    $('now-code').textContent = ep.code;
    $('now-title').textContent = ep.title;
    $('now-logline').textContent = ep.logline;
    const m = $('now-meta');
    m.innerHTML = '';
    if (ep.source === 'llm') {
      const src = document.createElement('span');
      src.className = 'badge live';
      src.textContent = 'freshly written';
      m.appendChild(src);
    }
    for (const t of meta) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = t;
      m.appendChild(b);
    }
  }

  line(kind: 'say' | 'narr' | 'stage' | 'laugh' | 'sep', text: string, name?: string, color?: string) {
    const li = document.createElement('li');
    li.className = kind === 'say' ? '' : kind;
    if (name) {
      const b = document.createElement('b');
      b.textContent = name;
      if (color) b.style.color = color;
      li.appendChild(b);
    }
    li.appendChild(document.createTextNode(text));
    const atBottom = this.transcript.scrollHeight - this.transcript.scrollTop - this.transcript.clientHeight < 40;
    this.transcript.appendChild(li);
    while (this.transcript.children.length > 300) this.transcript.firstElementChild?.remove();
    if (atBottom) this.transcript.scrollTop = this.transcript.scrollHeight;
  }
}
