// Canonical layout for episode files: one beat per line, in a fixed key order, so a scene reads top to bottom
// like a script and diffs stay small. Everything else goes on one line if it fits.

const WIDTH = 160;
const BEAT_KEYS = ['type', 'character', 'to', 'line', 'delivery', 'interrupted', 'emotion', 'gesture', 'laugh', 'seconds'];

export function formatEpisode(value: unknown): string {
  return format(value, '') + '\n';
}

/** Beats that hold other beats (a cutaway, a replay's changes, a split screen) open up like a scene. */
const NESTING = ['cutaway', 'replay', 'split'];
const isBeat = (v: object) => 'type' in v && !NESTING.includes(String((v as { type: unknown }).type));

function format(value: unknown, indent: string): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const one = flat(value);
  if (indent.length + one.length <= WIDTH || (!Array.isArray(value) && isBeat(value))) return one;
  const inner = indent + '  ';
  if (Array.isArray(value)) return `[\n${value.map((v) => inner + format(v, inner)).join(',\n')}\n${indent}]`;
  return `{\n${entries(value).map(([k, v]) => `${inner}${JSON.stringify(k)}: ${format(v, inner)}`).join(',\n')}\n${indent}}`;
}

function flat(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(flat).join(', ')}]`;
  return `{ ${entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${flat(v)}`).join(', ')} }`;
}

function entries(o: object) {
  const list = Object.entries(o).filter(([, v]) => v !== undefined);
  if (!isBeat(o)) return list;
  const rank = (k: string) => (BEAT_KEYS.indexOf(k) + 1 || 99);
  return list.sort(([a], [b]) => rank(a) - rank(b));
}
