import type { Beat, CastPlacement, CharacterId, CutawayStyle, Delivery, Emotion, Gesture, GuestStar, LaughKind, Scene, SceneLocationId, ShowItem, EpisodeMeta, TimeOfDay } from './types';

// Hand-written "reruns" that play when no LLM is connected (and as filler).

type SayOpts = { e?: Emotion; to?: CharacterId; g?: Gesture; l?: LaughKind; d?: Delivery; cut?: boolean };
const say = (character: CharacterId, line: string, o: SayOpts = {}): Beat => ({
  type: 'say', character, line, emotion: o.e, to: o.to, gesture: o.g, laugh: o.l, ...(o.d ? { delivery: o.d } : {}), ...(o.cut ? { interrupted: true } : {}),
});
const cutaway = (style: CutawayStyle, label: string, location: SceneLocationId, time: TimeOfDay, cast: CastPlacement[], beats: Beat[]): Beat =>
  ({ type: 'cutaway', style, label, location, time, cast, beats });
const narr = (line: string, laugh?: LaughKind): Beat => ({ type: 'narrate', line, laugh });
const move = (character: CharacterId, to: string): Beat => ({ type: 'move', character, to });
const enter = (character: CharacterId, to?: string): Beat => ({ type: 'enter', character, to });
const exit = (character: CharacterId): Beat => ({ type: 'exit', character });
const act = (character: CharacterId, gesture: Gesture, to?: CharacterId, emotion?: Emotion): Beat => ({ type: 'act', character, gesture, to, emotion });

export interface SampleEpisode {
  meta: Omit<EpisodeMeta, 'id' | 'source'>;
  coldOpen: string;
  couch?: Beat[]; // the kids' reaction to the cold open
  guests?: GuestStar[];
  scenes: Scene[];
}

// Every rerun casts its own guest stars, cuts away at least once, and leans on delivery for its jokes.
// Together they visit the public sets, the cars and the roof, and give each recurring character a scene.

