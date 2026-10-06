// The writers' tools for episodes/*.json. Run with bun:
//   bun run bible                  the show bible: characters, sets and marks, the episode file format
//   bun run episodes list          what has aired: codes, titles, loglines, sets, guests, the next free code
//   bun run episodes check [file…] validate (all episodes by default); exits non-zero on errors
//   bun run episodes read <file>   the episode as a screenplay, with laugh and line counts, for read-throughs
//   bun run episodes fmt [file…]   rewrite files in the canonical layout (one beat per line)
//   bun run episodes ledger        continuity: each episode's era, what's true now, bets and promises still open

import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { testStage } from '../tests/helpers/sets';
import { showBible } from '../src/script/bible';
import { validateCatalog, validateEpisode, type Issue } from '../src/script/validate';
import { byCode } from '../src/script/episodes';
import { ledger } from '../src/script/continuity';
import { charName } from '../src/world/characters';
import type { Beat, EpisodeScript, Scene } from '../src/script/types';
import { formatEpisode } from './format';

const DIR = join(import.meta.dir, '..', 'episodes');
const [command = 'help', ...args] = process.argv.slice(2);

const allFiles = () => readdirSync(DIR).filter((f) => f.endsWith('.json')).sort().map((f) => join(DIR, f));
const resolve = (f: string) => (f.includes('/') ? f : join(DIR, f));

async function load(file: string): Promise<{ file: string; episode: unknown; parseError?: string }> {
  try {
    return { file, episode: JSON.parse(await Bun.file(file).text()) };
  } catch (e) {
    return { file, episode: null, parseError: e instanceof Error ? e.message : String(e) };
  }
}

const sets = () => testStage().sets;

async function check(files: string[]) {
  const loaded = await Promise.all(files.map(load));
  const stageSets = sets();
  let errors = 0;
  let warnings = 0;
  const print = (file: string, kind: string, issues: Issue[]) => {
    for (const i of issues) console.log(`${basename(file)}: ${kind} ${i.path ? `${i.path}: ` : ''}${i.message}`);
  };
  for (const { file, episode, parseError } of loaded) {
    if (parseError) {
      console.log(`${basename(file)}: error: invalid JSON: ${parseError}`);
      errors++;
      continue;
    }
    const report = validateEpisode(episode, stageSets);
    const code = (episode as { code?: unknown })?.code;
    if (typeof code === 'string' && !basename(file).startsWith(`${code.toLowerCase()}-`)) {
      report.errors.push({ path: '', message: `file name should start with "${code.toLowerCase()}-"` });
    }
    print(file, 'error:', report.errors);
    print(file, 'warning:', report.warnings);
    errors += report.errors.length;
    warnings += report.warnings.length;
  }
  // codes and titles are unique across the whole catalog, not just the files being checked
  const catalog = files.length === allFiles().length ? loaded : await Promise.all(allFiles().map(load));
  const clashes = validateCatalog(catalog).filter((i) => files.includes(i.path));
  for (const i of clashes) console.log(`${basename(i.path)}: error: ${i.message}`);
  errors += clashes.length;
  // continuity against every other episode's notes
  const valid = catalog.filter((l) => !l.parseError && (l.episode as EpisodeScript)?.scenes).map((l) => ({ file: l.file, ep: l.episode as EpisodeScript }));
  for (const issue of ledger(valid.map((v) => v.ep)).issues) {
    const file = valid.find((v) => v.ep.code === issue.code)?.file;
    if (!file || !files.includes(file)) continue;
    console.log(`${basename(file)}: warning: continuity: ${issue.message}`);
    warnings++;
  }
  console.log(`\n${files.length} episode${files.length === 1 ? '' : 's'}: ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`);
  return errors === 0;
}

async function list() {
  const loaded = (await Promise.all(allFiles().map(load))).filter((l) => !l.parseError);
  const episodes = loaded.map((l) => l.episode as EpisodeScript).sort(byCode);
  for (const ep of episodes) {
    const places = [...new Set(ep.scenes.flatMap((s) => (s.location ? [s.location] : [])))].join(', ');
    const people = [...new Set(ep.scenes.flatMap((s) => spoken(s.beats)))].filter((c) => !c.startsWith('guest'));
    console.log(`${ep.code}  ${ep.title}\n  ${ep.logline}\n  sets: ${places}\n  speaking: ${people.join(', ')}`
      + (ep.guests?.length ? `\n  guests: ${ep.guests.map((g) => `${g.name} (${g.role})`).join('; ')}` : '') + '\n');
  }
  const last = episodes.map((e) => /^S(\d+)E(\d+)$/.exec(e.code)).filter((m) => m && Number(m[1]) >= 11).at(-1);
  const next = last ? `S${last[1]}E${String(Number(last[2]) + 1).padStart(2, '0')}` : 'S11E01';
  console.log(`${episodes.length} episodes. Next free code: ${next}`);
}

