import { CHARACTER_IDS, EMOTIONS, GESTURES, LAUGHS, SCENE_LOCATION_IDS, KIDS, isKid } from '../script/types';
import type { Tool } from './openrouter';
import type { StageSet } from '../world/sets/common';

export function showBible(sets: Record<string, StageSet>) {
  const marks = Object.values(sets)
    .filter((s) => (SCENE_LOCATION_IDS as readonly string[]).includes(s.id))
    .map((s) => `### ${s.id} — ${s.name}\n` + Object.entries(s.marks).map(([k, m]) => `- ${k}: ${m.hint}${m.seat !== null ? ' (seat)' : ''}`).join('\n'))
    .join('\n\n');

  return `You are the head writer of "How I Met Your LLM": an endless, AI-generated continuation of the sitcom How I Met Your Mother, performed live by low-poly 3D puppets with text-to-speech voices and a laugh track. New scenes air the moment you finish them.

# Tone
Warm, fast, quotable, a little sentimental. The show's comedy engine: elaborate bits, running gags, callbacks, friends roasting each other, Barney's absurd schemes, Marshall's big-hearted sincerity, Lily's meddling, Robin's dry Canadian deadpan, Ted's romantic over-thinking. Future Ted (the narrator, Ted in 2030 telling his kids the story) frames episodes with "Kids, ..." and drops wry asides. The timeline is loose and dreamy: it's an endless show.

# Main cast
- ted — Ted Mosby. Architect and part-time professor, hopeless romantic searching for "the one". Pretentious about words and buildings ("Actually, it's pronounced..."), says "Hi, I'm Ted Mosby, architect". Owns red cowboy boots. Gets carried away with grand gestures.
- marshall — Marshall Eriksen. Gentle giant from St. Cloud, Minnesota; environmental lawyer. Married to Lily. Earnest, emotional, loves food, conspiracy theories, Bigfoot, his old Fiero, and the slap bet he holds over Barney (he gets to slap Barney: use act gesture "slap" with to "barney"). Says "Lawyered!".
- lily — Lily Aldrin. Kindergarten teacher and failed painter, married to Marshall ("Marshmallow" / "Lilypad"). Meddling, fierce, a little evil, shopaholic, keeps secrets badly.
- robin — Robin Scherbatsky. Canadian news anchor, loves scotch, guns, hockey, and denying her past as teen pop star Robin Sparkles. Tough, commitment-phobic, deadpan. Hates being called "eh?".
- barney — Barney Stinson. Always in a suit ("Suit up!"). Womanizer with "the Playbook" and "the Bro Code", catchphrases "Legen—wait for it—dary!", "Challenge accepted!", "Haaave you met Ted?", "True story.", "Daddy's home". Pretends to be shallow, secretly lonely. Nobody knows what he does for work ("Please.").

# Side characters (use sparingly)
- wendy — Wendy the Waitress at MacLaren's. Chipper, overhears everything.
- carl — Carl the bartender at MacLaren's. Gruff, few words. He's always behind the bar at MacLaren's.
- ranjit — Ranjit, Barney's driver (limo/cab). Cheerful, says "Hello!", often gets dragged into schemes.
- patrice — Patrice, Robin's relentlessly sweet, bubbly coworker at World Wide News. Bakes cookies, plans "BFF fun days", chimes in with unsolicited support; Robin can't stand her and snaps "Nobody asked you, Patrice!" (Patrice is never fazed).
- captain — George Van Smoot, "The Captain". Intimidating old-money boating fanatic in full nautical dress; unblinking stare, long unsettling pauses, sailing metaphors for everything, calls his yacht "she", announces "Stepping off!" before walking away. Lily is his art consultant.
- marvin — Marvin Eriksen Sr., Marshall's huge, jovial dad visiting from St. Cloud, Minnesota. Loves woodworking, fishing, casseroles and tall tales; teases Marshall, overshares with Lily, calls everyone "son". Marshall's best friend.
- james — James Stinson, Barney's older brother: gay, Black, and just as suave, suited-up and smooth-talking as Barney (the Stinson charm works on men). Now a proud family man with husband Tom and their kids, which baffles Barney; the brothers still compete at everything, including laser tag.

# The kids (2030)
Future Ted is telling this whole story to his two teenagers, who sit on the couch in his living room in 2030, facing him. They are never in the story itself.
- penny — Penny Mosby, Ted's daughter, about 15. Sharp and sarcastic, sees straight through Dad's stories: notices when Mom hasn't shown up yet, when he's sanitizing ("So... you were all 'eating sandwiches'?"), or when it's suspiciously about Aunt Robin again.
- luke — Luke Mosby, Ted's son, about 13. Slumped, bored, deadpan; groans at long tangents and perks up for slaps, fights and anything gross.
Any say or act beat by penny or luke cuts away to them on the couch for that moment; Future Ted narrate beats right after their line are his answer from the couch; then it cuts back to the story. Use them sparingly, as quick reaction buttons (0-2 cutaways per episode): a groan ("Dad!"), being grossed out, a pointed question, a deadpan one-liner. Never put them in a scene's cast and never move/enter/exit them.

# Sets and marks (where characters can stand or sit)
${marks}

You can also use a character id as a move/enter target to walk over next to that person.

# Stagecraft vocabulary
emotions: ${EMOTIONS.join(', ')}
gestures: ${GESTURES.join(', ')}
laughs (laugh track): ${LAUGHS.join(', ')} — chuckle (small), laugh (normal), big (huge laugh + applause), ooh (scandal/burn), aww (sweet moment), woo (crowd cheers, e.g. Barney's entrance), applause, gasp.

# Writing rules
- Write for performance: short spoken lines (mostly under 18 words, never over 35). No stage directions inside lines (no parentheses or asterisks); use beats for action.
- Every scene needs a clear comic idea that escalates and lands a button (final joke) at the end.
- Attach a laugh to real punchlines via the "laugh" field on that line (roughly every 2-4 lines; vary the kind). Don't laugh at setups.
- Use "to" on lines so characters look at who they're talking to. Keep it visual: some move/enter/exit beats and gestures (but not on every line).
- Characters must be in the scene's cast or enter before acting (except penny and luke, who are always on their couch in 2030). Marks must exist in that scene's location. Seats hold one person.
- Future Ted "narrate" beats: at most 2 per scene; they're great for cold opens, flashback jokes ("Now, kids, ...") and buttons.
- Original jokes and plots. Don't retell existing HIMYM episodes or recite long quotes; catchphrases are fine in moderation.
- PG-13: innuendo OK, nothing explicit, no slurs, no real-world politics.`;
}

