import { el } from './dom';
import { clamp } from '../util';

/**
 * The TV guide the show starts on: one channel per season, its episodes airing back to back in half-hour slots
 * from the current half hour. Picking a programme airs it; Escape brings the guide back.
 */

interface Listing {
  code: string;
  title: string;
  logline: string;
}

const SLOT_MS = 30 * 60 * 1000;
const seasonOf = (code: string) => /^S(\d+)/i.exec(code)?.[1] ?? '?';
/** "season 10, episode 1", as the guide and the dev panel spell an episode code. */
export function episodeLabel(code: string) {
  const [, s, e] = /^S(\d+)E(\d+)/i.exec(code) ?? [];
  return s && e ? `season ${Number(s)}, episode ${Number(e)}` : code;
}
const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export class Guide {
  private grid = el('div', 'guide-grid');
  private sheet = el('div', 'guide-sheet');
  private ruler = el('div', 'guide-ruler');
  private nowLine = el('div', 'guide-now');
  private clockEl = el('div', 'guide-clock');
  private info = { code: el('div', 'guide-info-code'), title: el('div', 'guide-info-title'), logline: el('div', 'guide-info-logline') };
  /** Programme buttons by channel row, then slot. */
  private rows: HTMLButtonElement[][] = [];
  private buttons: HTMLButtonElement[] = [];
  private selected = 0;
  private start = 0;
  private ticker = 0;

  constructor(private root: HTMLElement, private listings: Listing[], private onPick: (index: number) => void) {
    const head = el('header', 'guide-head');
    const logo = el('div', 'logo guide-logo');
    logo.append('how i met your ', el('span', 'llm', 'llm'));
    head.append(logo, this.clockEl);

    const info = el('section', 'guide-info');
    info.setAttribute('aria-live', 'polite');
    info.append(this.info.code, this.info.title, this.info.logline);

    const foot = el('footer', 'guide-foot');
    for (const [keys, what] of [[['↑', '↓', '←', '→'], 'browse'], [['enter'], 'watch'], [['esc'], 'back to the guide']] as const) {
      const hint = el('span');
      for (const k of keys) hint.append(el('kbd', '', k));
      hint.append(` ${what}`);
      foot.append(hint);
    }

    this.build();
    this.root.replaceChildren(head, info, this.grid, foot);
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'TV guide');

    // a mouse wheel scrolls through the schedule when there are no more channels to scroll to
    this.grid.addEventListener('wheel', (e) => {
      if (this.grid.scrollHeight > this.grid.clientHeight + 1 || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      e.preventDefault();
      this.grid.scrollLeft += e.deltaY;
    }, { passive: false });
    this.grid.addEventListener('mouseleave', () => this.describe(this.selected));
    this.grid.addEventListener('scroll', () => this.placeNow());
  }

  get open() {
    return !this.root.classList.contains('hidden');
  }

  /** Bring the guide up, on the episode that was just airing if there was one. */
  show(code?: string) {
    const at = code ? this.listings.findIndex((l) => l.code === code) : -1;
    this.schedule();
    this.root.classList.remove('hidden');
    this.grid.scrollLeft = 0;
    this.select(at >= 0 ? at : this.selected, true);
    clearInterval(this.ticker);
    this.ticker = window.setInterval(() => this.tick(), 10_000);
  }

  hide() {
    this.root.classList.add('hidden');
    clearInterval(this.ticker);
  }

  /** Arrow keys move between programmes, Enter airs the selected one. Returns whether the key was used. */
  key(e: KeyboardEvent) {
    const [row, slot] = this.position(this.selected);
    const move = (r: number, s: number) => {
      const line = this.rows[clamp(r, 0, this.rows.length - 1)];
      this.select(Number(line[clamp(s, 0, line.length - 1)].dataset.index));
    };
    switch (e.code) {
      case 'ArrowUp': move(row - 1, slot); break;
      case 'ArrowDown': move(row + 1, slot); break;
      case 'ArrowLeft': move(row, slot - 1); break;
      case 'ArrowRight': move(row, slot + 1); break;
      case 'Home': move(row, 0); break;
      case 'End': move(row, Infinity); break;
      case 'Enter': case 'NumpadEnter': case 'Space':
        // a focused programme button handles these itself
        if (document.activeElement === this.buttons[this.selected]) return false;
        this.onPick(this.selected);
        break;
      default: return false;
    }
    e.preventDefault();
    return true;
  }

  private position(index: number): [number, number] {
    for (const [r, line] of this.rows.entries()) {
      const s = line.indexOf(this.buttons[index]);
      if (s >= 0) return [r, s];
    }
    return [0, 0];
  }

  private build() {
    const seasons = new Map<string, number[]>();
    this.listings.forEach((l, i) => {
      const s = seasonOf(l.code);
      seasons.set(s, [...(seasons.get(s) ?? []), i]);
    });
    const slots = Math.max(...[...seasons.values()].map((eps) => eps.length));
    this.grid.style.setProperty('--slots', String(slots));
    this.grid.append(this.sheet);

    this.ruler.append(el('div', 'guide-corner'));
    for (let i = 0; i < slots; i++) this.ruler.append(el('div', 'guide-time'));
    this.sheet.append(this.ruler);

    for (const [season, eps] of seasons) {
      const row = el('div', 'guide-row');
      const channel = el('div', 'guide-channel');
      channel.append(el('b', '', `S${season}`));
      row.append(channel);
      const line = eps.map((index, slot) => {
        const l = this.listings[index];
        const b = el('button', 'guide-prog');
        b.dataset.index = String(index);
        b.dataset.slot = String(slot);
        b.tabIndex = -1;
        b.append(el('span', 'guide-prog-meta'), el('span', 'guide-prog-title', l.title));
        b.addEventListener('click', () => this.onPick(index));
        b.addEventListener('focus', () => this.select(index));
        b.addEventListener('mouseenter', () => this.describe(index));
        return b;
      });
      row.append(...line);
      if (eps.length < slots) {
        const off = el('div', 'guide-off');
        off.append(el('span', '', `end of season ${Number(season)}`));
        off.style.setProperty('--span', String(slots - eps.length));
        row.append(off);
      }
      this.rows.push(line);
      this.sheet.append(row);
    }
    this.buttons = this.rows.flat().sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
    this.sheet.append(this.nowLine);
  }

  /** Lay the schedule out from the current half hour. */
  private schedule() {
    this.start = Math.floor(Date.now() / SLOT_MS) * SLOT_MS;
    [...this.ruler.querySelectorAll('.guide-time')].forEach((t, i) => (t.textContent = clock(this.start + i * SLOT_MS)));
    for (const b of this.buttons) {
      const slot = Number(b.dataset.slot);
      b.classList.toggle('on-now', slot === 0);
      b.querySelector('.guide-prog-meta')!.textContent = this.listings[Number(b.dataset.index)].code;
    }
    this.tick();
  }

  private tick() {
    const now = Date.now();
    if (now >= this.start + SLOT_MS) return this.schedule();
    this.clockEl.textContent = new Date(now).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    this.nowLine.style.setProperty('--at', String((now - this.start) / SLOT_MS));
    this.placeNow();
  }

  /** The now line runs behind the channel names once the schedule scrolls past it; hide it there. */
  private placeNow() {
    const schedule = this.buttons[0].offsetLeft - this.buttons[0].parentElement!.offsetLeft;
    this.nowLine.style.visibility = this.nowLine.offsetLeft - this.grid.scrollLeft < schedule ? 'hidden' : '';
  }

  private select(index: number, scroll = false) {
    this.selected = index;
    const b = this.buttons[index];
    for (const other of this.buttons) {
      const on = other === b;
      other.tabIndex = on ? 0 : -1;
      other.setAttribute('aria-selected', String(on));
    }
    if (document.activeElement !== b) b.focus({ preventScroll: true });
    b.scrollIntoView({ block: 'nearest', inline: scroll ? 'center' : 'nearest' });
    this.describe(index);
  }

  /** The info panel: the selected programme, or the one under the mouse. */
  private describe(index: number) {
    const l = this.listings[index];
    this.info.code.textContent = episodeLabel(l.code);
    this.info.title.textContent = l.title;
    this.info.logline.textContent = l.logline;
  }
}