const spoken = (beats: Beat[]): string[] =>
  beats.flatMap((b) => (b.type === 'say' ? [b.character] : b.type === 'cutaway' || b.type === 'split' ? spoken(b.beats) : []));

/** The ledger: where the catalog's continuity notes leave the world. */
async function continuity() {
  const episodes = (await Promise.all(allFiles().map(load))).filter((l) => !l.parseError).map((l) => l.episode as EpisodeScript);
  const book = ledger(episodes);
  const noted = episodes.filter((e) => e.continuity).length;
  console.log(`# Continuity ledger (${noted} of ${episodes.length} episodes have notes)\n`);
  if (book.eras.length) console.log(`## Eras\n${book.eras.map((e) => `- ${e.code}: ${e.era}`).join('\n')}\n`);
  console.log('## What is true now');
  console.log(book.facts.size ? [...book.facts].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `- ${k}: ${v.value} (${v.code})`).join('\n') : '- (no facts recorded yet)');
  console.log('\n## Still open');
  console.log(book.open.size ? [...book.open].map(([id, o]) => `- ${id} (since ${o.code}): ${o.note}`).join('\n') : '- (nothing)');
  if (book.issues.length) console.log(`\n## Check\n${book.issues.map((i) => `- ${i.code}: ${i.message}`).join('\n')}`);
}