/** Barney's understudy: an imagined cutaway, a guest who out-Barneys Barney, and Quinn, who can tell. */
const UNDERSTUDY: SampleEpisode = {
  meta: { code: 'S10E01', title: 'The Understudy', logline: 'Barney hires a community-theater actor to be Barney at the boring parts of his life. The actor turns out to be a better Barney than Barney.' },
  coldOpen: 'Kids, in the winter of 2009, your Uncle Barney had a problem. There was only one of him. So he held auditions.',
  couch: [say('luke', 'Please tell me he built a robot.', { e: 'bored' }), narr('Worse. He hired an actor.', 'chuckle')],
  guests: [
    {
      id: 'guest1', name: 'Gordon', role: 'a community-theater actor Barney hires to play Barney, who goes so deep into the role that he improves it',
      gender: 'male', height: 'tall', build: 'slim', skin: 'fair', hair: 'blonde', hairStyle: 'slick',
      top: 'charcoal', topStyle: 'suit', under: 'white', tie: 'red', pants: 'charcoal', extras: ['mustache'],
      voice: { pitch: 'low', pace: 'slow' },
    },
  ],
  scenes: [
    {
      location: 'maclarens', time: 'night', transition: 'skyline',
      cast: [
        { character: 'ted', mark: 'booth_end' }, { character: 'marshall', mark: 'booth_left_back' },
        { character: 'lily', mark: 'booth_left_front' }, { character: 'robin', mark: 'booth_right_back' }, { character: 'barney', mark: 'booth_right_front' },
      ],
      beats: [
        say('barney', 'Tonight I have two places to be. A rooftop party with a ball pit, and my mother’s book club.', { e: 'smug', g: 'hands_up' }),
        say('lily', 'So pick one.', { to: 'barney', e: 'bored' }),
        say('barney', 'Lily, legends don’t pick. Legends delegate.', { to: 'lily', e: 'smug', l: 'laugh' }),
        say('ted', 'Barney. What did you do?', { to: 'barney', e: 'nervous' }),
        say('barney', 'I held auditions. Ladies, gentlemen, Marshall: meet my understudy.', { e: 'excited', g: 'suit_up' }),
        enter('guest1', 'booth_side'),
        say('guest1', 'Suit up!', { e: 'excited', g: 'suit_up', d: 'shout', l: 'big' }),
        say('robin', 'Barney, he has a mustache.', { to: 'barney', e: 'confused' }),
        say('guest1', 'Barney has always wanted a mustache. He’s just afraid of what it says about him.', { to: 'robin', d: 'slow', l: 'ooh' }),
        act('barney', 'think'),
        say('barney', 'He’s very good.', { e: 'nervous', l: 'laugh' }),
        say('marshall', 'So he goes to the book club, and you go to the ball pit?', { to: 'barney' }),
        say('barney', 'And to work. Gordon covers work too. Here’s how I see that going.', { to: 'marshall', e: 'smug' }),
        cutaway('imagined', 'How Barney imagined it', 'barneys_office', 'day', [{ character: 'guest1', mark: 'desk_chair' }, { character: 'arthur', mark: 'guest_chair_left' }], [
          say('arthur', 'Stinson! The ethics seminar started an hour ago!', { to: 'guest1', e: 'angry', g: 'point' }),
          say('guest1', 'Please.', { to: 'arthur', d: 'deadpan' }),
          say('arthur', 'You’re right. Ethics can wait.', { to: 'guest1', e: 'nervous', l: 'laugh' }),
        ]),
        say('ted', 'Nobody knows how your job works. How does he know how your job works?', { to: 'barney', e: 'confused', l: 'laugh' }),
        say('guest1', 'Barney knows, Ted. Barney just doesn’t tell you.', { to: 'ted', e: 'smug', l: 'ooh' }),
        say('lily', 'That was creepy. And exactly right.', { to: 'marshall', d: 'whisper', l: 'laugh' }),
        say('barney', 'Gordon, go. Book club starts at eight. Don’t touch the cheese plate.', { to: 'guest1', g: 'point' }),
        say('guest1', 'Barney would touch the cheese plate.', { to: 'barney', e: 'smug' }),
        exit('guest1'),
        say('barney', 'He’s right. I would.', { e: 'sad', l: 'big' }),
      ],
    },
    {
      location: 'barneys_office', time: 'day', transition: 'exterior',
      cast: [{ character: 'guest1', mark: 'desk_chair' }, { character: 'arthur', mark: 'desk_edge' }, { character: 'marshall', mark: 'guest_chair_left' }],
      beats: [
        narr('On Monday, Marshall stopped by to see if Barney still worked there.'),
        say('arthur', 'Stinson, this report is concise, accurate and on time. Who are you?', { to: 'guest1', e: 'surprised', l: 'laugh' }),
        say('guest1', 'Barney Stinson. Senior vice president of Please.', { to: 'arthur', e: 'smug', l: 'laugh' }),
        say('marshall', 'Gordon. Barney has never handed in a report. Not once.', { to: 'guest1', d: 'whisper', e: 'nervous' }),
        say('guest1', 'Barney has never been given the chance.', { to: 'marshall', d: 'whisper', e: 'sad', l: 'laugh' }),
        say('arthur', 'I’m putting you in charge of the Tugboat Foundation. It’s a charity. For my dog.', { to: 'guest1', e: 'happy' }),
        say('guest1', 'Sir, I would be honored to serve Tugboat.', { to: 'arthur', e: 'excited', g: 'hands_up' }),
        say('arthur', 'He’s going to love you.', { to: 'guest1', e: 'happy', l: 'aww' }),
        enter('barney', 'center'),
        say('barney', 'Gordon! Why are you at my desk? That chair is calibrated to my—', { to: 'guest1', e: 'angry', cut: true }),
        say('arthur', 'Who is this man?', { to: 'guest1', e: 'angry' }),
        say('guest1', 'Never seen him before in my life.', { to: 'arthur', d: 'deadpan', l: 'big' }),
        say('arthur', 'Security!', { e: 'angry', g: 'point', d: 'shout' }),
        act('barney', 'hands_up', undefined, 'surprised'),
        say('marshall', 'In his defense, new Barney is really nice to me.', { to: 'barney', e: 'nervous', l: 'laugh' }),
      ],
    },
    {
      location: 'maclarens', time: 'night', transition: 'cut',
      cast: [
        { character: 'guest1', mark: 'booth_end' }, { character: 'marshall', mark: 'booth_left_back' },
        { character: 'lily', mark: 'booth_left_front' }, { character: 'robin', mark: 'booth_right_back' }, { character: 'ted', mark: 'booth_side' },
      ],
      beats: [
        narr('By Friday, the understudy had Barney’s job, Barney’s apartment and, somehow, my seat.'),
        say('lily', 'Gordon, you remembered our class hamster’s birthday.', { to: 'guest1', e: 'happy' }),
        say('guest1', 'Barney cares, Lily. He just hides it under a suit.', { to: 'lily', l: 'aww' }),
        enter('barney', 'bar_standing'),
        say('barney', 'Okay! Gordon, you’re fired. Effective immediately.', { to: 'guest1', e: 'angry', g: 'point' }),
        say('guest1', 'You can’t fire Barney Stinson.', { to: 'barney', e: 'smug' }),
        say('barney', 'I am Barney Stinson!', { e: 'angry', d: 'shout', l: 'laugh' }),
        say('robin', 'Are you, though? He’s been to the gym four times this week.', { to: 'barney', d: 'deadpan', l: 'laugh' }),
        enter('quinn', 'center'),
        say('guest1', 'Quinn. You look stunning. Let me buy you a drink.', { to: 'quinn', e: 'flirty' }),
        say('quinn', 'Nice try. Barney has never once bought me a drink.', { to: 'guest1', e: 'smug', l: 'ooh' }),
        move('quinn', 'barney'),
        say('quinn', 'Hi, you. Your understudy tips better.', { to: 'barney', e: 'flirty' }),
        say('barney', 'Finally. Someone who can tell the real Barney from a fake one.', { to: 'quinn', e: 'happy' }),
        say('quinn', 'It’s the mustache. You’d never commit.', { to: 'barney', e: 'smug', l: 'laugh' }),
        say('guest1', 'The curtain falls on Barney, and the understudy takes a bow!', { e: 'happy', g: 'hands_up', d: 'sing', l: 'big' }),
        exit('guest1'),
        narr('Gordon went on to play Barney at four bar mitzvahs and one divorce hearing. Rave reviews.', 'laugh'),
        say('luke', 'Did Uncle Barney ever get his job back?', { e: 'bored' }),
        narr('He did. Gordon got the promotion.', 'big'),
      ],
    },
  ],
};