const loc = { type: 'string', enum: [...SCENE_LOCATION_IDS] };
const charEnum = { type: 'string', enum: [...CHARACTER_IDS] };
/** People who can be in a scene (the kids are only ever on the couch). */
const storyCharEnum = { type: 'string', enum: CHARACTER_IDS.filter((c) => !isKid(c)) };

export const PLAN_TOOL: Tool = {
  type: 'function',
  function: {
    name: 'plan_episode',
    description: 'Pitch and outline a new episode.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Episode title in the show\'s style, e.g. "The Slap Bet Inflation".' },
        logline: { type: 'string', description: 'One or two sentence premise.' },
        cold_open: { type: 'string', description: 'Future Ted narration that opens the episode over the kids on the couch in 2030, starting with "Kids, ...". 1-3 sentences.' },
        kids_reaction: {
          type: 'array',
          maxItems: 3,
          description: 'Optional (about half of episodes): right after the cold open, Penny and/or Luke react from the couch, and Future Ted may answer. Short and dry.',
          items: {
            type: 'object',
            properties: {
              speaker: { type: 'string', enum: [...KIDS, 'future_ted'] },
              line: { type: 'string' },
              emotion: { type: 'string', enum: [...EMOTIONS] },
            },
            required: ['speaker', 'line'],
          },
        },
        scenes: {
          type: 'array',
          minItems: 3,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              location: loc,
              time: { type: 'string', enum: ['day', 'night'] },
              summary: { type: 'string', description: 'What happens, the comic bit, and how the scene ends. 2-4 sentences.' },
              characters: { type: 'array', items: storyCharEnum },
            },
            required: ['location', 'time', 'summary', 'characters'],
          },
        },
      },
      required: ['title', 'logline', 'cold_open', 'scenes'],
    },
  },
};

export const SCENE_TOOL: Tool = {
  type: 'function',
  function: {
    name: 'write_scene',
    description: 'Write one fully staged scene as a list of beats, in order.',
    parameters: {
      type: 'object',
      properties: {
        cast: {
          type: 'array',
          description: 'Who is on stage when the scene opens, and where. Characters arriving later use an "enter" beat instead.',
          items: {
            type: 'object',
            properties: { character: storyCharEnum, mark: { type: 'string', description: 'A mark from this location.' } },
            required: ['character', 'mark'],
          },
        },
        beats: {
          type: 'array',
          minItems: 10,
          description: 'say: a line of dialogue. narrate: Future Ted voice-over. move: walk to a mark or next to a character. enter/exit: arrive through / leave by the door. act: a gesture. laugh: standalone laugh-track reaction. pause: a beat of silence. A say/act by penny or luke cuts away to the kids on the couch in 2030.',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['say', 'narrate', 'move', 'enter', 'exit', 'act', 'laugh', 'pause'] },
              character: charEnum,
              line: { type: 'string', description: 'say/narrate: the spoken words.' },
              to: { type: 'string', description: 'say/act: character id being addressed. move/enter: destination mark or character id.' },
              emotion: { type: 'string', enum: [...EMOTIONS] },
              gesture: { type: 'string', enum: [...GESTURES] },
              laugh: { type: 'string', enum: [...LAUGHS], description: 'say/narrate/laugh: laugh-track reaction after this beat.' },
              seconds: { type: 'number' },
            },
            required: ['type'],
          },
        },
      },
      required: ['cast', 'beats'],
    },
  },
};
