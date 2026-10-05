import { speech } from '../audio/speech';
import { CHARACTERS, FUTURE_TED_VOICE, type VoiceProfile } from '../world/characters';
import type { CharacterId } from '../script/types';

// Settings order.
const ORDER: CharacterId[] = ['ted', 'barney', 'marshall', 'lily', 'robin', 'penny', 'luke', 'wendy', 'ranjit', 'carl', 'patrice', 'captain', 'marvin', 'james', 'sandy', 'arthur', 'brad', 'victoria', 'quinn', 'kevin', 'judy', 'scooter', 'loretta', 'mickey', 'hammond', 'stella', 'zoey', 'nora', 'virginia', 'punchy', 'robin_sparkles'];

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
  sandy: 'This is Sandy Rivers. Even my corrections deserve their own headline.',
  arthur: 'Eriksen! That meeting could have been a resignation letter.',
  brad: 'Bro, brunch is basically networking with better eggs.',
  victoria: 'Ted, I can make a wedding cake. I cannot make your decisions.',
  quinn: 'Nice scheme, Barney. I already sold tickets to watch it fail.',
  kevin: 'As your friend, I support you. As a therapist, I need a larger notebook.',
  judy: 'Marshall, honey, I brought enough salad for everyone. It has marshmallows.',
  scooter: 'Lily said maybe. I have been very loyal to that maybe.',
  loretta: "Barney, sweetheart, your father was very famous. Depending on which story I told you.",
  mickey: 'Marshall, the board game is finished. I just need rules, pieces, and a small investment.',
  hammond: 'Mosby, my building has vision. Your building has usable doors.',
  stella: 'Ted, I have two minutes. Please choose your metaphor accordingly.',
  zoey: 'I brought a petition. You can sign it before or after our argument.',
  nora: 'Barney, honesty is a surprisingly effective opening line.',
  virginia: "Teddy, I met someone. You might want to put down your drink.",
  punchy: 'Schmosby! Look at us! Two grown men, zero improvement!',
  robin_sparkles: 'Hello, Canada! Even the food court deserves an encore!',
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