/** A school fundraiser: two guest stars, Judy, Scooter and Victoria, an imagined win and a real flashback. */
const SILENT_AUCTION: SampleEpisode = {
  meta: { code: 'S10E02', title: 'The Silent Auction', logline: 'Lily’s school auction pits Marshall against his own mother for a canoe, under an auctioneer who talks faster than anyone can bid.' },
  coldOpen: 'Kids, every spring your Aunt Lily’s school held a silent auction. In 2010 it was neither silent, nor technically an auction.',
  couch: [say('penny', 'So what was it?', { e: 'confused' }), narr('A hostage situation. With a canoe.', 'laugh')],
  guests: [
    {
      id: 'guest1', name: 'Delphine', role: 'the PTA president, who runs the school auction like a military operation and ranks every gift basket',
      gender: 'female', height: 'tall', build: 'slim', skin: 'fair', hair: 'blonde', hairStyle: 'updo',
      top: 'pink', topStyle: 'cardigan', under: 'white', pants: 'navy', extras: ['glasses', 'earrings'],
      voice: { pitch: 'high', pace: 'fast' },
    },
    {
      id: 'guest2', name: 'Rusty', role: 'a professional auctioneer who cannot slow down, even to order coffee',
      gender: 'male', height: 'short', build: 'broad', skin: 'tan', hair: 'gray', hairStyle: 'receding',
      top: 'mustard', topStyle: 'blazer', under: 'white', tie: 'red', pants: 'brown', extras: ['mustache'],
      voice: { pitch: 'medium', pace: 'fast' },
    },
  ],
  scenes: [
    {
      location: 'store', time: 'day', transition: 'exterior',
      cast: [{ character: 'lily', mark: 'shelves' }, { character: 'marshall', mark: 'produce' }, { character: 'scooter', mark: 'queue' }],
      beats: [
        narr('It started, like most of Lily’s wars, in the snack aisle.'),
        say('lily', 'Marshall, this basket has to win. Last year Delphine’s basket had a spa voucher.', { to: 'marshall', e: 'nervous' }),
        say('marshall', 'Lilypad, it’s a school auction. Nobody’s keeping score.', { to: 'lily', e: 'happy' }),
        enter('guest1', 'lily'),
        say('guest1', 'I’m keeping score! Your basket is currently ranked fourteenth. Out of fourteen.', { to: 'lily', e: 'happy', d: 'fast', l: 'laugh' }),
        say('lily', 'It has artisanal jam.', { to: 'guest1', e: 'angry' }),
        say('guest1', 'It has a jam. Singular.', { to: 'lily', e: 'smug', l: 'ooh' }),
        say('scooter', 'Lily! I’ll bid on your basket. Whatever it costs.', { to: 'lily', e: 'excited', g: 'wave' }),
        say('lily', 'Scooter, why are you—', { to: 'scooter', e: 'confused', cut: true }),
        say('scooter', 'I volunteer at every school event you go to. It’s a coincidence. Every time.', { to: 'lily', e: 'nervous', l: 'laugh' }),
        say('guest1', 'Oh, and this year’s grand prize is a canoe.', { to: 'marshall', e: 'smug' }),
        say('marshall', 'A canoe?', { to: 'guest1', e: 'excited', l: 'ooh' }),
        say('lily', 'Oh no. I know that face.', { to: 'marshall', e: 'nervous' }),
        cutaway('imagined', 'How Marshall imagined it', 'restaurant', 'night', [{ character: 'marshall', mark: 'booth_middle' }, { character: 'guest2', mark: 'host' }], [
          say('guest2', 'Sold! To the gentle giant from Saint Cloud, Minnesota!', { to: 'marshall', e: 'excited', g: 'point', d: 'shout' }),
          say('marshall', 'Paddle, paddle, my canoe and me, paddling home to Minnesota!', { e: 'happy', g: 'dance', d: 'sing', l: 'big' }),
        ]),
        say('marshall', 'Lily, that canoe is going to be mine.', { to: 'lily', e: 'excited', l: 'laugh' }),
        say('guest1', 'Bidding starts at eight. Don’t worry, fourteenth is still a place.', { to: 'lily', e: 'smug' }),
        exit('guest1'),
        say('lily', 'I am going to bury her in jam.', { e: 'angry', d: 'whisper', l: 'big' }),
      ],
    },
    {
      location: 'restaurant', time: 'night', transition: 'exterior',
      cast: [
        { character: 'guest2', mark: 'host' }, { character: 'guest1', mark: 'service' },
        { character: 'lily', mark: 'booth_left' }, { character: 'marshall', mark: 'booth_middle' }, { character: 'judy', mark: 'booth_right' },
        { character: 'victoria', mark: 'booth_end_left' }, { character: 'scooter', mark: 'booth_end_right' },
      ],
      beats: [
        narr('That night, the auction took over the back room of a bistro on Amsterdam.'),
        say('guest2', 'Welcome, folks! Lot one, a cake from Victoria’s bakery, do I hear twenty, twenty-five, sold!', { e: 'excited', g: 'point', d: 'fast', l: 'laugh' }),
        say('victoria', 'Did anybody bid? I didn’t see anybody bid.', { to: 'lily', e: 'confused' }),
        say('lily', 'Scooter scratched his nose.', { to: 'victoria', l: 'laugh' }),
        say('scooter', 'Worth it. It’s shaped like a heart.', { to: 'victoria', e: 'happy' }),
        say('victoria', 'It’s shaped like a canoe. That’s the theme.', { to: 'scooter', d: 'deadpan', l: 'laugh' }),
        say('guest2', 'Lot fourteen, the grand prize, one canoe, do I hear fifty?', { e: 'excited', d: 'fast' }),
        say('marshall', 'Fifty!', { e: 'excited', g: 'hands_up' }),
        say('judy', 'Seventy-five.', { e: 'smug', g: 'hands_up' }),
        say('marshall', 'Mom?', { to: 'judy', e: 'surprised', l: 'ooh' }),
        say('judy', 'Your father has wanted a canoe since 1974, Marshall. Sit down.', { to: 'marshall', e: 'smug', l: 'laugh' }),
        say('marshall', 'One hundred dollars!', { e: 'angry', d: 'shout' }),
        say('judy', 'Two hundred. And I’ll throw in a casserole.', { to: 'guest2' }),
        say('guest2', 'Ma’am, we do not accept casseroles—', { to: 'judy', e: 'confused', cut: true }),
        say('judy', 'It’s tuna.', { to: 'guest2', e: 'flirty', d: 'slow', l: 'laugh' }),
        say('guest2', 'Sold, to the lady in the apron!', { e: 'excited', g: 'point', d: 'shout', l: 'applause' }),
        say('marshall', 'No.', { e: 'sad', d: 'slow', l: 'laugh' }),
        move('guest1', 'lily'),
        say('guest1', 'Lily, your basket got zero bids. I’m so sorry. I’m not, but it’s polite to say.', { to: 'lily', e: 'smug', d: 'whisper', l: 'ooh' }),
        say('lily', 'Zero? Scooter. Scooter, bid on my basket.', { to: 'scooter', e: 'angry', g: 'point' }),
        say('scooter', 'Five hundred dollars!', { e: 'excited', d: 'shout', l: 'big' }),
        act('lily', 'facepalm'),
      ],
    },
    {
      location: 'apartment', time: 'night', transition: 'cut',
      cast: [{ character: 'marshall', mark: 'couch_left' }, { character: 'lily', mark: 'couch_center' }, { character: 'judy', mark: 'armchair' }],
      beats: [
        say('marshall', 'I can’t believe my own mother outbid me for a canoe.', { to: 'lily', e: 'sad' }),
        say('judy', 'Marshall, honey. I didn’t buy it for your father.', { to: 'marshall', e: 'happy' }),
        narr('Kids, a mother never forgets what her son asked for.'),
        cutaway('flashback', 'St. Cloud, 1985', 'store', 'day', [{ character: 'judy', mark: 'checkout' }, { character: 'marshall', mark: 'queue' }], [
          say('marshall', 'Mom, can I have the canoe in the window?', { to: 'judy', e: 'excited', g: 'point' }),
          say('judy', 'When you’re older.', { to: 'marshall' }),
          say('marshall', 'How much older?', { to: 'judy', e: 'nervous' }),
          say('judy', 'I’ll know.', { to: 'marshall', e: 'smug', d: 'deadpan', l: 'laugh' }),
        ]),
        say('judy', 'You’re older.', { to: 'marshall', e: 'happy', l: 'aww' }),
        act('marshall', 'hug', 'judy'),
        enter('ted', 'center'),
        say('ted', 'Why is there a canoe in the stairwell?', { e: 'confused', l: 'laugh' }),
        say('lily', 'Also, Scooter gave me my basket back. With a poem in it.', { to: 'ted', e: 'bored' }),
        say('ted', 'Is it any good?', { to: 'lily' }),
        say('lily', 'It rhymes Lily with really, really.', { to: 'ted', d: 'deadpan', l: 'big' }),
        narr('Marshall kept that canoe for twenty years. He never once put it in the water.', 'chuckle'),
        say('luke', 'Can we have the canoe?', { e: 'excited' }),
        narr('Ask Uncle Marshall. He’ll say when you’re older.', 'laugh'),
      ],
    },
  ],
};

