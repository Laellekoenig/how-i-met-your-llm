import { GUEST_IDS, type CharacterId, type GuestStar } from '../script/types';
import { guestDef, placeholderGuest } from './guests';

export type HairStyle = 'swoop' | 'shaggy' | 'messy' | 'neat' | 'bob' | 'long' | 'waves' | 'ponytail' | 'slick' | 'receding' | 'buzz' | 'short' | 'mop' | 'updo' | 'curly';
export type TopStyle = 'blazer' | 'flannel' | 'cardigan' | 'leather' | 'suit' | 'shirt' | 'sweater' | 'tee' | 'polo' | 'hoodie' | 'dress';

export interface Look {
  height: number;
  build: number; // width multiplier
  female: boolean;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string; // outermost layer
  topStyle: TopStyle;
  under?: string; // shirt / top under a jacket or cardigan; the dress for a skirt
  collar?: string; // contrast shirt collar (defaults to `under`)
  tie?: string;
  tiePattern?: 'stripes' | 'diamonds';
  tieAccent?: string;
  pocketSquare?: string;
  neckline?: 'v' | 'turtleneck';
  apron?: { bib?: boolean; patterned?: boolean };
  vest?: string;
  plaid?: [string, string];
  tweed?: boolean;
  pants: string;
  jeans?: boolean;
  skirt?: string; // knee-length skirt (worn over `legs`)
  legs?: string; // tights
  shoes: string;
  boots?: boolean;
  eyes?: string;
  face?: { jaw?: number; long?: number; nose?: number; brow?: number };
  extras?: ('cap' | 'mustache' | 'goatee' | 'beard' | 'apron' | 'stubble' | 'pocketsquare' | 'headband' | 'glasses' | 'captainhat' | 'brass' | 'earrings')[];
}

