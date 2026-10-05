import type { CutawayStyle, Delivery, EpisodeMeta } from '../script/types';
import { sleep } from '../util';

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

  /**
   * The end of the main titles: pull back from the last photo into a mosaic of the whole burst, under the show's
   * name. Just the name, like the real thing.
   */
  showTitle(photos: HTMLCanvasElement[] | null) {
    this.titleCard.classList.toggle('hidden', !photos);
    this.titleCard.style.opacity = '';
    const mosaic = this.titleCard.querySelector('.mosaic')!;
    mosaic.replaceChildren();
    this.zoomTitle(0);
    if (!photos?.length) return;
    // 5 x 5 prints the shape of the screen; the last photo sits in the middle, where the pull-back starts
    const order = [...photos.slice(0, -1)].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 25; i++) {
      const src = i === 12 ? photos[photos.length - 1] : order[i % Math.max(1, order.length)] ?? photos[0];
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      c.getContext('2d')?.drawImage(src, 0, 0);
      mosaic.append(c);
    }
  }

  /** Pull back from the last photo (0) to the whole mosaic (1); the name surfaces partway. */
  zoomTitle(u: number) {
    const k = Math.min(1, Math.max(0, u));
    const ease = 1 - Math.pow(1 - k, 3);
    (this.titleCard.querySelector('.mosaic') as HTMLElement).style.transform = `scale(${5 - (5 - 1.18) * ease})`;
    const name = this.titleCard.querySelector('.show-title') as HTMLElement;
    name.style.opacity = String(Math.min(1, Math.max(0, (k - 0.3) * 3)));
  }

  fadeTitle(opacity: number) {
    this.titleCard.style.opacity = String(opacity);
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
