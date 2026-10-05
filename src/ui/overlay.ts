import type { CutawayStyle, Delivery, EpisodeMeta, InsertBeat } from '../script/types';
import { CHARACTERS, charName } from '../world/characters';
import type { PhotoMotion } from '../show/mainTitles';
import type { CreditCard } from '../show/credits';

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

  /**
   * A full-screen insert: a text thread on a phone, a chart on an easel, a slide, a sign, a page of the Playbook.
   * Its bubbles, bars or bullets start hidden; revealInsert() brings them in one at a time.
   */
  insert(card: InsertBeat | null) {
    this.insertEl.classList.toggle('hidden', !card);
    if (!card) {
      this.insertEl.replaceChildren();
      return;
    }
    this.insertEl.className = `insert-${card.kind}`;
    this.insertEl.replaceChildren(insertCard(card));
  }

  /** Show the first `n` items of the insert; returns how many there are. */
  revealInsert(n: number) {
    const items = [...this.insertEl.querySelectorAll('.step')];
    items.forEach((el, i) => el.classList.toggle('shown', i < n));
    return items.length;
  }

  /** The cutaway card, styled as a fantasy or a memory, or a montage's tag. */
  location(text: string, cutaway?: CutawayStyle | 'montage') {
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
}

/** Sidebar transcript + now-playing widgets. */
export class Panel {
  private transcript = $('transcript');
  private onAir = '';

  /** The dev-mode episode picker: one entry per catalog episode; picking one airs it from the cold open. */
  episodes(list: { code: string; title: string }[], onPick: (index: number) => void) {
    $('episodes-count').textContent = `${list.length}`;
    $('episode-list').replaceChildren(...list.map((ep, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.dataset.code = ep.code;
      b.title = `Play ${ep.code} from the cold open`;
      const code = document.createElement('span');
      code.className = 'code';
      code.textContent = ep.code;
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = ep.title;
      b.append(code, title);
      b.addEventListener('click', () => onPick(i));
      li.append(b);
      return li;
    }));
  }

