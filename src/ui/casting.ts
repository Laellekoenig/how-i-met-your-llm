import { speech } from '../audio/speech';
import { CHARACTERS, FUTURE_TED_VOICE, type VoiceProfile } from '../world/characters';
import type { CharacterId } from '../script/types';

// Settings order.
const ORDER: CharacterId[] = ['ted', 'barney', 'marshall', 'lily', 'robin', 'penny', 'luke', 'wendy', 'ranjit', 'carl', 'patrice', 'captain', 'marvin', 'james'];

const SAMPLES: Record<string, string> = {
  'future-ted': 'Kids, I want to tell you an incredible story.',
  ted: "Hi, I'm Ted Mosby. Architect.",
  barney: "It's going to be legen... wait for it... dary!",
  marshall: 'Lawyered! Also, has anyone seen my sandwich?',
  lily: "Marshmallow, we talked about this. You're not getting a Bigfoot tattoo.",
  robin: "I'm not Canadian, I'm a citizen of the world. Okay, I'm Canadian.",
  wendy: 'Another round for the booth?',
  ranjit: 'Hello! Where to tonight?',
  carl: "You guys gonna order something or just talk?",
  patrice: 'Robin! I baked you cookies! They spell out BFF!',
  captain: 'A man chooses his own name. Stepping off!',
  marvin: "Son, I built you a canoe. Don't tell your mother.",
  james: "Little brother, I invented suiting up. You just made it a catchphrase.",
  penny: 'Dad. You said this story was about Mom.',
  luke: 'Are we almost done? I have practice.',
};

export function roles(): [string, VoiceProfile][] {
  const r: [string, VoiceProfile][] = ORDER.map((id) => [id, CHARACTERS[id].voice]);
  r.splice(1, 0, ['future-ted', FUTURE_TED_VOICE]);
  return r;
}

const label = (key: string) => (key === 'future-ted' ? 'Future Ted' : CHARACTERS[key as CharacterId].name);
const profile = (key: string) => (key === 'future-ted' ? FUTURE_TED_VOICE : CHARACTERS[key as CharacterId].voice);

/** Settings UI: choose each character's voice and audition it. */
export function initCasting(el: HTMLElement) {
  speech.setRoles(roles());
  const render = () => {
    el.innerHTML = '';
    const voices = [...speech.allVoices].sort((a, b) => Number(speech.isNovelty(a)) - Number(speech.isNovelty(b)) || a.name.localeCompare(b.name));
    if (!voices.length) {
      el.textContent = 'No English voices found in this browser.';
      return;
    }
    for (const [key] of roles()) {
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = label(key);
      if (key !== 'future-ted') who.style.color = CHARACTERS[key as CharacterId].color;
      const sel = document.createElement('select');
      const auto = document.createElement('option');
      auto.value = '';
      auto.textContent = `auto${speech.override(key) ? '' : ` — ${speech.voiceName(key) ?? 'none'}`}`;
      sel.appendChild(auto);
      for (const v of voices) {
        const o = document.createElement('option');
        o.value = v.name;
        o.textContent = `${v.name} (${v.lang})${speech.isNovelty(v) ? ' ⚠ robotic' : ''}`;
        sel.appendChild(o);
      }
      sel.value = speech.override(key);
      sel.addEventListener('change', () => {
        speech.setOverride(key, sel.value);
        render();
        audition(key);
      });
      const play = document.createElement('button');
      play.textContent = '▶';
      play.title = 'Preview';
      play.addEventListener('click', () => audition(key));
      el.append(who, sel, play);
    }
  };
  const audition = (key: string) => {
    speech.cancel();
    speech.speak(key, SAMPLES[key] ?? 'Testing, one two three.', profile(key));
  };
  speech.onVoicesChanged = render;
  render();
}