export interface VoiceProfile {
  gender: 'male' | 'female';
  pitch: number;
  rate: number;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  color: string; // caption color
  look: Look;
  voice: VoiceProfile;
  main: boolean;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  ted: {
    id: 'ted',
    name: 'Ted',
    color: '#7fb4ff',
    main: true,
    look: {
      // Josh Radnor: tall and lean; tweed blazer over an oxford shirt, dark jeans
      height: 1.82, build: 0.97, female: false,
      skin: '#e9bc9a', hair: '#3a2416', hairStyle: 'swoop', eyes: '#4a2c1a',
      top: '#6e5038', topStyle: 'blazer', tweed: true, under: '#8fb0d9',
      pants: '#2b3448', jeans: true, shoes: '#4a2e1c',
      face: { long: 1.03, jaw: 0.97, nose: 1.05 },
    },
    voice: { gender: 'male', pitch: 1.0, rate: 1.02 },
  },
  marshall: {
    id: 'marshall',
    name: 'Marshall',
    color: '#9be38c',
    main: true,
    look: {
      // Jason Segel: very tall and big; untucked red flannel over a grey tee, khakis
      height: 1.95, build: 1.1, female: false,
      skin: '#efc4a2', hair: '#5a3a24', hairStyle: 'shaggy', eyes: '#3a2a1c',
      top: '#8a3328', topStyle: 'flannel', plaid: ['#2e1a16', '#d6b07a'], under: '#8d9299',
      pants: '#a8916a', shoes: '#4a3424',
      face: { long: 1.07, jaw: 1.1, nose: 1.1, brow: 1.2 },
    },
    voice: { gender: 'male', pitch: 0.92, rate: 1.0 },
  },
  lily: {
    id: 'lily',
    name: 'Lily',
    color: '#ff9ad5',
    main: true,
    look: {
      // Alyson Hannigan: petite; red bob, mustard cardigan over a teal dress, tights, red flats
      height: 1.62, build: 0.92, female: true,
      skin: '#f6d2b8', hair: '#b4401e', hairStyle: 'bob', eyes: '#5a4a2a',
      top: '#d7a33a', topStyle: 'cardigan', under: '#2b7d84', skirt: '#2b7d84',
      pants: '#3a2f3d', legs: '#3a2f3d', shoes: '#a3263a',
      face: { jaw: 0.9, long: 0.97, nose: 0.85 },
    },
    voice: { gender: 'female', pitch: 1.08, rate: 1.05 },
  },
  robin: {
    id: 'robin',
    name: 'Robin',
    color: '#ffc46b',
    main: true,
    look: {
      // Cobie Smulders: tall; long dark waves, brown leather jacket, blue top, skinny jeans, boots
      height: 1.74, build: 0.94, female: true,
      skin: '#f2c8a8', hair: '#3a2417', hairStyle: 'long', eyes: '#4a3a2a',
      top: '#5a3420', topStyle: 'leather', under: '#3f6fb0',
      pants: '#252c3e', jeans: true, shoes: '#2a1c14', boots: true,
      face: { jaw: 0.95, long: 1.02, nose: 0.9 },
    },
    voice: { gender: 'female', pitch: 0.96, rate: 1.02 },
  },
  barney: {
    id: 'barney',
    name: 'Barney',
    color: '#e6e6e6',
    main: true,
    look: {
      // Neil Patrick Harris: three-piece charcoal suit, white shirt, tie, pocket square
      height: 1.8, build: 1.0, female: false,
      skin: '#f2c9a9', hair: '#d2b16e', hairStyle: 'neat', eyes: '#3a5a7a',
      top: '#3a3e47', topStyle: 'suit', under: '#f4f4f2', vest: '#3a3e47', tie: '#9c2433',
      pants: '#3a3e47', shoes: '#141414', extras: ['pocketsquare'],
      face: { jaw: 1.0, long: 0.98, nose: 0.95 },
    },
    voice: { gender: 'male', pitch: 1.04, rate: 1.12 },
  },
  wendy: {
    id: 'wendy',
    name: 'Wendy',
    color: '#c7b3ff',
    main: false,
    look: {
      // Charlene Amoia: brunette ponytail, black tee, waist apron, jeans
      height: 1.66, build: 0.9, female: true,
      skin: '#f0c8aa', hair: '#3a2418', hairStyle: 'ponytail', eyes: '#3a2a1c',
      top: '#1d1d22', topStyle: 'tee', pants: '#2c3a55', jeans: true, shoes: '#222', extras: ['apron'],
      face: { jaw: 0.92, nose: 0.9 },
    },
    voice: { gender: 'female', pitch: 1.12, rate: 1.08 },
  },
  carl: {
    id: 'carl',
    name: 'Carl',
    color: '#c0a080',
    main: false,
    look: {
      // Joe Nieves: slicked-back dark hair, black button-up with rolled sleeves
      height: 1.78, build: 1.06, female: false,
      skin: '#d8a27e', hair: '#1e1814', hairStyle: 'slick', eyes: '#2a1c14',
      top: '#1f1f24', topStyle: 'shirt', pants: '#1c1c20', shoes: '#111',
      face: { jaw: 1.05, long: 1.02 },
    },
    voice: { gender: 'male', pitch: 0.88, rate: 0.95 },
  },
  ranjit: {
    id: 'ranjit',
    name: 'Ranjit',
    color: '#ffd966',
    main: false,
    look: {
      // Marshall Manesh: grey close-cropped hair, black chauffeur suit and tie
      height: 1.72, build: 1.06, female: false,
      skin: '#b8805a', hair: '#8f8b86', hairStyle: 'receding', eyes: '#2a1c14',
      top: '#18181c', topStyle: 'suit', under: '#f0f0f0', tie: '#18181c',
      pants: '#18181c', shoes: '#0d0d0d',
      face: { jaw: 1.04, long: 1.05, nose: 1.2, brow: 1.15 },
    },
    voice: { gender: 'male', pitch: 1.04, rate: 1.06 },
  },
  patrice: {
    id: 'patrice',
    name: 'Patrice',
    color: '#7fe0d0',
    main: false,
    look: {
      // Ellen D. Williams: dark shoulder-length hair with bangs, open red cardigan over a blue print blouse, dark slacks
      height: 1.58, build: 1.2, female: true,
      skin: '#d6a47c', hair: '#24160f', hairStyle: 'bob', eyes: '#2a1a12',
      top: '#a52a3c', topStyle: 'cardigan', under: '#2d5fa6',
      pants: '#34343c', shoes: '#1c1a1a',
      face: { jaw: 1.06, long: 0.95, nose: 0.95 },
    },
    voice: { gender: 'female', pitch: 1.15, rate: 1.12 },
  },
  captain: {
    id: 'captain',
    name: 'The Captain',
    color: '#f26d6d',
    main: false,
    look: {
      // Kyle MacLachlan: swept-back silver hair, captain's cap, navy brass-button blazer, red trousers, boat shoes
      height: 1.78, build: 1.0, female: false,
      skin: '#e2ae88', hair: '#bdb9b2', hairStyle: 'slick', eyes: '#3a4a5a',
      top: '#1c2442', topStyle: 'blazer', under: '#f4f4f0', extras: ['captainhat', 'brass'],
      pants: '#b0332c', shoes: '#7a5032',
      face: { jaw: 1.1, long: 1.04, nose: 1.05, brow: 1.15 },
    },
    voice: { gender: 'male', pitch: 0.88, rate: 0.94 },
  },
  marvin: {
    id: 'marvin',
    name: 'Marvin Sr.',
    color: '#ff9f5a',
    main: false,
    look: {
      // Bill Fagerbakke: huge Minnesotan dad; thinning strawberry-blond hair, glasses, red-and-green plaid flannel, jeans
      height: 1.96, build: 1.15, female: false,
      skin: '#f0c2a0', hair: '#c49a6c', hairStyle: 'receding', eyes: '#4a5a6a',
      top: '#9a2626', topStyle: 'flannel', plaid: ['#1d4a2a', '#e4dcc0'], under: '#e8e2d6', extras: ['glasses'],
      pants: '#34425e', jeans: true, shoes: '#5a3a22',
      face: { long: 1.06, jaw: 1.08, nose: 1.1, brow: 1.1 },
    },
    voice: { gender: 'male', pitch: 0.9, rate: 0.98 },
  },
  james: {
    id: 'james',
    name: 'James',
    color: '#d6ff7f',
    main: false,
    look: {
      // Wayne Brady: close-cropped hair, clean-shaven; as suited-up as his brother: slim navy suit, lavender shirt, purple tie
      height: 1.78, build: 1.02, female: false,
      skin: '#6e4632', hair: '#141010', hairStyle: 'buzz', eyes: '#2a1810',
      top: '#26304a', topStyle: 'suit', under: '#c9b8e0', tie: '#5a2a6a',
      pants: '#26304a', shoes: '#141414', extras: ['pocketsquare'],
      face: { jaw: 1.04, long: 1.02, nose: 1.1 },
    },
    voice: { gender: 'male', pitch: 1.04, rate: 1.1 },
  },
  // Episode stills and clothing notes for these eight guests are linked in README.md.
  sandy: {
    id: 'sandy', name: 'Sandy Rivers', color: '#d8b1e8', main: false,
    look: {
      // Alexis Denisof, "Come On": swept brown hair, gray suit, pink shirt with white collar, lavender accessories.
      height: 1.86, build: 1.02, female: false,
      skin: '#e7b996', hair: '#433126', hairStyle: 'swoop', eyes: '#627584',
      top: '#63676a', topStyle: 'suit', under: '#d49bb4', collar: '#f5f1e8',
      tie: '#b98fae', tiePattern: 'diamonds', tieAccent: '#68648b', pocketSquare: '#b896ce',
      pants: '#63676a', shoes: '#2a211c', extras: ['pocketsquare'],
      face: { long: 1.08, jaw: 1.03, nose: 1.14, brow: 1.05 },
    },
    voice: { gender: 'male', pitch: 0.9, rate: 1.01 },
  },
  arthur: {
    id: 'arthur', name: 'Arthur Hobbs', color: '#beb1f0', main: false,
    look: {
      // Bob Odenkirk: high hairline, brown hair, charcoal business suit, lavender shirt and patterned purple tie.
      height: 1.75, build: 1.03, female: false,
      skin: '#e8b68e', hair: '#60412b', hairStyle: 'receding', eyes: '#657a89',
      top: '#48464e', topStyle: 'suit', under: '#b5abcd',
      tie: '#77618e', tiePattern: 'diamonds', tieAccent: '#b6a1c6',
      pants: '#48464e', shoes: '#211e23',
      face: { long: 1.07, jaw: 1.0, nose: 1.2, brow: 1.18 },
    },
    voice: { gender: 'male', pitch: 0.91, rate: 1.1 },
  },
  brad: {
    id: 'brad', name: 'Brad', color: '#a2c5dc', main: false,
    look: {
      // Joe Manganiello, "Twelve Horny Women": tall, broad, dark swept hair and beard; dark suit, gray shirt, striped tie.
      height: 1.96, build: 1.2, female: false,
      skin: '#c58e6c', hair: '#28231e', hairStyle: 'shaggy', eyes: '#654833',
      top: '#292f35', topStyle: 'suit', under: '#a7aaa4',
      tie: '#222b2b', tiePattern: 'stripes', tieAccent: '#b7aa7e',
      pants: '#292f35', shoes: '#181b1c', extras: ['beard'],
      face: { long: 1.08, jaw: 1.2, nose: 1.12, brow: 1.25 },
    },
    voice: { gender: 'male', pitch: 0.8, rate: 0.94 },
  },
  victoria: {
    id: 'victoria', name: 'Victoria', color: '#ed9cce', main: false,
    look: {
      // Ashley Williams at the Architect's Ball: brunette updo, plum sleeveless ruffled dress, drop earrings.
      height: 1.7, build: 0.99, female: true,
      skin: '#efc1a0', hair: '#422d22', hairStyle: 'updo', eyes: '#65818b',
      top: '#64204f', topStyle: 'dress', skirt: '#64204f',
      pants: '#efc1a0', legs: '#efc1a0', shoes: '#392030', extras: ['earrings'],
      face: { jaw: 0.99, long: 0.98, nose: 0.9 },
    },
    voice: { gender: 'female', pitch: 1.03, rate: 1.0 },
  },
  quinn: {
    id: 'quinn', name: 'Quinn', color: '#f4b8a2', main: false,
    look: {
      // Becki Newton, "The Pre-Nup": long blonde waves, burgundy leather jacket over black, dark skinny jeans.
      height: 1.6, build: 0.91, female: true,
      skin: '#efbe9c', hair: '#c8a45e', hairStyle: 'waves', eyes: '#677c72',
      top: '#762c42', topStyle: 'leather', under: '#1a171c',
      pants: '#202431', jeans: true, shoes: '#241b21', boots: true,
      face: { jaw: 0.91, long: 1.02, nose: 0.87, brow: 1.05 },
    },
    voice: { gender: 'female', pitch: 0.99, rate: 1.09 },
  },
  kevin: {
    id: 'kevin', name: 'Kevin', color: '#b4aae8', main: false,
    look: {
      // Kal Penn, "Mystery vs. History": short black hair, purple V-neck over a white crew-neck tee, gray jeans.
      height: 1.78, build: 1.05, female: false,
      skin: '#b87f58', hair: '#181716', hairStyle: 'short', eyes: '#30231b',
      top: '#534763', topStyle: 'sweater', neckline: 'v', under: '#eeeae5',
      pants: '#656969', jeans: true, shoes: '#322821',
      face: { jaw: 1.1, long: 0.98, nose: 1.09, brow: 1.24 },
    },
    voice: { gender: 'male', pitch: 0.96, rate: 0.98 },
  },
  judy: {
    id: 'judy', name: 'Judy Eriksen', color: '#eedb8c', main: false,
    look: {
      // Suzie Plakson's own HIMYM still: tall, voluminous auburn curls, pale yellow turtleneck and printed kitchen apron.
      height: 1.87, build: 1.0, female: true,
      skin: '#efbc9d', hair: '#7d3523', hairStyle: 'curly', eyes: '#587184',
      top: '#edcf79', topStyle: 'sweater', neckline: 'turtleneck',
      pants: '#655546', shoes: '#594030', extras: ['apron'], apron: { bib: true, patterned: true },
      face: { long: 1.08, jaw: 0.98, nose: 1.1, brow: 1.08 },
    },
    voice: { gender: 'female', pitch: 0.89, rate: 1.02 },
  },
  scooter: {
    id: 'scooter', name: 'Scooter', color: '#e7b69a', main: false,
    look: {
      // David Burtka, "Something Borrowed": tousled brown hair, brown suit, ivory shirt, red diamond-pattern tie.
      height: 1.75, build: 0.96, female: false,
      skin: '#edbb9a', hair: '#503522', hairStyle: 'messy', eyes: '#785438',
      top: '#4c372d', topStyle: 'suit', under: '#eee2c7',
      tie: '#a72e38', tiePattern: 'diamonds', tieAccent: '#b7a67d',
      pants: '#4c372d', shoes: '#37261d',
      face: { jaw: 1.06, long: 0.96, nose: 0.93, brow: 1.08 },
    },
    voice: { gender: 'male', pitch: 1.12, rate: 1.08 },
  },
  penny: {
    id: 'penny',
    name: 'Penny',
    color: '#ffa8bc',
    main: false,
    look: {
      // Lyndsy Fonseca, 2030: Ted's teenage daughter. Long dark-brown waves over her shoulders, a pale pink
      // cardigan over a periwinkle top, khakis; sits cross-legged on the couch in white socks, hugging a striped pillow
      height: 1.62, build: 0.86, female: true,
      skin: '#f2c9ab', hair: '#4a2a1a', hairStyle: 'waves', eyes: '#5a6a4a',
      top: '#ecc4cc', topStyle: 'cardigan', under: '#8088c8',
      pants: '#b89a70', shoes: '#efede6',
      face: { jaw: 0.86, long: 0.97, nose: 0.82 },
    },
    voice: { gender: 'female', pitch: 1.16, rate: 1.06 },
  },
  luke: {
    id: 'luke',
    name: 'Luke',
    color: '#78d48a',
    main: false,
    look: {
      // David Henrie, 2030: Ted's younger son. Thick dark hair, open grey zip hoodie over a green polo with a
      // white collar, jeans; slouched on the couch with an arm along the back
      height: 1.68, build: 0.92, female: false,
      skin: '#eebf9e', hair: '#21150e', hairStyle: 'mop', eyes: '#4a3424',
      top: '#7f8288', topStyle: 'hoodie', under: '#2f8a42', collar: '#efeee8',
      pants: '#3a4c70', jeans: true, shoes: '#2a2a30',
      face: { jaw: 0.94, long: 0.96, nose: 0.92, brow: 1.1 },
    },
    voice: { gender: 'male', pitch: 1.18, rate: 1.06 },
  },
  // One-off guest stars, recast by every episode that has them (see setGuests).
  guest1: guestDef(placeholderGuest('guest1')),
  guest2: guestDef(placeholderGuest('guest2')),
  guest3: guestDef(placeholderGuest('guest3')),
};

/** Cast this episode's guest stars into their slots (unused slots go back to the placeholder). Returns the slots that changed. */
export function setGuests(guests: GuestStar[] = []) {
  const changed: CharacterId[] = [];
  for (const id of GUEST_IDS) {
    const def = guestDef(guests.find((g) => g.id === id) ?? placeholderGuest(id));
    if (JSON.stringify(def) === JSON.stringify(CHARACTERS[id])) continue;
    CHARACTERS[id] = def;
    changed.push(id);
  }
  return changed;
}

export const FUTURE_TED_VOICE: VoiceProfile = {
  gender: 'male',
  pitch: 0.94,
  rate: 0.96,
};

export function charName(id: string) {
  return (CHARACTERS as Record<string, CharacterDef>)[id]?.name ?? id;
}
