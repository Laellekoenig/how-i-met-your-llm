import './style.css';
import { Renderer } from './engine/renderer';
import { Stage } from './show/stage';
import { Director } from './show/director';
import { Player } from './show/player';
import { Overlay, Panel } from './ui/overlay';
import { audio } from './audio/audio';
import { speech } from './audio/speech';
import type { ShowItem } from './script/types';
import { initCasting } from './ui/casting';
import { EPISODES } from './script/catalog';
import { Syndication } from './script/episodes';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const renderer = new Renderer($('viewport'));
const stage = new Stage(renderer.scene);
const director = new Director(renderer.camera, stage);
const overlay = new Overlay();
const panel = new Panel();

// ---------------------------------------------------------------- programming

// Pre-written episodes air back to back. `?ep=S11E03` starts at a given episode.
const startAt = Math.max(0, Syndication.indexOf(EPISODES, new URLSearchParams(location.search).get('ep')));
const player = new Player(stage, director, renderer, overlay, panel, new Syndication(EPISODES, startAt));

// ---------------------------------------------------------------- now playing

player.onItem = (item: ShowItem) => {
  const meta: string[] = [];
  if (item.kind === 'scene') meta.push(`scene ${item.index + 1}`, item.scene.location, item.scene.time);
  if (item.kind === 'episode-start') meta.push('cold open');
  if (item.kind === 'episode-end') meta.push('credits');
  panel.nowPlaying(item.episode, meta);
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
const skipEpisode = () => player.skip('episode');
$('btn-back-ep').addEventListener('click', () => player.back('episode'));
$('btn-back').addEventListener('click', () => player.back('scene'));
$('btn-skip').addEventListener('click', () => player.skip('scene'));
$('btn-skip-ep').addEventListener('click', skipEpisode);
// Fullscreen the letterboxing wrapper, not the screen itself, so the picture keeps its aspect.
function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void $('screen-wrap').requestFullscreen();
}
$('btn-full').addEventListener('click', toggleFullscreen);

// ---------------------------------------------------------------- dev mode

// Regular mode is just the TV: the show plays on its own, letterboxed to fill the window.
// Dev mode (?dev, or press D) brings back the transport, the transcript and all the settings.
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
  } else if (e.code === 'ArrowRight') {
    if (e.shiftKey) skipEpisode();
    else player.skip('scene');
  } else if (e.code === 'ArrowLeft') player.back(e.shiftKey ? 'episode' : 'scene');
});

// ---------------------------------------------------------------- tune in

// Agents testing the show play it silently: ?mute, a webdriver browser, or T3 Code's preview browser
// (where agents drive the app). ?sound overrides the detection.
function testingMuted() {
  const q = new URLSearchParams(location.search);
  if (q.has('sound')) return false;
  return q.has('mute') || navigator.webdriver || /\bT3Code\b/.test(navigator.userAgent);
}

let tunedIn = false;
function tuneIn() {
  if (tunedIn) return;
  tunedIn = true;
  const muted = (audio.muted = speech.muted = testingMuted());
  audio.init();
  audio.setVolume(Number(vol.value));
  // unlock speech synthesis inside the user gesture
  if (speech.supported && !muted) speechSynthesis.speak(new SpeechSynthesisUtterance(' '));
  $('tune-in').classList.add('hidden');
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
Object.assign(window as unknown as Record<string, unknown>, { himyllm: { stage, director, renderer, player, audio } });
