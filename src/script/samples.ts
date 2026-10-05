import type { Beat, CharacterId, Emotion, Gesture, LaughKind, Scene, ShowItem, EpisodeMeta } from './types';

// Hand-written "reruns" that play when no LLM is connected (and as filler).

type SayOpts = { e?: Emotion; to?: CharacterId; g?: Gesture; l?: LaughKind };
const say = (character: CharacterId, line: string, o: SayOpts = {}): Beat => ({ type: 'say', character, line, emotion: o.e, to: o.to, gesture: o.g, laugh: o.l });
const narr = (line: string, laugh?: LaughKind): Beat => ({ type: 'narrate', line, laugh });
const move = (character: CharacterId, to: string): Beat => ({ type: 'move', character, to });
const enter = (character: CharacterId, to?: string): Beat => ({ type: 'enter', character, to });
const exit = (character: CharacterId): Beat => ({ type: 'exit', character });
const act = (character: CharacterId, gesture: Gesture, to?: CharacterId, emotion?: Emotion): Beat => ({ type: 'act', character, gesture, to, emotion });
const laugh = (l: LaughKind): Beat => ({ type: 'laugh', laugh: l });

interface SampleEpisode {
  meta: Omit<EpisodeMeta, 'id' | 'source'>;
  coldOpen: string;
  couch?: Beat[]; // the kids' reaction to the cold open
  scenes: Scene[];
}

