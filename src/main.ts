import './style.css';
import { Renderer } from './engine/renderer';
import { Stage } from './show/stage';
import { Director } from './show/director';
import { Player } from './show/player';
import { Overlay, Panel } from './ui/overlay';
import { Showrunner, Programming } from './llm/showrunner';
import { listModels } from './llm/openrouter';
import { audio } from './audio/audio';
import { speech } from './audio/speech';
import type { ShowItem } from './script/types';
import { initCasting } from './ui/casting';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const renderer = new Renderer($('viewport'));
const stage = new Stage(renderer.scene);
const director = new Director(renderer.camera, stage);
const overlay = new Overlay();
const panel = new Panel();

// ---------------------------------------------------------------- writers' room

const statusEl = $('writer-status');
const logEl = $('writer-log');
const writer = new Showrunner(stage.sets, {
  status(text, state) {
    statusEl.textContent = text;
    statusEl.className = `status ${state === 'busy' ? 'busy' : state === 'error' ? 'error' : ''}`;
    syncWriteButton();
  },
  log(text, error) {
    const li = document.createElement('li');
    li.textContent = text;
    if (error) li.className = 'err';
    logEl.appendChild(li);
    logEl.scrollTop = logEl.scrollHeight;
    if (error) ($('writer-log-wrap') as HTMLDetailsElement).open = true;
  },
  stats(text) {
    $('writer-stats').textContent = text;
  },
});
const programming = new Programming(writer);
const player = new Player(stage, director, renderer, overlay, panel, programming);

const keyInput = $<HTMLInputElement>('api-key');
const modelInput = $<HTMLInputElement>('model');
const remember = $<HTMLInputElement>('remember-key');
const writeBtn = $<HTMLButtonElement>('btn-write');

keyInput.value = localStorage.getItem('himyllm.key') ?? '';
modelInput.value = localStorage.getItem('himyllm.model') ?? writer.model;
remember.checked = localStorage.getItem('himyllm.remember') !== '0';

function syncWriteButton() {
  writeBtn.textContent = writer.running ? 'stop writing' : 'start writing';
  writeBtn.classList.toggle('stop', writer.running);
}

function persistKey() {
  localStorage.setItem('himyllm.remember', remember.checked ? '1' : '0');
  if (remember.checked && keyInput.value) localStorage.setItem('himyllm.key', keyInput.value.trim());
  else localStorage.removeItem('himyllm.key');
}
keyInput.addEventListener('change', persistKey);
remember.addEventListener('change', persistKey);
modelInput.addEventListener('change', () => localStorage.setItem('himyllm.model', modelInput.value.trim()));

writeBtn.addEventListener('click', () => {
  if (writer.running) {
    writer.stop();
    syncWriteButton();
    return;
  }
  writer.apiKey = keyInput.value.trim();
  writer.model = modelInput.value.trim() || 'anthropic/claude-sonnet-5.5';
  persistKey();
  writer.start();
  syncWriteButton();
  if (writer.running && !tunedIn) tuneIn();
});

listModels()
  .then((models) => {
    const dl = $('model-list');
    const preferred = ['anthropic/', 'openai/', 'google/', 'deepseek/', 'x-ai/', 'moonshotai/', 'meta-llama/', 'mistralai/', 'qwen/'];
    models
      .filter((m) => !m.id.endsWith(':batch') && !m.id.startsWith('~'))
      .sort((a, b) => {
        const pa = preferred.findIndex((p) => a.id.startsWith(p));
        const pb = preferred.findIndex((p) => b.id.startsWith(p));
        return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a.id.localeCompare(b.id);
      })
      .forEach((m) => {
        const o = document.createElement('option');
        o.value = m.id;
        o.label = `${m.name} · $${(m.promptPrice * 1e6).toFixed(2)}/$${(m.completionPrice * 1e6).toFixed(2)} per M`;
        dl.appendChild(o);
      });
  })
  .catch(() => {
    /* offline: free-text model input still works */
  });

// pitches
const pitchInput = $<HTMLInputElement>('pitch-input');
const pitchQueue = $('pitch-queue');
function renderPitches() {
  pitchQueue.innerHTML = '';
  for (const p of writer.suggestions) {
    const d = document.createElement('div');
    d.textContent = p;
    pitchQueue.appendChild(d);
  }
  if (writer.suggestions.length && !writer.running) {
    const d = document.createElement('div');
    d.textContent = 'start writing (needs an API key) to air pitches';
    d.style.opacity = '0.6';
    pitchQueue.appendChild(d);
  }
}
function submitPitch() {
  const v = pitchInput.value.trim();
  if (!v) return;
  writer.suggestions.push(v.slice(0, 300));
  pitchInput.value = '';
  renderPitches();
}
$('btn-pitch').addEventListener('click', submitPitch);
pitchInput.addEventListener('keydown', (e) => e.key === 'Enter' && submitPitch());

// ---------------------------------------------------------------- now playing

player.onItem = (item: ShowItem) => {
  overlay.setLive(item.episode.source === 'llm');
  const meta: string[] = [];
  if (item.kind === 'scene') meta.push(`scene ${item.index + 1}`, item.scene.location, item.scene.time);
  if (item.kind === 'episode-start') meta.push('cold open');
  if (item.kind === 'episode-end') meta.push('credits');
  panel.nowPlaying(item.episode, meta);
  renderPitches();
};