/** Live television: a rewind, an imagined childhood, Sandy, Kevin and a camera operator who never talks. */
const CORRECTION: SampleEpisode = {
  meta: { code: 'S10E03', title: 'The Correction', logline: 'Ted corrects Robin’s pronunciation on live television, and her new producer turns it into the station’s hottest segment.' },
  coldOpen: 'Kids, everybody has a calling. Mine, it turned out, was correcting people on live television.',
  couch: [say('penny', 'Was it a calling, or were you just annoying?', { e: 'smug' }), narr('Those can be the same thing.', 'chuckle')],
  guests: [
    {
      id: 'guest1', name: 'Margo', role: 'Metro News One’s new producer, who turns every disagreement into a ratings segment',
      gender: 'female', height: 'short', build: 'average', skin: 'dark', hair: 'black', hairStyle: 'curly',
      top: 'red', topStyle: 'blazer', under: 'black', pants: 'black', extras: ['earrings'],
      voice: { pitch: 'low', pace: 'fast' },
    },
    {
      id: 'guest2', name: 'Hector', role: 'a camera operator who has not said a word on set in twelve years',
      gender: 'male', height: 'tall', build: 'broad', skin: 'olive', hair: 'black', hairStyle: 'buzz',
      top: 'mustard', topStyle: 'hoodie', under: 'gray', pants: 'denim', extras: ['beard', 'cap'],
      voice: { pitch: 'low', pace: 'slow' },
    },
  ],
  scenes: [
    {
      location: 'metro_news_one', time: 'day', transition: 'exterior',
      cast: [
        { character: 'robin', mark: 'anchor_left' }, { character: 'sandy', mark: 'anchor_right' },
        { character: 'guest1', mark: 'monitor' }, { character: 'guest2', mark: 'camera_operator' },
      ],
      beats: [
        say('robin', 'Breaking news. A Wor-chester-shire sauce shortage has hit Manhattan delis.'),
        say('sandy', 'Devastating, Robin. My thoughts are with the sandwiches.', { to: 'robin', e: 'sad', d: 'slow', l: 'laugh' }),
        enter('ted', 'center'),
        say('ted', 'Actually, it’s pronounced Wooster-sher.', { to: 'robin', e: 'smug', g: 'point', l: 'ooh' }),
        say('robin', 'Ted! We are live!', { to: 'ted', e: 'angry', d: 'shout', l: 'laugh' }),
        say('guest1', 'Keep rolling. Hector, get his face. He looks like a man who corrects menus.', { to: 'guest2', e: 'excited', d: 'whisper', l: 'laugh' }),
        act('guest2', 'thumbs_up'),
        say('ted', 'And while I’m here, Sandy, it’s espresso. Not ex-presso.', { to: 'sandy', e: 'excited', g: 'hands_up' }),
        say('sandy', 'How dare you. I have said ex-presso on this network for fifteen years.', { to: 'ted', e: 'angry', l: 'laugh' }),
        say('guest1', 'Ratings just tripled. Ted, how do you feel about a weekly segment?', { to: 'ted', e: 'excited', d: 'fast' }),
        say('robin', 'No. Absolutely not—', { to: 'guest1', e: 'angry', cut: true }),
        say('ted', 'I’d be honored.', { to: 'guest1', e: 'happy', l: 'big' }),
        act('robin', 'facepalm'),
        narr('Now, kids, to understand how I ended up on live television, we have to back up.'),
      ],
    },
    {
      location: 'limo', time: 'day', transition: 'rewind',
      cast: [{ character: 'robin', mark: 'rear_seat_left' }, { character: 'kevin', mark: 'rear_seat_right' }, { character: 'ted', mark: 'bench_2' }],
      beats: [
        narr('That morning, Barney lent Robin, Kevin and me his limo. Don’t ask.', 'chuckle'),
        say('robin', 'Ted, whatever happens today, do not come to the studio.', { to: 'ted', e: 'angry', g: 'point' }),
        say('ted', 'Why would I come to the studio?', { to: 'robin', e: 'confused' }),
        say('robin', 'Because I’m reading a story about a sauce nobody can pronounce, and I know you.', { to: 'ted', l: 'laugh' }),
        say('kevin', 'Interesting. Ted, you need to be right the way other people need oxygen.', { to: 'ted', e: 'smug' }),
        say('ted', 'Technically, people need air. Oxygen is just one component of—', { to: 'kevin', e: 'smug', cut: true }),
        say('kevin', 'I rest my case.', { to: 'robin', d: 'deadpan', l: 'big' }),
        say('robin', 'Okay, doctor. Where does it come from?', { to: 'kevin' }),
        say('kevin', 'I have a theory. I picture a very small Ted, in a very large classroom.', { to: 'robin', g: 'think' }),
        cutaway('imagined', 'How Kevin pictured it', 'lecture_hall', 'day', [{ character: 'kevin', mark: 'lectern' }, { character: 'ted', mark: 'student_1_3' }], [
          say('kevin', 'Good morning, class. Today we are going to the li-berry.', { e: 'happy', g: 'hands_up' }),
          say('ted', 'Actually, it’s library. With an R. Two, technically.', { to: 'kevin', e: 'smug', g: 'point', d: 'fast' }),
          say('kevin', 'And how does that make you feel?', { to: 'ted' }),
          say('ted', 'Correct.', { to: 'kevin', e: 'happy', l: 'big' }),
        ]),
        say('ted', 'That’s absurd. I was a delight in third grade.', { to: 'kevin', e: 'angry' }),
        say('robin', 'Just promise me. Not one word.', { to: 'ted' }),
        say('ted', 'I’ll watch from home. Quietly. With a notepad.', { to: 'robin', e: 'smug', l: 'laugh' }),
      ],
    },
    {
      location: 'metro_news_one', time: 'night', transition: 'skyline',
      cast: [
        { character: 'sandy', mark: 'anchor_left' }, { character: 'ted', mark: 'anchor_right' }, { character: 'robin', mark: 'desk_side' },
        { character: 'guest1', mark: 'monitor' }, { character: 'guest2', mark: 'camera_operator' },
      ],
      beats: [
        narr('One week later, my segment was the most-watched thing on Metro News One.'),
        say('ted', 'Welcome back to Actually, with Ted Mosby. Tonight: it’s supposedly, not supposably.', { e: 'smug', g: 'point' }),
        say('sandy', 'Actually, Ted, it’s Actually, with Sandy Rivers now. I took a meeting.', { to: 'ted', e: 'smug', l: 'ooh' }),
        say('ted', 'That’s not how a segment—', { to: 'sandy', e: 'angry', cut: true }),
        say('sandy', 'Actually, it is.', { to: 'ted', e: 'smug', l: 'laugh' }),
        say('ted', 'Actually, it isn’t, and actually, you said Wooster-shire-shire in the promo.', { to: 'sandy', e: 'angry', d: 'fast', l: 'laugh' }),
        say('guest1', 'This is incredible television. Nobody touch anything.', { to: 'robin', e: 'excited', d: 'whisper', l: 'laugh' }),
        say('robin', 'Margo, they’re just saying actually at each other.', { to: 'guest1', d: 'deadpan' }),
        say('guest1', 'And the people love it.', { to: 'robin', e: 'happy', l: 'laugh' }),
        move('guest2', 'center'),
        say('guest2', 'Actually. Metro News One has never once been number one.', { d: 'slow', l: 'gasp' }),
        say('guest1', 'Get that man a segment!', { to: 'guest2', e: 'excited', d: 'shout', l: 'applause' }),
        narr('Hector’s segment ran for eleven years. Nobody ever corrected him.', 'laugh'),
        say('luke', 'So you got cancelled by the camera guy.', { e: 'bored' }),
        narr('It was a mutual decision.', 'big'),
      ],
    },
  ],
};

