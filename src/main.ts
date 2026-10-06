import './style.css';
import { Renderer } from './engine/renderer';
import { Stage } from './show/stage';
import { Director } from './show/director';
import { Player } from './show/player';
import { Overlay, Panel } from './ui/overlay';
import { setPreview } from './ui/setPreview';
import { Guide } from './ui/guide';
import { playground, Workbench } from './ui/playground';
import { audio } from './audio/audio';
import { speech } from './audio/speech';
import type { ShowItem } from './script/types';
import { EPISODES } from './script/catalog';
import { Syndication } from './script/episodes';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const renderer = new Renderer($('viewport'));
const stage = new Stage(renderer.scene);
const director = new Director(renderer.camera, stage);
const overlay = new Overlay();
const panel = new Panel();

// ---------------------------------------------------------------- programming

// The show starts on the TV guide; pre-written episodes air back to back from the one picked there.
// `?ep=S11E03` skips the guide and starts at a given episode.
// `?playground` (dev mode) swaps the schedule for a workbench that airs only what the playground hands it.
const requested = Syndication.indexOf(EPISODES, new URLSearchParams(location.search).get('ep'));
const syndication = new Syndication(EPISODES, requested >= 0 ? requested : null);
const inPlayground = new URLSearchParams(location.search).has('playground');
const bench = new Workbench();
const player = new Player(stage, director, renderer, overlay, panel, inPlayground ? bench : syndication);
let onAir = requested >= 0;
let airing: string | undefined;

/** Air an episode from its cold open, picked in the guide; syndication carries on from there. */
function tune(index: number) {
  closeGuide();
  syndication.seek(index);
  // (off the air, the player is already waiting on the pick)
  if (onAir) player.cue();
  onAir = true;
}
const guide = new Guide($('guide'), EPISODES, tune);

function openGuide() {
  if (inPlayground || (new URLSearchParams(location.search).has('set') && document.querySelector('.set-preview'))) {
    location.assign(new URLSearchParams(location.search).has('mute') ? '/?mute' : '/');
    return;
  }
  if (guide.open) return;
  if (onAir) {
    onAir = false;
    syndication.off();
    player.cue();
    setPaused(false);
    audio.ambience('none');
  }
  document.body.classList.add('guide-open');
  guide.show(airing);
}
function closeGuide() {
  document.body.classList.remove('guide-open');
  guide.hide();
}

// ---------------------------------------------------------------- now playing

player.onItem = (item: ShowItem) => {
  const meta: string[] = [];
  if (item.kind === 'scene') meta.push(`scene ${item.index + 1}`, stage.sets[item.scene.location].name, item.scene.time);
  if (item.kind === 'episode-start') meta.push('cold open');
  if (item.kind === 'episode-end') meta.push('credits');
  panel.nowPlaying(item.episode, meta);
  airing = item.episode.code;
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
  pauseBtn.classList.toggle('paused', player.paused);
  pauseBtn.title = player.paused ? 'Play (space)' : 'Pause (space)';
  pauseBtn.setAttribute('aria-label', player.paused ? 'Play' : 'Pause');
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
$('btn-guide').addEventListener('click', () => openGuide());
// The playground and the show swap places: each keeps dev mode and ?mute.
$('btn-playground').classList.toggle('on', inPlayground);
$('btn-playground').addEventListener('click', () => {
  const q = new URLSearchParams(location.search);
  location.assign(`/?${inPlayground ? '' : 'playground&'}dev${q.has('mute') ? '&mute' : ''}`);
});

// ---------------------------------------------------------------- dev mode

// Regular mode is just the TV: the show plays on its own, letterboxed to fill the window.
// Dev mode (?dev, or press D) adds the transport and settings bar and a panel with the transcript.
const devMode = () => document.body.classList.contains('dev');
function setDevMode(on: boolean) {
  document.body.classList.toggle('dev', on);
  const url = new URL(location.href);
  if (on) url.searchParams.set('dev', '');
  else url.searchParams.delete('dev');
  history.replaceState(null, '', url.href.replace(/([?&][^=&#]+)=(?=&|#|$)/g, '$1'));
  if (!on) setPaused(false);
}
setDevMode(inPlayground || new URLSearchParams(location.search).has('dev'));

window.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'KeyD') setDevMode(!devMode());
  else if (e.code === 'KeyF') toggleFullscreen();
  else if (e.code === 'Escape') openGuide();
  else if (guide.open) guide.key(e);
  else if (!devMode()) return;
  else if (e.code === 'Space') {
    e.preventDefault();
    setPaused(!player.paused);
  } else if (e.code === 'ArrowRight') {
    if (e.shiftKey) skipEpisode();
    else player.skip('scene');
  } else if (e.code === 'ArrowLeft') player.back(e.shiftKey ? 'episode' : 'scene');
});

// ---------------------------------------------------------------- start

// Agents testing the show play it silently: ?mute, a webdriver browser, or T3 Code's preview browser
// (where agents drive the app). ?sound overrides the detection.
function testingMuted() {
  const q = new URLSearchParams(location.search);
  if (q.has('sound')) return false;
  return q.has('mute') || navigator.webdriver || /\bT3Code\b/.test(navigator.userAgent);
}

// The show starts on load. Browsers may hold sound back until the viewer first interacts with the
// page; the picture and captions run regardless, and the first click or key press brings in the audio.
const muted = (audio.muted = speech.muted = testingMuted());
// Regular mode has nothing to click, so say so while the sound is held back.
const soundHint = $('sound-hint');
audio.onUnlock = () => soundHint.classList.add('hidden');
audio.init();
// (an allowed context can take a moment to start; don't flash the hint at it)
setTimeout(() => soundHint.classList.toggle('hidden', muted || !!audio.ctx), 600);
audio.setVolume(Number(vol.value));
function unlockSound() {
  window.removeEventListener('pointerdown', unlockSound, true);
  window.removeEventListener('keydown', unlockSound, true);
  audio.init();
  // unlock speech synthesis inside the user gesture
  if (speech.supported && !muted) speechSynthesis.speak(new SpeechSynthesisUtterance(' '));
}
window.addEventListener('pointerdown', unlockSound, true);
window.addEventListener('keydown', unlockSound, true);
const touring = !inPlayground && setPreview(stage, director);
if (inPlayground) {
  void player.run();
  playground({ stage, director, renderer, player, bench });
} else if (!touring) {
  if (!onAir) openGuide();
  void player.run();
}

// ---------------------------------------------------------------- frame loop

/** Where a tag goes: just above someone's head, in % of the picture, or null when they're out of shot. */
function tagSpot(id: string) {
  const a = stage.actors[id as keyof typeof stage.actors];
  if (!a?.root.visible) return null;
  const head = a.headWorld;
  head.y += 0.32;
  const v = head.project(renderer.camera);
  if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) return null;
  return { x: (v.x + 1) * 50, y: (1 - v.y) * 50 };
}

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (!player.paused) {
    stage.update(dt, t);
    director.update(dt);
  }
  overlay.trackTags(tagSpot);
  renderer.render(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// handy for debugging from the console
Object.assign(window as unknown as Record<string, unknown>, { himyllm: { stage, director, renderer, player, audio } });