const EPISODES: SampleEpisode[] = [
  {
    meta: { code: 'S10E01', title: 'The Reservation', logline: "Ted lands a table at the city's most impossible restaurant, and the gang tears itself apart over who gets to be his plus-one." },
    coldOpen: "Kids, in the fall of 2008, I learned that the hardest thing to get in New York isn't a cab, or an apartment. It's a table at Le Petit Rien.",
    couch: [say('luke', 'Is this the one where you finally meet Mom?', { e: 'bored' }), narr("We're getting there.", 'chuckle')],
    scenes: [
      {
        location: 'maclarens', time: 'night', transition: 'skyline',
        cast: [
          { character: 'ted', mark: 'booth_end' }, { character: 'marshall', mark: 'booth_left_back' },
          { character: 'lily', mark: 'booth_left_front' }, { character: 'robin', mark: 'booth_right_back' }, { character: 'barney', mark: 'booth_right_front' },
        ],
        beats: [
          say('ted', 'Guys. Eleven months ago, I called Le Petit Rien. Tonight at eight, I have a table for two.', { e: 'excited', g: 'hands_up' }),
          say('marshall', 'Le Petit Rien? The place with no menu, no prices, and no sign?', { e: 'surprised', to: 'ted' }),
          say('ted', 'And no reservations. Except mine.', { e: 'smug', l: 'chuckle' }),
          say('lily', 'Wait. A table for two. Where is Stella?', { to: 'ted', e: 'confused' }),
          say('ted', "She cancelled. She said booking dinner eleven months out is, quote, 'a lot, even for you.'", { e: 'sad', l: 'laugh' }),
          say('barney', "Ted. I'm going to say three words that will change your evening. Plus. One. Me.", { e: 'smug', to: 'ted', g: 'suit_up', l: 'laugh' }),
          say('marshall', "That's four words. Plus is a word, one is a word—", { e: 'confused', to: 'barney' }),
          say('barney', "Not now, Marshall. I'm closing.", { to: 'marshall', l: 'chuckle' }),
          say('lily', 'Ted, I have been eating crackers out of my purse since Tuesday. I deserve this.', { e: 'nervous', to: 'ted', l: 'laugh' }),
          say('robin', "I don't even care about fancy food. But do they still have the duck that's aged inside a smaller duck?", { e: 'excited', l: 'big' }),
          say('penny', 'Dad. That is not a real duck.', { e: 'confused' }),
          narr('It was a real duck, sweetheart. It was inside a smaller duck.', 'laugh'),
          enter('wendy', 'booth_side'),
          say('wendy', 'Can I get you guys anything?', { e: 'happy' }),
          say('barney', "Wendy. Do you have anything that says 'I deserve fine dining'?", { to: 'wendy' }),
          say('wendy', 'We have mozzarella sticks.', { to: 'barney' }),
          act('barney', 'think'),
          say('barney', 'Bring me nine.', { e: 'sad', to: 'wendy', l: 'big' }),
          exit('wendy'),
          say('ted', "Okay! Everybody calm down. Tomorrow morning, my apartment. Bring your best pitch. I'll decide fairly.", { g: 'point' }),
          narr('And that is how your Uncle Barney ended up rehearsing a speech. At the bar. To himself. For four hours.', 'laugh'),
        ],
      },
      {
        location: 'apartment', time: 'day', transition: 'exterior',
        cast: [
          { character: 'ted', mark: 'armchair' }, { character: 'marshall', mark: 'couch_left' },
          { character: 'lily', mark: 'couch_center' }, { character: 'robin', mark: 'dining_chair_1' },
        ],
        beats: [
          narr('By the next morning, my friends had turned one dinner invitation into a presidential election.'),
          say('ted', 'Welcome to the pitch. Each of you gets sixty seconds. Marshall, you are up.', { e: 'smug' }),
          move('marshall', 'center'),
          say('marshall', "Ted. We've been best friends since freshman year. I've seen you at your best. I've seen you at your worst.", { to: 'ted', e: 'sad' }),
          say('marshall', 'So I made a forty-slide PowerPoint.', { e: 'excited', g: 'hands_up', l: 'big' }),
          say('ted', 'Is slide six a pie chart of our friendship?', { e: 'confused', to: 'marshall' }),
          say('marshall', "The blue slice is road trips. The red slice is 'Ted, you have to let this go.'", { to: 'ted', g: 'point', l: 'laugh' }),
          move('marshall', 'couch_left'),
          move('lily', 'center'),
          say('lily', 'Ted, remember when I told you your red cowboy boots were adorable?', { to: 'ted', e: 'flirty' }),
          say('ted', 'You said that?', { e: 'happy', to: 'lily' }),
          say('lily', "I lied. That's how much I want this duck.", { e: 'smug', to: 'ted', l: 'big' }),
          enter('barney', 'center'),
          say('barney', "Ted! I've taken the liberty of preparing a sizzle reel.", { e: 'excited', to: 'ted', g: 'suit_up', l: 'woo' }),
          say('ted', "What's in the sizzle reel, Barney?", { to: 'barney' }),
          act('barney', 'dance'),
          say('barney', "It's me, in a suit, eating. For four minutes. In slow motion.", { e: 'smug', to: 'ted', l: 'laugh' }),
          say('robin', "Well, I'm Canadian, so I'll just quietly mention that I know the head chef.", { e: 'smug' }),
          say('ted', 'You know the chef?', { e: 'surprised', to: 'robin', l: 'ooh' }),
          say('robin', "We dated. Briefly. He described me as 'a palate cleanser.'", { e: 'sad', to: 'ted', l: 'laugh' }),
          act('ted', 'facepalm'),
          say('ted', "This is impossible. You're all my best friends. I'll decide tonight at the bar.", { e: 'nervous' }),
        ],
      },
      {
        location: 'maclarens', time: 'night', transition: 'exterior',
        cast: [
          { character: 'ted', mark: 'bar_stool_2' }, { character: 'marshall', mark: 'booth_left_back' },
          { character: 'lily', mark: 'booth_left_front' }, { character: 'robin', mark: 'booth_right_back' }, { character: 'barney', mark: 'booth_right_front' },
          { character: 'wendy', mark: 'bar_standing' },
        ],
        beats: [
          say('ted', 'Wendy, can I ask you something? If you had a table at Le Petit Rien, who would you take?', { to: 'wendy', e: 'nervous' }),
          say('wendy', "Oh, I'd take my sister. She's the chef there.", { to: 'ted', e: 'happy' }),
          say('ted', 'Your sister is the chef at Le Petit Rien?', { e: 'surprised', to: 'wendy', l: 'ooh' }),
          say('wendy', 'Yeah. She can get anybody in. Any night. You guys never asked.', { to: 'ted', g: 'shrug', l: 'big' }),
          move('barney', 'wendy'),
          say('barney', 'Wendy. Wendy, Wendy, Wendy. Have I ever told you how much I respect you as a person?', { to: 'wendy', e: 'flirty' }),
          say('wendy', "You call me 'Waitress Wendy.' To my face. Every night.", { to: 'barney', e: 'angry', l: 'laugh' }),
          say('marshall', 'So all of us could go? Together?', { e: 'excited', to: 'wendy' }),
          say('wendy', 'Sure. Thursday works.', { to: 'marshall', g: 'thumbs_up' }),
          say('ted', 'So I spent a week tearing our friendship apart for nothing?', { e: 'sad' }),
          say('robin', 'Not for nothing, Ted. Marshall made a PowerPoint.', { to: 'ted', e: 'smug' }),
          say('marshall', "Slide forty-one is literally this moment. I'm very prepared.", { e: 'happy', l: 'laugh' }),
          act('barney', 'high_five', 'ted'),
          act('lily', 'cheers', 'marshall'),
          narr("And that, kids, is why you should always be nice to your waitress. She might know a guy. Or, as it turned out, a sister.", 'chuckle'),
        ],
      },
    ],
  },
  {
    meta: { code: 'S10E02', title: 'The Thermostat War', logline: 'Marshall and Lily go to war over three degrees, and Barney appoints himself peace negotiator.' },
    coldOpen: "Kids, every marriage has one great war. For Marshall and Lily, it wasn't money. It wasn't in-laws. It was three degrees.",
    couch: [say('penny', 'This whole story is about a thermostat?', { e: 'bored' }), say('luke', 'Can we skip to the part where somebody gets slapped?', { e: 'bored', l: 'chuckle' })],
    scenes: [
      {
        location: 'apartment', time: 'night', transition: 'skyline',
        cast: [{ character: 'lily', mark: 'couch_left' }, { character: 'marshall', mark: 'kitchen' }, { character: 'ted', mark: 'armchair' }],
        beats: [
          say('lily', 'Marshmallow, it is sixty-four degrees in here. I can see my breath. My breath is spelling the word divorce.', { e: 'angry', to: 'marshall', l: 'laugh' }),
          say('marshall', "Lilypad, I'm from Minnesota. Sixty-four is a beach day. I'm basically wearing a tank top in my soul.", { e: 'happy', to: 'lily', l: 'laugh' }),
          say('ted', 'Guys, as an architect, I can tell you the ideal indoor temperature is—', { e: 'smug', g: 'think' }),
          act('lily', 'point', 'ted', 'angry'),
          say('ted', '—a decision for the two of you.', { e: 'nervous', l: 'chuckle' }),
          move('lily', 'center'),
          act('lily', 'arms_crossed'),
          say('lily', 'Seventy-two.', { to: 'marshall', e: 'angry' }),
          move('marshall', 'lily'),
          say('marshall', 'Sixty-six.', { to: 'lily', e: 'smug' }),
          say('lily', 'Seventy.', { to: 'marshall', e: 'angry' }),
          say('marshall', "Sixty-seven, and I'll do the dishes.", { to: 'lily' }),
          say('lily', 'Deal! Wait. You already do the dishes.', { e: 'confused', to: 'marshall', l: 'laugh' }),
          enter('barney', 'couch_right'),
          say('barney', 'Did someone say negotiation? I can resolve any dispute in under ten minutes.', { e: 'smug', g: 'suit_up' }),
          say('marshall', 'Barney, you once negotiated yourself out of your own birthday party.', { to: 'barney', l: 'laugh' }),
          say('barney', 'Best party I never went to. Climate summit. My place. Tomorrow. Challenge accepted.', { e: 'excited', g: 'point', l: 'woo' }),
        ],
      },
      {
        location: 'barneys', time: 'day', transition: 'exterior',
        cast: [
          { character: 'barney', mark: 'center' }, { character: 'marshall', mark: 'couch_left' },
          { character: 'lily', mark: 'couch_right' }, { character: 'robin', mark: 'bar_cart' },
        ],
        beats: [
          narr('The next morning, Barney hosted the least important climate summit in human history.'),
          say('barney', 'Welcome to the Stinson Climate Summit. My apartment is kept at exactly seventy-one degrees. The official temperature of awesome.', { e: 'smug', g: 'hands_up' }),
          say('robin', 'Barney, it feels like a meat locker in here.', { to: 'barney', e: 'confused' }),
          say('barney', "That's because awesome is crisp.", { to: 'robin', e: 'smug', l: 'laugh' }),
          say('lily', 'Seventy-one? I could live with seventy-one.', { e: 'happy' }),
          say('marshall', "Seventy-one? That's practically Arizona.", { e: 'angry', to: 'lily', l: 'laugh' }),
          say('barney', 'Marshall, as a neutral party, I propose the thermostat only goes down when you win a slap bet.', { to: 'marshall', e: 'smug' }),
          say('marshall', 'Wait. Speaking of slap bets. I still have slaps left.', { e: 'excited', l: 'ooh' }),
          move('marshall', 'barney'),
          act('marshall', 'slap', 'barney'),
          laugh('big'),
          act('luke', 'hands_up', undefined, 'excited'),
          say('barney', 'That is a violation of the Geneva Climate Convention!', { e: 'angry', l: 'laugh' }),
          say('robin', "In Canada we don't fight about the heat. We just put on a sweater and apologize to the sweater.", { e: 'happy', l: 'laugh' }),
          say('lily', 'Marshall, if I wear your lucky Fiero sweatshirt, can we do sixty-eight?', { to: 'marshall', e: 'flirty' }),
          say('marshall', '... The lucky sweatshirt? Baby, you drive a hard bargain.', { to: 'lily', e: 'happy', l: 'aww' }),
          act('marshall', 'hug', 'lily'),
          say('barney', "And peace returns to the land. You're welcome. My fee is one high five.", { e: 'smug', g: 'suit_up' }),
          act('barney', 'high_five', 'robin'),
        ],
      },
      {
        location: 'maclarens', time: 'night', transition: 'cut',
        cast: [{ character: 'ted', mark: 'booth_end' }, { character: 'robin', mark: 'booth_right_back' }, { character: 'barney', mark: 'booth_right_front' }],
        beats: [
          enter('marshall', 'booth_left_back'),
          enter('lily', 'booth_left_front'),
          say('ted', "So. How's the peace treaty holding up?", { to: 'lily' }),
          say('lily', 'Great! Until he set it to sixty-eight point five.', { e: 'angry', to: 'ted' }),
          say('marshall', 'The point five is for my soul.', { e: 'smug', l: 'big' }),
          act('lily', 'facepalm'),
          narr('Kids, the thermostat war lasted another eleven years. Your Aunt Lily is still winning.', 'laugh'),
          say('penny', "That's why Uncle Marshall wears shorts to Thanksgiving.", { e: 'smug', l: 'laugh' }),
        ],
      },
    ],
  },
];