/** Ted meets his hero: a college flashback, Brad's other interests, and a ride to the airport with Ranjit. */
const GUEST_LECTURE: SampleEpisode = {
  meta: { code: 'S10E04', title: 'The Guest Lecture', logline: 'Ted’s architecture idol agrees to guest-lecture his class, and remembers him as the boy who sent her forty fan letters.' },
  coldOpen: 'Kids, in 1997 I wrote a fan letter to the greatest architect alive. In 2010 she finally answered it. In front of my class.',
  couch: [say('luke', 'Was it a restraining order?', { e: 'bored' }), narr('It was not a restraining order.', 'chuckle')],
  guests: [
    {
      id: 'guest1', name: 'Ingrid Solberg', role: 'a legendary Norwegian architect who speaks slowly, profoundly, and mostly against buildings',
      gender: 'female', height: 'tall', build: 'slim', skin: 'fair', hair: 'white', hairStyle: 'bob',
      top: 'black', topStyle: 'sweater', pants: 'black', extras: ['glasses'],
      voice: { pitch: 'low', pace: 'slow' },
    },
    {
      id: 'guest2', name: 'Wade', role: 'Ted’s most eager student, who asks three questions per breath and records everything',
      gender: 'male', height: 'short', build: 'slim', skin: 'light', hair: 'red', hairStyle: 'messy',
      top: 'green', topStyle: 'cardigan', under: 'white', pants: 'tan', extras: ['glasses'],
      voice: { pitch: 'high', pace: 'fast' },
    },
  ],
  scenes: [
    {
      location: 'rooftop', time: 'night', transition: 'skyline',
      cast: [
        { character: 'ted', mark: 'ledge_seat_left' }, { character: 'marshall', mark: 'lawn_chair_left' }, { character: 'lily', mark: 'lawn_chair_middle' },
        { character: 'robin', mark: 'lawn_chair_right' }, { character: 'barney', mark: 'cooler' },
      ],
      beats: [
        say('ted', 'Ingrid Solberg is guest-lecturing my class tomorrow. The Ingrid Solberg.', { e: 'excited', g: 'hands_up' }),
        say('robin', 'Never heard of her.', { to: 'ted', d: 'deadpan', l: 'laugh' }),
        say('ted', 'She designed the Oslo Opera Annex. It’s shaped like a sigh.', { to: 'robin', e: 'happy' }),
        say('barney', 'Is she hot?', { to: 'ted', e: 'smug' }),
        say('ted', 'She’s seventy-four, and she once made a bridge cry.', { to: 'barney', l: 'laugh' }),
        say('barney', 'So that’s a maybe.', { to: 'ted', e: 'flirty', l: 'big' }),
        say('lily', 'Ted, you’re not going to bring up the letters, right?', { to: 'ted', e: 'nervous' }),
        say('marshall', 'Oh no. The letters.', { to: 'lily', e: 'nervous', l: 'ooh' }),
        narr('Kids, back in college, I may have written Ingrid Solberg a fan letter.'),
        cutaway('flashback', 'College, 1996', 'wesleyan_dorm', 'night', [{ character: 'ted', mark: 'desk' }, { character: 'marshall', mark: 'bed_right' }], [
          say('ted', 'Dear Ms. Solberg. Your buildings make me feel the way a cathedral feels.', { e: 'happy', d: 'slow' }),
          say('marshall', 'Ted, buildings don’t have feelings.', { to: 'ted', e: 'confused' }),
          say('ted', 'Hers do. That’s draft forty. I’m sending all forty.', { to: 'marshall', e: 'excited', l: 'laugh' }),
          say('marshall', 'Buddy, that’s not a fan letter. That’s a book with stamps.', { to: 'ted', l: 'big' }),
        ]),
        say('marshall', 'Forty letters. She never wrote back.', { to: 'lily', e: 'sad' }),
        say('ted', 'She was busy. Making bridges cry.', { e: 'sad', l: 'laugh' }),
        say('barney', 'I’m coming to class tomorrow. Watching you meet your hero is going to be legen—', { to: 'ted', e: 'excited', g: 'suit_up', cut: true }),
        say('lily', 'Dary. We know. We’re all coming.', { to: 'barney', e: 'smug', l: 'laugh' }),
      ],
    },
    {
      location: 'lecture_hall', time: 'day', transition: 'exterior',
      cast: [
        { character: 'guest1', mark: 'lectern' }, { character: 'ted', mark: 'demonstration' }, { character: 'guest2', mark: 'student_1_3' },
        { character: 'barney', mark: 'student_2_2' }, { character: 'marshall', mark: 'student_2_4' }, { character: 'brad', mark: 'student_2_5' },
      ],
      beats: [
        narr('The next morning, my class had never been so full.'),
        say('ted', 'Class, it is my great honor to introduce Ingrid Solberg.', { e: 'excited', g: 'hands_up', l: 'applause' }),
        say('guest1', 'Thank you. Buildings are a mistake.', { e: 'bored', d: 'slow', l: 'laugh' }),
        say('ted', 'She’s being provocative.', { e: 'nervous', d: 'whisper' }),
        say('guest2', 'Is that a metaphor, will it be on the final, and can I record this?', { to: 'guest1', e: 'excited', g: 'hands_up', d: 'fast', l: 'laugh' }),
        say('guest1', 'Nothing is on the final. Life is the final.', { to: 'guest2', d: 'slow', l: 'laugh' }),
        say('brad', 'Bro, she’s incredible. I have her coffee-table book. It’s shaped like a coffee table.', { to: 'marshall', e: 'excited', l: 'laugh' }),
        say('marshall', 'Brad, why are you even here?', { to: 'brad', e: 'confused' }),
        say('brad', 'I minored in architecture, Marshall. I don’t just do brunch.', { to: 'marshall', e: 'smug', l: 'ooh' }),
        say('barney', 'Ms. Solberg. Barney Stinson. I’ve designed several things. Mostly evenings.', { to: 'guest1', e: 'flirty', g: 'suit_up', l: 'laugh' }),
        say('guest1', 'You are not the one I came for.', { to: 'barney', d: 'deadpan', l: 'ooh' }),
        move('guest1', 'ted'),
        say('guest1', 'You. You are the letter boy.', { to: 'ted', e: 'surprised' }),
        say('ted', 'You read them? All forty?', { to: 'guest1', e: 'nervous' }),
        say('guest1', 'Every one. My plane is at six. Walk with me.', { to: 'ted' }),
        say('barney', 'Better. I’ll drive. I have a limo.', { to: 'guest1', e: 'excited', g: 'suit_up', l: 'woo' }),
      ],
    },
    {
      location: 'limo', time: 'night', transition: 'exterior',
      cast: [
        { character: 'guest1', mark: 'rear_seat_left' }, { character: 'ted', mark: 'rear_seat_right' },
        { character: 'barney', mark: 'bench_2' }, { character: 'brad', mark: 'bench_3' }, { character: 'ranjit', mark: 'driver' },
      ],
      beats: [
        narr('Barney offered his limo. Brad offered nothing, and got in anyway.', 'chuckle'),
        say('ranjit', 'Hello! Where to?', { e: 'happy' }),
        say('guest1', 'The airport. Slowly. I like to think.', { to: 'ranjit', d: 'slow' }),
        say('ted', 'Ms. Solberg, why did you say buildings are a mistake?', { to: 'guest1', e: 'sad' }),
        say('guest1', 'Because I retired. Twelve years ago.', { to: 'ted' }),
        say('ted', 'But why?', { to: 'guest1', e: 'confused' }),
        say('guest1', 'Forty letters from a boy who loved buildings more than I did. I thought, good. He can do it now.', { to: 'ted', e: 'happy', l: 'aww' }),
        say('barney', 'Okay, that’s actually beautiful. I hate it.', { to: 'brad', e: 'sad', l: 'laugh' }),
        say('brad', 'Bro, I’m crying. This limo has great acoustics for crying.', { to: 'barney', e: 'sad', l: 'laugh' }),
        say('ted', 'So what do you do now?', { to: 'guest1' }),
        say('guest1', 'I make soup.', { to: 'ted', d: 'deadpan' }),
        say('ted', 'What kind?', { to: 'guest1', e: 'confused' }),
        say('guest1', 'Load-bearing.', { to: 'ted', e: 'smug', l: 'big' }),
        narr('Kids, I wrote her one more letter that night. She wrote back. It was a soup recipe.', 'laugh'),
      ],
    },
  ],
};

