import type { CutawayLook, Delivery, EpisodeMeta, InsertBeat } from '../script/types';
import type { PhotoMotion } from '../show/mainTitles';
import type { CreditCard } from '../show/credits';
import { episodeLabel } from './guide';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** On-screen graphics: captions, title cards, cutaway cards, standby. */
export class Overlay {
  private caption = $('caption');
  private capName = $('caption-name');
  private capText = $('caption-text');
  private titleCard = $('title-card');
  private creditEl = $('credit');
  private closingCredits = $('closing-credits');
  private standbyEl = $('standby');
  private standbyMsg = $('standby-msg');
  private loc = $('loc-label');
  private yearEl = $('year');
  private insertEl = $('insert');
  private osdEl = $('osd');

  showCaption(name: string, color: string, text: string, narration = false, delivery?: Delivery) {
    this.caption.className = '';
    this.caption.classList.toggle('narration', narration);
    if (delivery) this.caption.classList.add(delivery);
    this.capName.textContent = name;
    this.capName.style.color = narration ? '' : color;
    this.capText.textContent = text;
    this.caption.classList.remove('hidden');
    this.clearYear();
  }

  /** "2030" at the bottom of the frame while we're on the couch with the kids. */
  year(on: boolean) {
    const wasOn = !this.yearEl.classList.contains('hidden');
    this.yearEl.classList.toggle('hidden', !on);
    if (!on || wasOn) return;
    this.yearEl.style.bottom = '';
    this.clearYear();
  }

  /** Lift the year above a tall caption; it never drops back mid-shot, so it doesn't bounce between lines. */
  private clearYear() {
    if (this.yearEl.classList.contains('hidden') || this.caption.classList.contains('hidden')) return;
    const screen = this.yearEl.parentElement!.getBoundingClientRect();
    if (!screen.height) return;
    const gap = screen.height * 0.025;
    const need = (screen.bottom - this.caption.getBoundingClientRect().top + gap) / screen.height * 100;
    const now = (screen.bottom - this.yearEl.getBoundingClientRect().bottom) / screen.height * 100;
    if (need > now) this.yearEl.style.bottom = `${need}%`;
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

  /** Static cards: the player owns their timing, pause and skip behavior. */
  closingCredit(cards: CreditCard[] | null) {
    this.closingCredits.classList.toggle('hidden', !cards);
    this.closingCredits.replaceChildren(...(cards ?? []).map((card) => {
      const group = document.createElement('div');
      group.className = 'closing-credit';
      if (card.label) {
        const label = document.createElement('small');
        label.textContent = card.label;
        group.append(label);
      }
      const name = document.createElement('span');
      name.textContent = card.name;
      group.append(name);
      return group;
    }));
  }

  hideCards() {
    this.titleCard.classList.add('hidden');
    this.closingCredit(null);
    this.creditEl.classList.add('hidden');
  }

  /** The Playbook cuts to a title card; older phone/chart/slide/sign beats stay in the scene. */
  insert(card: InsertBeat | null) {
    const play = card?.kind === 'playbook' ? card : null;
    this.insertEl.className = play ? 'insert-playbook' : 'hidden';
    this.insertEl.replaceChildren(...(play ? [playbookCard(play)] : []));
  }

  /**
   * The on-screen card: a scene's ("Meanwhile"), or a cutaway's in the style of its look (a fantasy's soft
   * serif, a memory's faded tag, a tape's label), or a montage's tag.
   */
  location(text: string, look?: CutawayLook | 'montage') {
    this.loc.className = look ? `cutaway ${look}` : '';
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

  /** The VCR's on-screen display over footage: "▶ PLAY", "❚❚ PAUSE", "◀◀ REWIND". */
  osd(text: string | null) {
    this.osdEl.classList.toggle('hidden', !text);
    this.osdEl.textContent = text ?? '';
  }

  standby(on: boolean, msg?: string) {
    this.standbyEl.classList.toggle('hidden', !on);
    if (msg) this.standbyMsg.textContent = msg;
  }
}

/** Dev mode's side panel: what's on, and a running transcript. */
export class Panel {
  private transcript = $('transcript');

  nowPlaying(ep: EpisodeMeta, meta: string[]) {
    $('now-code').textContent = episodeLabel(ep.code);
    $('now-title').textContent = ep.title;
    $('now-meta').textContent = meta.join(' · ');
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

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A cream, stepped-border title card, like the plays introduced in the original show. */
function playbookCard(c: InsertBeat): HTMLElement {
  const page = el('div', 'playbook-page');
  const frame = svgEl('svg', { viewBox: '0 0 700 500', preserveAspectRatio: 'none', class: 'playbook-frame', 'aria-hidden': 'true' });
  svgEl('path', { d: 'M45 4 H655 V36 H696 V464 H655 V496 H45 V464 H4 V36 H45 Z', class: 'outer' }, undefined, frame);
  svgEl('path', { d: 'M60 19 H640 V51 H681 V449 H640 V481 H60 V449 H19 V51 H60 Z', class: 'inner' }, undefined, frame);
  const title = c.title?.trim() || c.lines?.[0]?.trim() || 'The Playbook';
  const heading = el('h2', 'playbook-title');
  const prefix = title.match(/^The\s+/i);
  if (prefix) heading.append(el('span', 'playbook-prefix', prefix[0]));
  heading.append(el('span', '', prefix ? title.slice(prefix[0].length) : title));
  page.append(frame, heading);
  return page;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag: string, attrs: Record<string, string | number>, text?: string, parent?: Element) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text) e.textContent = text;
  parent?.append(e);
  return e;
}