// ---------------------------------------------------------------- settings & transport

const bind = (id: string, fn: (on: boolean) => void) => {
  const el = $<HTMLInputElement>(id);
  const key = `himyllm.opt.${id}`;
  const saved = localStorage.getItem(key);
  if (saved !== null) el.checked = saved === '1';
  fn(el.checked);
  el.addEventListener('change', () => {
    localStorage.setItem(key, el.checked ? '1' : '0');
    fn(el.checked);
  });
};
bind('opt-style', (on) => renderer.setStyle({ enabled: on }));
bind('opt-voices', (on) => (speech.enabled = on));
initCasting($('casting'));
bind('opt-laughs', (on) => (audio.laughsEnabled = on));
bind('opt-music', (on) => (audio.musicEnabled = on));
bind('opt-captions', (on) => {
  overlay.captionsEnabled = on;
  if (!on) overlay.hideCaption();
});
const res = $<HTMLInputElement>('opt-res');
res.addEventListener('input', () => {
  $('opt-res-v').textContent = `${res.value}p`;
  renderer.setStyle({ pixelHeight: Number(res.value) });
});
const vol = $<HTMLInputElement>('volume');
vol.addEventListener('input', () => audio.setVolume(Number(vol.value)));

const pauseBtn = $('btn-pause');
function setPaused(paused: boolean) {
  if (player.paused === paused) return;
  player.paused = paused;
  pauseBtn.textContent = player.paused ? '▶' : '❚❚';
  if (player.paused) {
    speechSynthesis?.pause();
    void audio.ctx?.suspend();
  } else {
    speechSynthesis?.resume();
    void audio.ctx?.resume();
  }
}
pauseBtn.addEventListener('click', () => setPaused(!player.paused));
let currentEpisodeId: string | null = null;
const prevOnItem = player.onItem;
player.onItem = (item) => {
  currentEpisodeId = item.episode.id;
  prevOnItem?.(item);
};
$('btn-skip').addEventListener('click', () => player.skip('scene'));
$('btn-skip-ep').addEventListener('click', () => {
  if (currentEpisodeId) programming.dropEpisode(currentEpisodeId);
  player.skip('episode');
});
// Fullscreen the letterboxing wrapper, not the screen itself, so the picture keeps its aspect.
function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void $('screen-wrap').requestFullscreen();
}
$('btn-full').addEventListener('click', toggleFullscreen);

// ---------------------------------------------------------------- dev mode

// Regular mode is just the TV: the show plays on its own, letterboxed to fill the window.
// Dev mode (?dev, or press D) brings back the transport, the writers' room and all the settings.
const devMode = () => document.body.classList.contains('dev');
function setDevMode(on: boolean) {
  document.body.classList.toggle('dev', on);
  const url = new URL(location.href);
  if (on) url.searchParams.set('dev', '');
  else url.searchParams.delete('dev');
  history.replaceState(null, '', url.href.replace(/([?&])dev=(?=&|#|$)/, '$1dev'));
  if (!on) setPaused(false);
}
setDevMode(new URLSearchParams(location.search).has('dev'));

window.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'KeyD') setDevMode(!devMode());
  else if (e.code === 'KeyF') toggleFullscreen();
  else if (!devMode()) return;
  else if (e.code === 'Space') {
    e.preventDefault();
    setPaused(!player.paused);
  } else if (e.code === 'ArrowRight') player.skip('scene');
});

// ---------------------------------------------------------------- tune in

let tunedIn = false;
function tuneIn() {
  if (tunedIn) return;
  tunedIn = true;
  audio.init();
  audio.setVolume(Number(vol.value));
  // unlock speech synthesis inside the user gesture
  if (speech.supported) speechSynthesis.speak(new SpeechSynthesisUtterance(' '));
  $('tune-in').classList.add('hidden');
  // Regular mode has no writers' room UI, so a remembered key starts the writers on its own.
  if (!devMode() && !writer.running && keyInput.value.trim()) writeBtn.click();
  void player.run();
}
$('tune-in').addEventListener('click', tuneIn);

// Preview behind the tune-in screen: the gang in the booth.
stage.setLocation('maclarens', 'night');
stage.place('ted', 'booth_end');
stage.place('marshall', 'booth_left_back');
stage.place('lily', 'booth_left_front');
stage.place('robin', 'booth_right_back');
stage.place('barney', 'booth_right_front');
stage.place('carl', 'behind_bar');
stage.setBackground('carl', true);
director.wide(1, 0.05);
let previewChatter = 0;

// ---------------------------------------------------------------- frame loop

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (!tunedIn) {
    previewChatter -= dt;
    if (previewChatter < 0) {
      previewChatter = 1.5 + Math.random() * 2;
      const ids = stage.onStageIds().filter((i) => i !== 'carl');
      for (const id of ids) stage.actors[id].talking = false;
      const who = ids[Math.floor(Math.random() * ids.length)];
      stage.actors[who].talking = true;
      for (const id of ids) if (id !== who) stage.actors[id].lookAt = stage.actors[who].headWorld;
    }
  }
  if (!player.paused) {
    stage.update(dt, t);
    director.update(dt);
  }
  renderer.render(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// handy for debugging from the console
Object.assign(window as unknown as Record<string, unknown>, { himyllm: { stage, director, renderer, player, writer, programming, audio } });