/** A city detour, with two distinctly period flashbacks. */
const HIGH_SCORE: SampleEpisode = {
  meta: { code: 'S10E05', title: 'The High Score', logline: 'Barney disputes a laser-tag score. A subway ride, a hospital vending machine and two embarrassing memories reveal a lifelong problem with coming second.' },
  coldOpen: 'Kids, there are two kinds of people. People who can lose gracefully, and your Uncle Barney, who once requested an instant replay of rock-paper-scissors.',
  guests: [{
    id: 'guest1', name: 'Denise', role: 'laser-tag referee, unimpressed by adults who contest the scoreboard',
    gender: 'female', height: 'average', build: 'average', skin: 'brown', hair: 'black', hairStyle: 'ponytail',
    top: 'teal', topStyle: 'polo', pants: 'black', extras: [], voice: { pitch: 'medium', pace: 'slow' },
  }],
  scenes: [
    {
      location: 'subway', time: 'day', transition: 'cut',
      cast: [{ character: 'ted', mark: 'seat_left' }, { character: 'marshall', mark: 'seat_left_inner' }, { character: 'barney', mark: 'pole' }, { character: 'robin', mark: 'center' }],
      beats: [
        say('barney', 'Today, we become legends. I booked the entire laser-tag arena.', { e: 'excited', g: 'point' }),
        say('robin', 'The invitation said team-building. I brought a resignation letter.', { to: 'barney', d: 'deadpan', l: 'laugh' }),
        say('marshall', 'Ted has never handled competition well. Remember college?', { to: 'ted', e: 'smug' }),
        cutaway('flashback', 'College, 1996', 'wesleyan_dorm', 'night', [
          { character: 'ted', mark: 'desk' }, { character: 'marshall', mark: 'bed_right' }, { character: 'lily', mark: 'center' },
        ], [
          say('ted', 'The computer ranked my essay second. It is a spell checker. It has no authority here.', { e: 'angry' }),
          say('marshall', 'You spelled architecture three different ways.', { to: 'ted' }),
          say('lily', 'He is exploring alternate structures.', { to: 'marshall', d: 'deadpan', l: 'big' }),
        ]),
        say('ted', 'That computer was biased against the humanities.', { e: 'smug', l: 'laugh' }),
      ],
    },
    {
      location: 'laser_tag', time: 'day', transition: 'cut',
      cast: [{ character: 'barney', mark: 'blue_cover' }, { character: 'robin', mark: 'red_cover' }, { character: 'guest1', mark: 'center' }],
      beats: [
        say('guest1', 'Blue team lost. Please return your equipment and your sense of entitlement.', { d: 'deadpan', l: 'laugh' }),
        say('barney', 'I demand a recount. And a smaller opponent. That child was at least eleven.', { to: 'guest1', e: 'angry' }),
        say('robin', 'I used to perform for crowds tougher than this.', { e: 'smug' }),
        cutaway('flashback', 'Canada, 1990', 'canadian_mall', 'day', [
          { character: 'robin', mark: 'stage' },
        ], [
          narr('Before New York, there was a mall. And a very ambitious sound check.'),
          say('robin', 'Neon dreams and shopping bags, everybody dance past the price tags!', { e: 'excited', d: 'sing', g: 'dance' }),
          say('robin', 'Thank you, Canada! Could someone tell the pretzel guy the microphone is on?', { e: 'nervous', l: 'big' }),
        ]),
        say('barney', 'You had a stage? I want a stage for my appeal.', { to: 'robin', e: 'excited', l: 'laugh' }),
        say('guest1', 'You can have a chair. Outside.', { to: 'barney', d: 'deadpan', l: 'big' }),
      ],
    },
    {
      location: 'hospital', time: 'night', transition: 'cut',
      cast: [{ character: 'barney', mark: 'seat_left' }, { character: 'robin', mark: 'seat_right' }, { character: 'ted', mark: 'center' }, { character: 'marshall', mark: 'coffee' }],
      beats: [
        narr('Nobody was injured. We were waiting for Lily, who was visiting a friend. Barney had diagnosed himself with scoreboard trauma.'),
        say('barney', 'Do they validate parking? And possibly my performance?', { to: 'robin', e: 'sad' }),
        say('robin', 'The machine says your coffee is ready. You finally won something.', { to: 'marshall' }),
        say('marshall', 'It gave me hot water. The coffee is a participation trophy.', { e: 'sad', l: 'laugh' }),
        say('ted', 'Sometimes second place is just the universe saying there is room to grow.', { e: 'happy' }),
        say('barney', 'Ted. You appealed a spell checker.', { to: 'ted', d: 'deadpan', l: 'big' }),
      ],
    },
    {
      location: 'elevator', time: 'night', transition: 'cut',
      cast: [{ character: 'ted', mark: 'left' }, { character: 'marshall', mark: 'right' }, { character: 'lily', mark: 'center' }, { character: 'barney', mark: 'buttons' }],
      beats: [
        narr('On the way home, Barney insisted on stopping at his office. He needed to print a certificate.'),
        say('lily', 'Why did you press every floor?', { to: 'barney', e: 'confused' }),
        say('barney', 'Highest score in the building.', { to: 'lily', e: 'smug', g: 'thumbs_up', l: 'big' }),
        say('marshall', 'Great. Now the elevator is beating us too.', { d: 'deadpan', l: 'laugh' }),
      ],
    },
  ],
};

/** The offline reruns, in airing order. */
export const RERUNS: SampleEpisode[] = [UNDERSTUDY, SILENT_AUCTION, CORRECTION, GUEST_LECTURE, HIGH_SCORE];

let counter = 0;

/** How many reruns there are before they repeat. */
export const sampleCount = () => RERUNS.length;

/** Items for one sample episode, cycling through the reruns. */
export function sampleEpisode(): ShowItem[] {
  const ep = RERUNS[counter++ % RERUNS.length];
  const meta: EpisodeMeta = { ...ep.meta, id: `sample-${counter}`, source: 'sample' };
  return [
    { kind: 'episode-start', episode: meta, coldOpen: ep.coldOpen, couch: ep.couch, guests: ep.guests },
    ...ep.scenes.map((scene, index) => ({ kind: 'scene' as const, episode: meta, index, scene })),
    { kind: 'episode-end', episode: meta },
  ];
}

/** A compact example scene for the LLM prompt. */
export const EXAMPLE_SCENE = RERUNS[0].scenes[0];
