import type { EpisodeMeta } from '../script/types';
import { sleep } from '../util';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** On-screen graphics: captions, title cards, location labels, standby. */
export class Overlay {
  captionsEnabled = true;
  private caption = $('caption');
  private capName = $('caption-name');
  private capText = $('caption-text');
  private titleCard = $('title-card');
  private endCard = $('end-card');
  private standbyEl = $('standby');
  private standbyMsg = $('standby-msg');
  private loc = $('loc-label');
  private onair = $('onair');

  showCaption(name: string, color: string, text: string, narration = false) {
    if (!this.captionsEnabled) return;
    this.caption.classList.toggle('narration', narration);
    this.capName.textContent = name;
    this.capName.style.color = narration ? '' : color;
    this.capText.textContent = text;
    this.caption.classList.remove('hidden');
  }

  hideCaption() {
    this.caption.classList.add('hidden');
  }

  async title(ep: EpisodeMeta, seconds: number) {
    $('title-code').textContent = ep.code;
    $('title-name').textContent = ep.title;
    this.titleCard.classList.remove('hidden');
    await sleep(seconds * 1000);
    this.titleCard.classList.add('hidden');
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
  }

  location(text: string) {
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
