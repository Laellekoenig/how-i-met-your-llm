// The script language shared by the LLM, the sample episodes and the player.

export const CHARACTER_IDS = ['ted', 'marshall', 'lily', 'robin', 'barney', 'wendy', 'carl', 'ranjit'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export const LOCATION_IDS = ['maclarens', 'apartment', 'barneys'] as const;
export type LocationId = (typeof LOCATION_IDS)[number];

export const EMOTIONS = [
  'neutral', 'happy', 'sad', 'angry', 'surprised', 'smug', 'confused', 'excited', 'nervous', 'flirty',
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const GESTURES = [
  'none', 'wave', 'point', 'shrug', 'facepalm', 'arms_crossed', 'drink', 'cheers', 'thumbs_up',
  'high_five', 'suit_up', 'hands_up', 'nod', 'shake_head', 'dance', 'hug', 'slap', 'think',
] as const;
export type Gesture = (typeof GESTURES)[number];

export const LAUGHS = ['chuckle', 'laugh', 'big', 'ooh', 'aww', 'applause', 'woo', 'gasp'] as const;
export type LaughKind = (typeof LAUGHS)[number];

export type TimeOfDay = 'day' | 'night';

export type Beat =
  | { type: 'say'; character: CharacterId; line: string; emotion?: Emotion; to?: string; gesture?: Gesture; laugh?: LaughKind }
  | { type: 'narrate'; line: string; laugh?: LaughKind }
  | { type: 'move'; character: CharacterId; to: string }
  | { type: 'enter'; character: CharacterId; to?: string }
  | { type: 'exit'; character: CharacterId }
  | { type: 'act'; character: CharacterId; gesture: Gesture; to?: string; emotion?: Emotion }
  | { type: 'laugh'; laugh: LaughKind }
  | { type: 'pause'; seconds: number };

export interface CastPlacement {
  character: CharacterId;
  mark: string;
}

export interface Scene {
  location: LocationId;
  time: TimeOfDay;
  summary?: string;
  cast: CastPlacement[];
  beats: Beat[];
}

export interface EpisodeMeta {
  id: string;
  title: string;
  logline: string;
  code: string; // e.g. "S04E12"
  source: 'sample' | 'llm';
}

// Items the player consumes, in order.
export type ShowItem =
  | { kind: 'episode-start'; episode: EpisodeMeta; coldOpen: string; location: LocationId; time: TimeOfDay; characters?: CharacterId[] }
  | { kind: 'scene'; episode: EpisodeMeta; index: number; scene: Scene }
  | { kind: 'episode-end'; episode: EpisodeMeta };
