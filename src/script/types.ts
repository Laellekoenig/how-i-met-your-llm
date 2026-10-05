// The script language shared by the LLM, the sample episodes and the player.

export const CHARACTER_IDS = ['ted', 'marshall', 'lily', 'robin', 'barney', 'wendy', 'carl', 'ranjit', 'patrice', 'captain', 'marvin', 'james', 'sandy', 'arthur', 'brad', 'victoria', 'quinn', 'kevin', 'judy', 'scooter', 'penny', 'luke'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

/** Ted's kids only exist in 2030, on the couch. Anything they say or do cuts away to them. */
export const KIDS = ['penny', 'luke'] as const satisfies readonly CharacterId[];
export const isKid = (id: string | undefined) => (KIDS as readonly string[]).includes(id ?? '');

/** Where the story's scenes take place. */
export const SCENE_LOCATION_IDS = ['maclarens', 'apartment', 'barneys', 'rooftop', 'barneys_office', 'office', 'metro_news_one', 'store', 'restaurant', 'lecture_hall', 'limo', 'taxi'] as const;
/** ...plus Ted's living room in 2030, where he's telling the kids the story. */
export const LOCATION_IDS = [...SCENE_LOCATION_IDS, 'future'] as const;
export type LocationId = (typeof LOCATION_IDS)[number];

export const EMOTIONS = [
  'neutral', 'happy', 'sad', 'angry', 'surprised', 'smug', 'confused', 'excited', 'nervous', 'flirty', 'bored',
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

/**
 * How we get into a scene, HIMYM-style. Most scenes just cut in on the guitar sting; now and then the show
 * cuts to the New York skyline or the outside of the building first, or uses a rewind cue when Future Ted
 * is getting ahead of himself. An opening narrate beat can play over an establishing shot.
 */
export const TRANSITIONS = ['cut', 'skyline', 'exterior', 'rewind'] as const;
export type Transition = (typeof TRANSITIONS)[number];

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
  /** Omit for automatic skyline/time-change, exterior/location-change, or same-location cut. */
  transition?: Transition;
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
  /** Future Ted's cold open over the kids on the couch, then any couch beats (the kids' reaction). */
  | { kind: 'episode-start'; episode: EpisodeMeta; coldOpen: string; couch?: Beat[] }
  | { kind: 'scene'; episode: EpisodeMeta; index: number; scene: Scene }
  | { kind: 'episode-end'; episode: EpisodeMeta };