  nowPlaying(ep: EpisodeMeta, meta: string[]) {
    if (ep.id !== this.onAir) {
      this.onAir = ep.id;
      const list = $('episode-list');
      for (const b of list.querySelectorAll<HTMLButtonElement>('button')) {
        const on = b.dataset.code === ep.code;
        b.setAttribute('aria-current', `${on}`);
        // bring the new episode into view without scrolling the panel itself
        if (on && (b.offsetTop < list.scrollTop || b.offsetTop + b.offsetHeight > list.scrollTop + list.clientHeight)) {
          list.scrollTop = b.offsetTop - (list.clientHeight - b.offsetHeight) / 2;
        }
      }
    }
    $('now-code').textContent = ep.code;
    $('now-title').textContent = ep.title;
    $('now-logline').textContent = ep.logline;
    const m = $('now-meta');
    m.innerHTML = '';
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

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Marker colors for Barney's charts. */
const MARKERS = ['#d23a2e', '#2f5fb3', '#2f8a4a', '#e09a1c', '#7a3fa0', '#1c1c1c'];

function insertCard(c: InsertBeat): HTMLElement {
  const owner = c.character ? charName(c.character) : '';
  switch (c.kind) {
    case 'text': {
      const phone = el('div', 'phone');
      const who = c.title || (c.messages ?? []).map((m) => m.from).find((f) => f !== c.character) || 'Unknown';
      const head = el('div', 'phone-head');
      const name = String(charName(who));
      head.append(el('span', 'avatar', name.charAt(0)), el('b', '', name));
      const thread = el('div', 'thread');
      const senders = new Set((c.messages ?? []).filter((m) => m.from !== c.character).map((m) => m.from));
      for (const m of c.messages ?? []) {
        const mine = !!c.character && m.from === c.character;
        const b = el('div', `bubble step ${mine ? 'out' : 'in'}`);
        // in a group thread, say who's talking
        if (!mine && senders.size > 1) {
          const n = el('small', '', charName(m.from));
          const def = (CHARACTERS as Record<string, { color: string }>)[m.from];
          if (def) n.style.color = def.color;
          b.append(n);
        }
        b.append(m.text);
        thread.append(b);
      }
      phone.append(head, thread);
      return phone;
    }
    case 'chart': {
      const easel = el('div', 'easel');
      easel.append(el('h2', '', c.title ?? ''));
      easel.append(chartSvg(c));
      if (owner) easel.append(el('footer', '', `— ${owner}`));
      return easel;
    }
    case 'slides': {
      const slide = el('div', 'slide');
      slide.append(el('h2', '', c.title ?? ''));
      const ul = el('ul');
      for (const l of c.lines ?? []) ul.append(el('li', 'step', l));
      slide.append(ul, el('footer', '', owner ? `${owner} · confidential` : 'confidential'));
      return slide;
    }
    case 'sign': {
      const plate = el('div', 'plate');
      plate.append(el('b', '', c.title ?? ''));
      for (const l of c.lines ?? []) plate.append(el('span', '', l));
      return plate;
    }
    case 'playbook': {
      const page = el('div', 'page');
      page.append(el('header', '', 'The Playbook'), el('h2', '', c.title ?? ''));
      const ol = el('ol');
      for (const l of c.lines ?? []) ol.append(el('li', 'step', l));
      page.append(ol, el('footer', '', owner ? `property of ${owner}` : ''));
      return page;
    }
  }
}

/** A hand-drawn bar, line or pie chart, as SVG. Each bar, point or slice is a step to reveal. */
function chartSvg(c: InsertBeat) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 400 230');
  const add = (tag: string, attrs: Record<string, string | number>, text?: string, parent: Element = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (text) e.textContent = text;
    parent.append(e);
    return e;
  };
  const items = (c.items ?? []).slice(0, 6);
  const max = Math.max(1, ...items.map((i) => i.value));
  if (c.chart === 'pie') {
    const total = items.reduce((n, i) => n + Math.max(0, i.value), 0) || 1;
    let a = -Math.PI / 2;
    items.forEach((it, k) => {
      const g = add('g', { class: 'step' });
      const sweep = (Math.max(0, it.value) / total) * Math.PI * 2;
      const [cx, cy, r] = [130, 115, 92];
      const p = (t: number, rr = r) => `${cx + Math.cos(t) * rr},${cy + Math.sin(t) * rr}`;
      add('path', { d: `M${cx},${cy} L${p(a)} A${r},${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${p(a + sweep)} Z`, fill: MARKERS[k % MARKERS.length], stroke: '#1c1c1c', 'stroke-width': 2.5 }, undefined, g);
      add('rect', { x: 255, y: 30 + k * 30, width: 16, height: 16, fill: MARKERS[k % MARKERS.length], stroke: '#1c1c1c', 'stroke-width': 2 }, undefined, g);
      add('text', { x: 280, y: 44 + k * 30 }, it.label, g);
      a += sweep;
    });
    return svg;
  }
  const n = Math.max(1, items.length), left = 30, right = 385, base = 185, top = 25;
  const w = (right - left) / n;
  add('path', { d: `M${left},${top - 10} L${left},${base} L${right + 5},${base}`, class: 'axis' });
  const pts = items.map((it, k) => [left + w * (k + 0.5), base - (Math.max(0, it.value) / max) * (base - top)] as const);
  items.forEach((it, k) => {
    const g = add('g', { class: 'step' });
    const [x, y] = pts[k];
    if (c.chart === 'line') {
      if (k) add('line', { x1: pts[k - 1][0], y1: pts[k - 1][1], x2: x, y2: y, stroke: MARKERS[0], 'stroke-width': 4, 'stroke-linecap': 'round' }, undefined, g);
      add('circle', { cx: x, cy: y, r: 6, fill: MARKERS[0], stroke: '#1c1c1c', 'stroke-width': 2 }, undefined, g);
    } else {
      add('rect', { x: x - w * 0.32, y, width: w * 0.64, height: base - y, fill: MARKERS[k % MARKERS.length], stroke: '#1c1c1c', 'stroke-width': 2.5 }, undefined, g);
    }
    add('text', { x, y: base + 22, 'text-anchor': 'middle', class: 'label' }, it.label, g);
    add('text', { x, y: y - 9, 'text-anchor': 'middle', class: 'value' }, String(it.value), g);
  });
  return svg;
}