// A location-hopping rerun makes the public sets part of offline programming too.
EPISODES.push({
  meta: { code: 'S10E03', title: 'The Expert', logline: 'A local-news interview turns Ted into a neighborhood expert on absolutely everything.' },
  coldOpen: 'Kids, the most dangerous words in New York were not "stand clear of the closing doors." They were "Ted, you are the expert."',
  couch: [say('penny', 'Did you get a badge?', { e: 'bored' }), narr('I looked into it.', 'chuckle')],
  scenes: [
    {
      location: 'metro_news_one', time: 'day', transition: 'exterior',
      cast: [{ character: 'robin', mark: 'anchor_left' }, { character: 'ted', mark: 'anchor_right' }, { character: 'barney', mark: 'desk_side' }],
      beats: [
        narr('Robin needed an architect for a very slow news day.'),
        say('robin', 'We have forty seconds. Explain why the city needs benches.', { to: 'ted' }),
        say('ted', 'To understand the bench, we must first understand ancient Greece.', { to: 'robin', g: 'point' }),
        say('robin', 'We now have thirty seconds and a new enemy.', { to: 'ted', e: 'bored', l: 'laugh' }),
        say('barney', 'Put me on. My qualifications are cheekbones and a tie.', { e: 'smug', g: 'suit_up', l: 'laugh' }),
        say('ted', 'A bench is architecture that believes in you sitting down.', { e: 'happy', to: 'robin' }),
        say('robin', 'Perfect. Sit with that thought. Silently. Through the weather.', { to: 'ted', l: 'big' }),
        say('barney', 'Can the weather be single?', { to: 'robin', e: 'flirty', l: 'laugh' }),
        say('robin', 'And we are off the air. For reasons beyond weather.', { e: 'angry', g: 'facepalm', l: 'laugh' }),
      ],
    },
    {
      location: 'store', time: 'day', transition: 'exterior',
      cast: [{ character: 'ted', mark: 'shelves' }, { character: 'lily', mark: 'center' }, { character: 'marshall', mark: 'display' }],
      beats: [
        narr('By lunch, Ted had expanded his area of expertise.'),
        say('ted', 'This cereal display has terrible structural integrity.', { to: 'lily', g: 'point' }),
        say('lily', 'It is four boxes and a coupon, Ted.', { to: 'ted', e: 'bored', l: 'laugh' }),
        say('marshall', 'The coupon is load-bearing. I respect that.', { to: 'ted', g: 'nod', l: 'laugh' }),
        move('ted', 'queue'),
        say('ted', 'People saw me on television. I have a responsibility.', { to: 'lily', e: 'smug' }),
        say('lily', 'To buy the paper towels we came for.', { to: 'ted', l: 'laugh' }),
        move('marshall', 'checkout'),
        say('marshall', 'Our apartment is now eighty percent paper towel.', { e: 'happy', l: 'laugh' }),
        say('ted', 'Finally. A building material that understands spills.', { g: 'thumbs_up', l: 'big' }),
      ],
    },
    {
      location: 'lecture_hall', time: 'day', transition: 'exterior',
      cast: [{ character: 'ted', mark: 'lectern' }, { character: 'barney', mark: 'student_1_3' }, { character: 'marshall', mark: 'student_1_4' }, { character: 'lily', mark: 'student_2_3' }],
      beats: [
        narr('That afternoon, the expert returned to his natural habitat.'),
        say('ted', 'Today, we examine how public spaces bring people together.', { g: 'hands_up' }),
        say('barney', 'Is there a lab? I brought business cards.', { to: 'ted', e: 'smug', l: 'laugh' }),
        move('ted', 'center'),
        say('ted', 'Barney, this is an architecture class.', { to: 'barney' }),
        say('barney', 'Exactly. I am building connections.', { to: 'ted', g: 'point', l: 'laugh' }),
        say('marshall', 'Do we get college credit for this?', { to: 'ted', e: 'excited' }),
        say('lily', 'We get him to stop explaining benches at dinner.', { to: 'marshall', l: 'laugh' }),
        say('ted', 'Actually, dinner seating is next week.', { to: 'lily', e: 'happy' }),
        say('marshall', 'I would like to audit the dessert portion.', { to: 'ted', l: 'big' }),
      ],
    },
    {
      location: 'restaurant', time: 'night', transition: 'exterior',
      cast: [{ character: 'ted', mark: 'booth_middle' }, { character: 'robin', mark: 'booth_left' }, { character: 'lily', mark: 'booth_right' }, { character: 'marshall', mark: 'booth_end_right' }, { character: 'barney', mark: 'booth_end_left' }],
      beats: [
        narr('That night, we tested his research at dinner.'),
        say('ted', 'Notice how this booth encourages intimate conversation.', { e: 'smug' }),
        say('robin', 'Ted, I spent all day editing Greece out of a bench story.', { to: 'ted', e: 'bored', l: 'laugh' }),
        say('barney', 'My business cards are gone. Huge success.', { e: 'happy' }),
        say('lily', 'The students thought they were drink coupons.', { to: 'barney', l: 'laugh' }),
        say('marshall', 'One of them traded me three for a breadstick.', { to: 'barney', e: 'smug', l: 'laugh' }),
        say('ted', 'Can we agree that the seating works?', { to: 'robin', e: 'nervous' }),
        say('robin', 'Yes. Nobody mentioned ancient Greece.', { to: 'ted' }),
        say('ted', 'Funny you should say that. This bread basket is basically a small amphitheater.', { g: 'point', l: 'big' }),
        act('robin', 'facepalm'),
        narr('Kids, they never asked me to be on the news again.', 'laugh'),
      ],
    },
  ],
});

let counter = 0;

/** Items for one sample episode, cycling through the reruns. */
export function sampleEpisode(): ShowItem[] {
  const ep = EPISODES[counter++ % EPISODES.length];
  const meta: EpisodeMeta = { ...ep.meta, id: `sample-${counter}`, source: 'sample' };
  return [
    { kind: 'episode-start', episode: meta, coldOpen: ep.coldOpen, couch: ep.couch },
    ...ep.scenes.map((scene, index) => ({ kind: 'scene' as const, episode: meta, index, scene })),
    { kind: 'episode-end', episode: meta },
  ];
}

/** A compact example scene for the LLM prompt. */
export const EXAMPLE_SCENE = EPISODES[0].scenes[0];
