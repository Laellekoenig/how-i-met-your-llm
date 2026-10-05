import type { CharacterId } from '../script/types';

export type HairStyle = 'swoop' | 'shaggy' | 'messy' | 'neat' | 'bob' | 'long' | 'ponytail' | 'slick' | 'receding' | 'buzz' | 'short';
export type TopStyle = 'blazer' | 'flannel' | 'cardigan' | 'leather' | 'suit' | 'shirt' | 'sweater' | 'tee' | 'polo';

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
  tie?: string;
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
  extras?: ('cap' | 'mustache' | 'goatee' | 'apron' | 'stubble' | 'pocketsquare' | 'headband' | 'glasses' | 'captainhat' | 'brass')[];
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
};

export const FUTURE_TED_VOICE: VoiceProfile = {
  gender: 'male',
  pitch: 0.94,
  rate: 0.96,
};

export function charName(id: string) {
  return (CHARACTERS as Record<string, CharacterDef>)[id]?.name ?? id;
}
