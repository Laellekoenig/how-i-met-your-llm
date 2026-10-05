import type { CharacterId } from '../script/types';

export type HairStyle = 'swoop' | 'messy' | 'neat' | 'bob' | 'long' | 'ponytail' | 'buzz' | 'short';
export type TopStyle = 'sweater' | 'flannel' | 'cardigan' | 'jacket' | 'suit' | 'tee' | 'polo';

export interface Look {
  height: number;
  build: number; // width multiplier
  female: boolean;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  topStyle: TopStyle;
  under?: string; // shirt under jacket / cardigan / sweater collar
  tie?: string;
  plaid?: [string, string];
  pants: string;
  shoes: string;
  extras?: ('cap' | 'mustache' | 'apron' | 'stubble' | 'pocketsquare')[];
}

export interface VoiceProfile {
  gender: 'male' | 'female';
  pitch: number;
  rate: number;
  prefer: string[]; // preferred voice name fragments, in order
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
      height: 1.82, build: 1.0, female: false,
      skin: '#e8b996', hair: '#4a2f1d', hairStyle: 'swoop',
      top: '#2f3f63', topStyle: 'sweater', under: '#dfe7f2',
      pants: '#2b3446', shoes: '#4a3020',
    },
    voice: { gender: 'male', pitch: 1.0, rate: 1.02, prefer: ['Andrew', 'Guy', 'Aaron', 'Evan', 'Nathan', 'Alex', 'Tom', 'Google UK English Male', 'Daniel'] },
  },
  marshall: {
    id: 'marshall',
    name: 'Marshall',
    color: '#9be38c',
    main: true,
    look: {
      height: 1.95, build: 1.22, female: false,
      skin: '#efc3a0', hair: '#5a3a22', hairStyle: 'messy',
      top: '#7a3b2a', topStyle: 'flannel', plaid: ['#3a1d16', '#d9a26b'], under: '#3b4a5c',
      pants: '#a58a62', shoes: '#3a2a1c',
    },
    voice: { gender: 'male', pitch: 0.92, rate: 1.0, prefer: ['Christopher', 'Eric', 'Roger', 'Tom', 'Alex', 'Gordon'] },
  },
  lily: {
    id: 'lily',
    name: 'Lily',
    color: '#ff9ad5',
    main: true,
    look: {
      height: 1.62, build: 0.9, female: true,
      skin: '#f3c9a8', hair: '#a8381c', hairStyle: 'bob',
      top: '#7d3f8c', topStyle: 'cardigan', under: '#2f8f83',
      pants: '#2a2638', shoes: '#7a2236',
    },
    voice: { gender: 'female', pitch: 1.08, rate: 1.05, prefer: ['Jenny', 'Aria', 'Samantha', 'Ava', 'Allison', 'Google US English', 'Nicky'] },
  },
  robin: {
    id: 'robin',
    name: 'Robin',
    color: '#ffc46b',
    main: true,
    look: {
      height: 1.74, build: 0.92, female: true,
      skin: '#f0c4a4', hair: '#3a2418', hairStyle: 'long',
      top: '#4b2c1c', topStyle: 'jacket', under: '#3f6fb0',
      pants: '#1f2533', shoes: '#241a14',
    },
    voice: { gender: 'female', pitch: 0.96, rate: 1.02, prefer: ['Clara', 'Michelle', 'Karen', 'Susan', 'Zoe', 'Google UK English Female', 'Catherine', 'Victoria'] },
  },
  barney: {
    id: 'barney',
    name: 'Barney',
    color: '#e6e6e6',
    main: true,
    look: {
      height: 1.79, build: 1.0, female: false,
      skin: '#f0c7a6', hair: '#d8b96a', hairStyle: 'neat',
      top: '#3a3d45', topStyle: 'suit', under: '#f2f2f2', tie: '#b02a37',
      pants: '#34373f', shoes: '#141414', extras: ['pocketsquare'],
    },
    voice: { gender: 'male', pitch: 1.04, rate: 1.12, prefer: ['Brian', 'Ryan', 'Christopher', 'Oliver', 'Arthur', 'Daniel', 'Google UK English Male'] },
  },
  wendy: {
    id: 'wendy',
    name: 'Wendy',
    color: '#c7b3ff',
    main: false,
    look: {
      height: 1.66, build: 0.9, female: true,
      skin: '#f2cbb0', hair: '#e2c06e', hairStyle: 'ponytail',
      top: '#1d1d22', topStyle: 'tee', pants: '#2c3a55', shoes: '#222', extras: ['apron'],
    },
    voice: { gender: 'female', pitch: 1.12, rate: 1.08, prefer: ['Ava', 'Emma', 'Allison', 'Tessa', 'Moira', 'Nicky', 'Samantha'] },
  },
  carl: {
    id: 'carl',
    name: 'Carl',
    color: '#c0a080',
    main: false,
    look: {
      height: 1.8, build: 1.1, female: false,
      skin: '#e3b08c', hair: '#2a2420', hairStyle: 'buzz',
      top: '#26262b', topStyle: 'polo', pants: '#1c1c20', shoes: '#111', extras: ['stubble'],
    },
    voice: { gender: 'male', pitch: 0.88, rate: 0.95, prefer: ['Roger', 'Gordon', 'Lee', 'Eric'] },
  },
  ranjit: {
    id: 'ranjit',
    name: 'Ranjit',
    color: '#ffd966',
    main: false,
    look: {
      height: 1.72, build: 1.0, female: false,
      skin: '#a8714e', hair: '#151010', hairStyle: 'short',
      top: '#18181c', topStyle: 'suit', under: '#f0f0f0', tie: '#18181c',
      pants: '#18181c', shoes: '#0d0d0d', extras: ['cap', 'mustache'],
    },
    voice: { gender: 'male', pitch: 1.04, rate: 1.06, prefer: ['Rishi', 'Prabhat', 'Ravi'] },
  },
};

export const FUTURE_TED_VOICE: VoiceProfile = {
  gender: 'male',
  pitch: 0.94,
  rate: 0.96,
  prefer: ['Davis', 'Steffan', 'Roger', 'Gordon', 'Lee', 'Alex', 'Daniel'],
};

export function charName(id: string) {
  return (CHARACTERS as Record<string, CharacterDef>)[id]?.name ?? id;
}
