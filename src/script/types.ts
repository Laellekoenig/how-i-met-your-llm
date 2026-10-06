// The script language shared by the episode files (episodes/*.json), the validator and the player.

export const CHARACTER_IDS = ['ted', 'marshall', 'lily', 'robin', 'barney', 'wendy', 'carl', 'ranjit', 'patrice', 'captain', 'marvin', 'james', 'sandy', 'arthur', 'brad', 'victoria', 'quinn', 'kevin', 'judy', 'scooter', 'loretta', 'mickey', 'hammond', 'stella', 'zoey', 'nora', 'virginia', 'punchy', 'robin_sparkles', 'guest1', 'guest2', 'guest3', 'penny', 'luke'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

/** One-off guest stars (Ted's date, Barney's mark, a bouncer): slots each episode recasts. */
export const GUEST_IDS = ['guest1', 'guest2', 'guest3'] as const satisfies readonly CharacterId[];
export type GuestId = (typeof GUEST_IDS)[number];
export const isGuest = (id: string | undefined): id is GuestId => (GUEST_IDS as readonly string[]).includes(id ?? '');

/** Ted's kids only exist in 2030, on the couch. Anything they say or do cuts away to them. */
export const KIDS = ['penny', 'luke'] as const satisfies readonly CharacterId[];
export const isKid = (id: string | undefined) => (KIDS as readonly string[]).includes(id ?? '');

/** Where the story's scenes take place. */
export const SCENE_LOCATION_IDS = ['maclarens', 'apartment', 'barneys', 'rooftop', 'barneys_office', 'office', 'metro_news_one', 'store', 'restaurant', 'lecture_hall', 'limo', 'taxi', 'subway', 'laser_tag', 'wesleyan_dorm', 'hospital', 'elevator', 'canadian_mall', 'maclarens_sidewalk', 'hoser_hut', 'courtroom', 'atlantic_city_casino', 'lusty_leopard'] as const;
/** ...plus Ted's living room in 2030, where he's telling the kids the story. */
export const LOCATION_IDS = [...SCENE_LOCATION_IDS, 'future'] as const;
export type LocationId = (typeof LOCATION_IDS)[number];

export const EMOTIONS = [
  'neutral', 'happy', 'sad', 'angry', 'surprised', 'smug', 'confused', 'excited', 'nervous', 'flirty', 'bored',
  'embarrassed', 'disgusted', 'scared', 'suspicious', 'proud', 'laughing', 'crying', 'drunk',
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const GESTURES = [
  'none', 'wave', 'point', 'shrug', 'facepalm', 'arms_crossed', 'drink', 'cheers', 'thumbs_up',
  'high_five', 'suit_up', 'hands_up', 'nod', 'shake_head', 'dance', 'hug', 'slap', 'think',
  'kiss', 'phone_call', 'sit', 'stand', 'lean_in', 'jaw_drop', 'fist_bump', 'spit_take',
  'double_take', 'eye_roll', 'crack_up', 'sob', 'slow_clap', 'hands_on_hips', 'head_in_hands', 'air_quotes',
  'fist_pump', 'cover_mouth',
] as const;
export type Gesture = (typeof GESTURES)[number];
/** Gestures done to someone else, who joins in (or gets slapped). */
export const PAIRED_GESTURES = ['high_five', 'hug', 'slap', 'kiss', 'fist_bump'] as const satisfies readonly Gesture[];

/** Things people carry around and hand to each other. */
export const PROPS = [
  'phone', 'ring', 'envelope', 'beer', 'glass', 'flowers', 'book', 'umbrella', 'pineapple', 'goat', 'gift', 'sword',
  'briefcase', 'microphone', 'french_horn',
] as const;
export type Prop = (typeof PROPS)[number];

/** Camera intent the writer can put on a beat; otherwise the director picks the coverage. */
export const SHOTS = ['closeup', 'two', 'push_in', 'wide'] as const;
export type ShotIntent = (typeof SHOTS)[number];

/** Full-screen cards: a text message, one of Barney's charts or slideshows, a sign, a page of the Playbook. */
export const INSERT_KINDS = ['text', 'chart', 'slides', 'sign', 'playbook'] as const;
export type InsertKind = (typeof INSERT_KINDS)[number];
export const CHART_STYLES = ['bar', 'line', 'pie'] as const;
export type ChartStyle = (typeof CHART_STYLES)[number];

/** Music under a montage. */
export const MONTAGE_MUSIC = ['upbeat', 'tender'] as const;
export type MontageMusic = (typeof MONTAGE_MUSIC)[number];

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
export const TRANSITIONS = ['cut', 'skyline', 'exterior', 'atlantic_city', 'rewind'] as const;
export type Transition = (typeof TRANSITIONS)[number];

/** A listener's reaction once a line (or an insert) lands: the shocked stare, the spit take. */
export interface Reaction {
  character: CharacterId;
  emotion?: Emotion;
  gesture?: Gesture;
}

export type Beat =
  | {
    type: 'say'; character: CharacterId; line: string; emotion?: Emotion; to?: string; gesture?: Gesture; laugh?: LaughKind;
    delivery?: Delivery;
    /** The next beat cuts this line off: it ends on a dash and the next speaker jumps straight in. */
    interrupted?: boolean;
    /** Everyone else saying it at the same time ("ALL: What?!"). */
    chorus?: CharacterId[];
    react?: Reaction[];
    shot?: ShotIntent;
  }
  | { type: 'narrate'; line: string; laugh?: LaughKind }
  | { type: 'move'; character: CharacterId; to: string }
  | { type: 'enter'; character: CharacterId; to?: string }
  | { type: 'exit'; character: CharacterId }
  | { type: 'act'; character: CharacterId; gesture: Gesture; to?: string; emotion?: Emotion; shot?: ShotIntent }
  | { type: 'laugh'; laugh: LaughKind }
  | { type: 'pause'; seconds: number }
  /** Pick something up (or put it down with prop "none"). */
  | { type: 'hold'; character: CharacterId; prop: Prop | 'none'; shot?: ShotIntent }
  /** Hand what you're holding (or `prop`) to someone. */
  | { type: 'give'; character: CharacterId; to: CharacterId; prop?: Prop; shot?: ShotIntent }
  | FreezeBeat
  | InsertBeat
  | CutawayBeat
  | MontageBeat;

/** Future Ted talks over a frozen frame, optionally caught mid-gesture ("Kids, this is the moment...") */
export interface FreezeBeat {
  type: 'freeze';
  line: string;
  /** Who the frame is on. Without one, the frame freezes on whatever shot is up. */
  character?: CharacterId;
  gesture?: Gesture;
  to?: CharacterId;
  emotion?: Emotion;
  laugh?: LaughKind;
  shot?: ShotIntent;
}

/** A full-screen card, held long enough to read, with an optional line read over it. */
export interface InsertBeat {
  type: 'insert';
  kind: InsertKind;
  /** Chart, slide, sign or play name; for a text, who the thread is with. */
  title?: string;
  /** Slide bullets, Playbook steps, the sign's smaller print. */
  lines?: string[];
  /** A text thread. Messages from the phone's owner (`character`) are on the right. */
  messages?: { from: CharacterId | string; text: string }[];
  /** A chart's labelled values. */
  items?: { label: string; value: number }[];
  chart?: ChartStyle;
  /** Whose phone, chart, slideshow or Playbook it is; reads `line` over the card. */
  character?: CharacterId;
  /** Read over the card by `character`, or by Future Ted. */
  line?: string;
  laugh?: LaughKind;
  react?: Reaction[];
}

/** "And that's how it went for three weeks": quick shots across sets over music, then back to the scene. */
export interface MontageBeat {
  type: 'montage';
  /** Card over the first shot, e.g. "Three weeks of canoe lessons". */
  label?: string;
  music: MontageMusic;
  shots: MontageShot[];
}

/** One montage shot: one or two beats somewhere, with its own little card ("Day 3"). */
export interface MontageShot {
  location: SceneLocationId;
  time: TimeOfDay;
  label?: string;
  cast: CastPlacement[];
  beats: Beat[];
}

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

/**
 * A change of clothes for one character, in the guest-star vocabulary: anything left out stays as it is.
 * Ted's red boots, Barney in sweatpants, a wedding. Worn over their casual or work clothes.
 */
export interface Costume {
  character: CharacterId;
  topStyle?: (typeof GUEST_TOPS)[number];
  top?: string;
  under?: string;
  tie?: string;
  vest?: string;
  pants?: string;
  shoes?: string;
  boots?: boolean;
  hairStyle?: (typeof GUEST_HAIR_STYLES)[number];
  extras?: (typeof GUEST_EXTRAS)[number][];
}

export interface Scene {
  location: LocationId;
  time: TimeOfDay;
  summary?: string;
  /** Omit for automatic skyline/time-change, exterior/location-change, or same-location cut. */
  transition?: Transition;
  /** Costumes for this scene, over the episode's. */
  wardrobe?: Costume[];
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
  /** Optional Future Ted line over the 2030 couch. Omit along with couch to open in scenes[0]. */
  coldOpen?: string;
  /** Optional couch opening: penny/luke say beats and Future Ted narrate answers; can open without coldOpen. */
  couch?: Beat[];
  guests?: GuestStar[];
  /** Costumes worn all episode, over everyone's casual or work clothes. */
  wardrobe?: Costume[];
  scenes: Scene[];
}

// Items the player consumes, in order.
export type ShowItem =
  /** Couch opening or the first story scene, followed by the main titles. */
  | { kind: 'episode-start'; episode: EpisodeMeta; coldOpen?: string; couch?: Beat[]; openingScene?: Scene; guests?: GuestStar[]; wardrobe?: Costume[] }
  | { kind: 'scene'; episode: EpisodeMeta; index: number; scene: Scene }
  | { kind: 'episode-end'; episode: EpisodeMeta };