/** The episode as a screenplay: what an audience would hear, with the laugh track in the margin. */
function read(ep: EpisodeScript) {
  const name = (id: string) => (ep.guests?.find((g) => g.id === id)?.name ?? charName(id)).toUpperCase();
  let lines = 0;
  let laughs = 0;
  const presented = (b: { label?: string; look?: string; transition?: string; sound?: string }) =>
    [b.label && `"${b.label}"`, b.look && b.look !== 'plain' && b.look, b.transition && b.transition !== 'cut' && b.transition, b.sound && `sound: ${b.sound}`].filter(Boolean).join(', ');
  function beats(list: Beat[], indent: string): string[] {
    return list.flatMap((b) => {
      const laugh = 'laugh' in b && b.laugh && b.type !== 'laugh' ? `   [${b.laugh.toUpperCase()}]` : '';
      if (laugh) laughs++;
      switch (b.type) {
        case 'say': {
          lines++;
          const how = [b.offscreen && (b.offscreen === 'phone' ? 'on the phone' : 'offscreen'), b.delivery, b.emotion && b.emotion !== 'neutral' ? b.emotion : '', b.gesture && b.gesture !== 'none' ? b.gesture : '', b.to ? `to ${name(b.to).toLowerCase()}` : ''].filter(Boolean).join(', ');
          return [`${indent}${name(b.character)}${how ? ` (${how})` : ''}: ${b.line}${laugh}`];
        }
        case 'narrate': lines++; return [`${indent}FUTURE TED${b.over ? ' (over the action)' : ''}: ${b.line}${laugh}`];
        case 'sound': return [`${indent}  ♪ ${b.sound}`];
        case 'score': return [`${indent}  ♪ score: ${b.music}`];
        case 'graphic': return [`${indent}  ▭ ${b.kind}${b.character ? ` on ${name(b.character).toLowerCase()}` : ''}${b.text ?? b.title ? `: ${b.text ?? b.title}` : ''}${b.value !== undefined ? ` ${b.value}` : ''}`];
        case 'freeze': lines++; return [`${indent}[FREEZE${b.character ? ` on ${name(b.character).toLowerCase()}` : ''}] FUTURE TED: ${b.line}${laugh}`];
        case 'insert': return [`${indent}[INSERT ${b.kind}${b.title ? ` "${b.title}"` : ''}]${b.line ? ` ${b.character ? name(b.character) : 'FUTURE TED'}: ${b.line}` : ''}${laugh}`];
        case 'replay': {
          const how = presented(b);
          return [
            `${indent}[REPLAY of "${b.of}"${b.from !== undefined || b.to !== undefined ? ` beats ${b.from ?? 0}-${b.to ?? 'end'}` : ''}${b.style ? `, ${b.style}` : ''}${how ? `; ${how}` : ''}]`,
            ...(b.add ?? []).map((c) => `${indent}    + ${name(c.character).toLowerCase()} @ ${c.mark} (there all along)`),
            ...(b.changes ?? []).flatMap((c) => [`${indent}    at beat ${c.at}, ${c.replace ? (c.replace.length ? 'instead:' : 'cut') : 'first:'}`, ...beats(c.replace ?? c.insert ?? [], indent + '      ')]),
            `${indent}[BACK]`,
          ];
        }
        case 'split': return [
          `${indent}[SPLIT SCREEN — ${b.panels.map((p) => `${p.location}: ${p.cast.map((c) => name(c.character).toLowerCase()).join(', ')}`).join(' | ')}]`,
          ...beats(b.beats, indent + '    '),
          `${indent}[BACK]`,
        ];
        case 'montage': return [
          `${indent}[MONTAGE${b.label ? ` "${b.label}"` : ''}, ${b.music}]`,
          ...b.shots.flatMap((sh) => [`${indent}    — ${sh.location}${sh.label ? ` "${sh.label}"` : ''}`, ...beats(sh.beats, indent + '      ')]),
          `${indent}[BACK]`,
        ];
        case 'move': return [`${indent}  ~ ${name(b.character)} moves to ${b.to}`];
        case 'enter': return [`${indent}  ~ ${name(b.character)} enters${b.to ? ` (${b.to})` : ''}`];
        case 'exit': return [`${indent}  ~ ${name(b.character)} exits`];
        case 'act': return [`${indent}  ~ ${name(b.character)}: ${b.gesture}${b.to ? ` at ${name(b.to).toLowerCase()}` : ''}`];
        case 'laugh': laughs++; return [`${indent}  [${b.laugh.toUpperCase()}]`];
        case 'pause': return [`${indent}  ~ pause ${b.seconds}s`];
        case 'cutaway': return [
          `${indent}[${b.style.toUpperCase()} CUTAWAY${b.id ? ` #${b.id}` : ''}${presented(b) ? ` (${presented(b)})` : ''} — ${b.location}, ${b.time}; ${b.cast.map((c) => name(c.character).toLowerCase()).join(', ')}]`,
          ...beats(b.beats, indent + '    '),
          `${indent}[BACK]`,
        ];
      }
    });
  }
  const out: string[] = [`${ep.code} — ${ep.title}`, ep.logline, ''];
  for (const g of ep.guests ?? []) out.push(`GUEST ${g.id}: ${g.name} — ${g.role}`);
  const couchOpening = !!ep.coldOpen || !!ep.couch?.length;
  if (couchOpening) {
    out.push('', 'COUCH OPENING — 2030');
    if (ep.coldOpen) out.push(...beats([{ type: 'narrate', line: ep.coldOpen }], '  '));
    out.push(...beats(ep.couch ?? [], '  '), '', '[MAIN TITLES]');
  }
  ep.scenes.forEach((s: Scene, i) => {
    const before = { lines, laughs };
    const tags = [s.transition, s.label && `"${s.label}"`, s.sound && `sound: ${s.sound}`].filter(Boolean).join(', ');
    if (s.resume) out.push('', `SCENE ${i + 1}${s.id ? ` #${s.id}` : ''} — back to #${s.resume}${tags ? ` (${tags})` : ''}`);
    else out.push('', `SCENE ${i + 1}${s.id ? ` #${s.id}` : ''} — ${s.location}, ${s.time}${tags ? ` (${tags})` : ''}`);
    if (s.summary) out.push(`  (${s.summary})`);
    if (!s.resume) out.push(`  on stage: ${s.cast.map((c) => `${name(c.character).toLowerCase()} @ ${c.mark}`).join(', ')}`);
    out.push('');
    out.push(...beats(s.beats, '  '));
    out.push(`  -- ${lines - before.lines} lines, ${laughs - before.laughs} laughs`);
    if (!couchOpening && i === 0) out.push('', '[MAIN TITLES]');
  });
  out.push('', `TOTAL: ${ep.scenes.length} scenes, ${lines} lines, ${laughs} laughs (${(laughs / Math.max(1, lines)).toFixed(2)} per line)`);
  return out.join('\n');
}

async function main() {
  switch (command) {
    case 'bible':
      console.log(showBible(sets()));
      break;
    case 'list':
      await list();
      break;
    case 'check':
      process.exitCode = (await check(args.length ? args.map(resolve) : allFiles())) ? 0 : 1;
      break;
    case 'read':
      if (!args[0]) throw new Error('usage: bun run episodes read <file>');
      console.log(read((await load(resolve(args[0]))).episode as EpisodeScript));
      break;
    case 'ledger':
      await continuity();
      break;
    case 'fmt':
      for (const file of args.length ? args.map(resolve) : allFiles()) {
        const { episode, parseError } = await load(file);
        if (parseError) console.error(`${basename(file)}: ${parseError}`);
        else await Bun.write(file, formatEpisode(episode));
      }
      break;
    default: {
      const usage = (await Bun.file(import.meta.path).text()).split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3));
      console.log(usage.join('\n'));
    }
  }
}

await main();
