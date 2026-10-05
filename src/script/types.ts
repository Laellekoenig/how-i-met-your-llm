// The script language shared by the episode files (episodes/*.json), the validator and the player.

export const CHARACTER_IDS = ['ted', 'marshall', 'lily', 'robin', 'barney', 'wendy', 'carl', 'ranjit', 'patrice', 'captain', 'marvin', 'james', 'sandy', 'arthur', 'brad', 'victoria', 'quinn', 'kevin', 'judy', 'scooter', 'guest1', 'guest2', 'guest3', 'penny', 'luke'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

/** One-off guest stars (Ted's date, Barney's mark, a bouncer): slots each episode recasts. */
export const GUEST_IDS = ['guest1', 'guest2', 'guest3'] as const satisfies readonly CharacterId[];
export type GuestId = (typeof GUEST_IDS)[number];
export const isGuest = (id: string | undefined): id is GuestId => (GUEST_IDS as readonly string[]).includes(id ?? '');

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

/** How a line is performed: shapes the voice, the caption and the camera. */
export const DELIVERIES = ['whisper', 'shout', 'sing', 'deadpan', 'fast', 'slow'] as const;
export type Delivery = (typeof DELIVERIES)[number];

/** A cutaway is either a character's fantasy / hypothetical, or an actual memory. */
export const CUTAWAY_STYLES = ['imagined', 'flashback'] as const;
export type CutawayStyle = (typeof CUTAWAY_STYLES)[number];

// What a writer can say about a guest star's look, in plain words.
export const GUEST_SKIN = ['fair', 'light', 'olive', 'tan', 'brown', 'dark'] as const;
export const GUEST_HAIR = ['black', 'dark_brown', 'brown', 'auburn', 'red', 'blonde', 'gray', 'white'] as const;
export const GUEST_HAIR_STYLES = ['short', 'buzz', 'neat', 'slick', 'messy', 'shaggy', 'swoop', 'receding', 'curly', 'bob', 'long', 'waves', 'ponytail', 'updo'] as const;
export const GUEST_TOPS = ['suit', 'blazer', 'shirt', 'tee', 'polo', 'sweater', 'cardigan', 'hoodie', 'flannel', 'leather', 'dress'] as const;
export const GUEST_COLORS = [
  'black', 'charcoal', 'gray', 'white', 'cream', 'navy', 'blue', 'sky', 'teal', 'green', 'olive', 'red', 'burgundy',
  'pink', 'purple', 'lavender', 'yellow', 'mustard', 'orange', 'brown', 'tan', 'denim',
] as const;
export const GUEST_EXTRAS = ['glasses', 'beard', 'mustache', 'goatee', 'stubble', 'earrings', 'cap', 'headband', 'apron'] as const;

/** A one-off character the writer invents for one episode. Colors are GUEST_COLORS names or #rrggbb. */
export interface GuestStar {
  id: GuestId;
  name: string;
  /** Who they are and their comic hook, for the writer: "Ted's date, a sommelier who whispers everything". */
  role: string;
  gender: 'male' | 'female';
  height: 'short' | 'average' | 'tall';
  build: 'slim' | 'average' | 'broad';
  skin: (typeof GUEST_SKIN)[number];
  hair: (typeof GUEST_HAIR)[number];
  hairStyle: (typeof GUEST_HAIR_STYLES)[number];
  top: string;
  topStyle: (typeof GUEST_TOPS)[number];
  /** Shirt under a jacket/cardigan. */
  under?: string;
  tie?: string;
  vest?: string;
  pants: string;
  extras: (typeof GUEST_EXTRAS)[number][];
  voice: { pitch: 'low' | 'medium' | 'high'; pace: 'slow' | 'normal' | 'fast' };
}

/**
 * How we get into a scene, HIMYM-style. Most scenes just cut in on the guitar sting; now and then the show
 * cuts to the New York skyline or the outside of the building first, or uses a rewind cue when Future Ted
 * is getting ahead of himself. An opening narrate beat can play over an establishing shot.
 */
export const TRANSITIONS = ['cut', 'skyline', 'exterior', 'rewind'] as const;
export type Transition = (typeof TRANSITIONS)[number];

export type Beat =
  | {
    type: 'say'; character: CharacterId; line: string; emotion?: Emotion; to?: string; gesture?: Gesture; laugh?: LaughKind;
    delivery?: Delivery;
    /** The next beat cuts this line off: it ends on a dash and the next speaker jumps straight in. */
    interrupted?: boolean;
  }
  | { type: 'narrate'; line: string; laugh?: LaughKind }
  | { type: 'move'; character: CharacterId; to: string }
  | { type: 'enter'; character: CharacterId; to?: string }
  | { type: 'exit'; character: CharacterId }
  | { type: 'act'; character: CharacterId; gesture: Gesture; to?: string; emotion?: Emotion }
  | { type: 'laugh'; laugh: LaughKind }
  | { type: 'pause'; seconds: number }
  | CutawayBeat;

/**
 * Leave the scene for a short sequence somewhere else ("Here's how Barney imagined it", "Three years earlier"),
 * then come back to exactly where we left it. Its beats can't contain another cutaway.
 */
export interface CutawayBeat {
  type: 'cutaway';
  style: CutawayStyle;
  /** Short on-screen card, e.g. "How Barney imagined it". */
  label?: string;
  location: SceneLocationId;
  time: TimeOfDay;
  cast: CastPlacement[];
  beats: Beat[];
}

export type SceneLocationId = (typeof SCENE_LOCATION_IDS)[number];

/** What someone is wearing: their own clothes, or their work clothes (Ted and Marshall suit up for the office). */
export const OUTFITS = ['casual', 'work'] as const;
export type Outfit = (typeof OUTFITS)[number];

export interface CastPlacement {
  character: CharacterId;
  mark: string;
  /** Omit to dress for the location: work clothes at their own workplace, their own clothes anywhere else. */
  outfit?: Outfit;
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
}

/** One pre-written episode, as stored in episodes/<code>-<slug>.json. */
export interface EpisodeScript {
  code: string;
  title: string;
  logline: string;
  /** Future Ted over the kids on the couch in 2030: "Kids, ..." */
  coldOpen: string;
  /** The kids' reaction to the cold open: say beats by penny/luke and Future Ted's narrate answers. */
  couch?: Beat[];
  guests?: GuestStar[];
  scenes: Scene[];
}

// Items the player consumes, in order.
export type ShowItem =
  /** Future Ted's cold open over the kids on the couch, then any couch beats (the kids' reaction). */
  | { kind: 'episode-start'; episode: EpisodeMeta; coldOpen: string; couch?: Beat[]; guests?: GuestStar[] }
  | { kind: 'scene'; episode: EpisodeMeta; index: number; scene: Scene }
  | { kind: 'episode-end'; episode: EpisodeMeta };
