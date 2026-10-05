import {
  CHARACTER_IDS, CUTAWAY_STYLES, DELIVERIES, EMOTIONS, GESTURES, GUEST_COLORS, GUEST_EXTRAS, GUEST_HAIR, GUEST_HAIR_STYLES, GUEST_SKIN, GUEST_TOPS,
  LAUGHS, OUTFITS, SCENE_LOCATION_IDS, TRANSITIONS, isGuest, isKid,
} from './types';
import type { StageSet } from '../world/sets/common';

/**
 * The show bible: who the characters are, every set's marks, and the stagecraft vocabulary of an episode file.
 * `bun run bible` prints it for whoever is writing episodes. Marks come from the sets themselves, so it never
 * goes stale.
 */
export function showBible(sets: Record<string, StageSet>) {
  const marks = Object.values(sets)
    .filter((s) => (SCENE_LOCATION_IDS as readonly string[]).includes(s.id))
    .map((s) => {
      const doors = new Set([s.door, ...Object.values(s.entrances ?? {})]);
      const notes = (k: string, seat: boolean) => [seat && 'seat', doors.has(k) && 'door', s.reserved?.includes(k) && 'only if the script puts someone here'].filter(Boolean);
      const extras = s.background.length ? `\nIn the background: ${s.background.map((b) => `${b.character} at ${b.mark}`).join(', ')}.` : '';
      return `### ${s.id} — ${s.name}${s.seated ? ' (everyone is seated)' : ''}${extras}\n`
        + Object.entries(s.marks).map(([k, m]) => {
          const n = notes(k, m.seat !== null);
          return `- ${k}: ${m.hint}${n.length ? ` (${n.join(', ')})` : ''}`;
        }).join('\n');
    })
    .join('\n\n');

  return `# How I Met Your LLM — show bible

"How I Met Your LLM" is an endless continuation of the sitcom How I Met Your Mother, performed by low-poly 3D puppets with text-to-speech voices, a synthesized laugh track and multi-camera sitcom coverage. Every episode is a pre-written JSON file in episodes/. This is everything the stage can perform.

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
- sandy — Sandy Rivers, Robin's vain, pompous fellow news anchor. Uses his broadcast voice off-air, takes credit for other people's work and treats trivial news like an exclusive. Gray suit, pink shirt, lavender tie and pocket square. Natural home: metro_news_one or office.
- arthur — Arthur Hobbs, "Artillery Arthur", Marshall's intimidating boss at the law firm and GNB. Barked orders, absurd corporate demands, then sudden tenderness about his dog Tugboat. Charcoal suit and purple tie. Use office or barneys_office.
- brad — Brad Morris, Marshall's law-school friend and occasional rival lawyer. Tall, muscular, bearded, disarmingly charming; bro-ish abbreviations, loves brunch, can turn a friendly favor into professional competition. Dark suit and striped tie. Give him interests beyond his looks.
- victoria — Victoria, a warm, witty baker and Ted's on-again/off-again romantic interest. Romantic but practical, sees through Ted's grand gestures and unresolved feelings for Robin. Brunette updo and plum dress. Has her own ambitions; she is not the kids' mother. Good for restaurant dates, catering and MacLaren's reunions.
- quinn — Quinn Garvey, Barney's sharp, independent romantic equal. A dancer with a dry sense of humor who recognizes his tricks, negotiates hard and outschemes him. Blonde waves, burgundy leather jacket. Give her agency and jokes of her own; no explicit workplace scenes.
- kevin — Kevin, Robin's therapist-turned-boyfriend. Calm, observant and wry; tries not to analyze the gang, then can't resist identifying their absurd group dynamics. Purple V-neck over a white tee. Keep observations comic, not diagnoses or medical advice.
- judy — Judy Eriksen, Marshall's tall, formidable Minnesota mother and Marvin Sr.'s wife. Fiercely protective, competitive with Lily, expresses love through enormous meals and backhanded domestic advice. Auburn curls, yellow turtleneck and printed apron. Affection underneath the friction; never confuse her with Lily.
- scooter — Scooter, Lily's earnest high-school ex, later a school cafeteria worker. Awkwardly hopeful, overreads tiny signs and volunteers for things nobody requested. Tousled brown hair, brown suit and red tie. His persistence is a comic flaw, not something Lily owes him a reward for.

Use only a few supporting characters per episode, chosen for the story. Do not parade the whole roster through each scene. Establish romantic status in context; the loose timeline does not make every ex a current partner at once.

# Guest stars
HIMYM runs on one-off characters: Ted's date of the week, the woman Barney is running a play on, a bouncer, a rival architect, a client, a game-show host. Each episode can cast up to 3 guest stars in "guests". They take the ids guest1, guest2 and guest3, in the order listed; always refer to them by those ids in scenes (cast, character, to). Describe how they look and sound so they read instantly on screen (see the guest fields below), and give each one a specific comic hook in their role. Invent new names (not anyone above). A guest is never the kids' mother.

# The kids (2030)
Future Ted is telling this whole story to his two teenagers, who sit on the couch in his living room in 2030, facing him. They are never in the story itself.
- penny — Penny Mosby, Ted's daughter, about 15. Sharp and sarcastic, sees straight through Dad's stories: notices when Mom hasn't shown up yet, when he's sanitizing ("So... you were all 'eating sandwiches'?"), or when it's suspiciously about Aunt Robin again.
- luke — Luke Mosby, Ted's son, about 13. Slumped, bored, deadpan; groans at long tangents and perks up for slaps, fights and anything gross.
Any say or act beat by penny or luke in a scene cuts away to them on the couch for that moment; Future Ted narrate beats right after their line are his answer from the couch; then it cuts back to the story. Use them sparingly, as quick reaction buttons (0-2 per episode): a groan ("Dad!"), being grossed out, a pointed question, a deadpan one-liner. Never put them in a scene's cast and never move/enter/exit them. An episode's "couch" can also hold the kids' reaction to the cold open (about half of episodes).

# Sets and marks (where characters can stand or sit)
${marks}

You can also use a character id as a move/enter target to walk over next to that person.

Spread scenes around: MacLaren's and the apartment are home base, but use the other sets when the story goes there.
- rooftop: the apartment building's roof. Late-night talks, big confessions, "sandwiches", watching the skyline.
- barneys_office: Barney's corner office at GNB (nobody knows what he does there: "Please."). Barney's schemes, Marshall dropping by from his GNB job.
- office: a generic open-plan office: Marshall's law firm, Ted's architecture firm, Robin's newsroom, a temp job. Say whose office it is in the scene.
- metro_news_one: Robin's local TV news studio, with two anchor chairs behind the desk, a Manhattan backdrop, cameras and an ON AIR sign. Broadcast mishaps, awkward interviews, friends visiting Robin at work. Use this for on-camera news segments; office is for newsroom desk work.
- store: a generic neighborhood shop with stocked shelves, produce, a drinks fridge, a sale display and a checkout. Shopping trips, impulse purchases, errands and arguments in line. A shopkeeper is at cashier unless a cast member takes that mark.
- restaurant: a generic neighborhood restaurant with a two-person date table, a five-seat group booth, a reservation stand and a swinging kitchen door. Dates, disastrous dinners and the gang dining out. Say which restaurant it is in the scene.
- lecture_hall: Ted's university architecture classroom, with chalkboards, a lectern, an architectural model and tiered student seats. Ted lectures at lectern/chalkboard/center; the friends can sit in student seats or interrupt from the aisle. Background students listen quietly.
- limo: Barney's stretch limo with Ranjit at the wheel. Scenes on the way to (or fleeing from) something.
- taxi: a yellow cab. A cabbie drives unless Ranjit is in the scene (then put him in the driver mark).
Work clothes: Ted wears a suit and tie at office and lecture_hall, Marshall at office and barneys_office (GNB); everywhere else they're in their own clothes. A cast entry's "outfit" overrides that: "work" for Marshall still in his suit at MacLaren's after a day at the firm, "casual" for Ted just dropping by Marshall's office.
In the limo and taxi everyone is seated: "move" means sliding over to another seat, "enter"/"exit" is getting in or out of the car. Keep movement within one compartment; changing between the passenger cabin and the front/driver compartment requires getting out and back in through its own door. Door marks are entrances, not seats for dialogue.

# Scene transitions
Choose the incoming transition for each scene ("transition"; leave it out to choose automatically from changes in time and place). Most connections should be quick cuts; use one or two establishing shots per episode for breathing room.
- cut: straight into the scene on a short guitar sting. Best for immediate continuations and punchline reveals.
- skyline: a brief day/night New York skyline shot with a guitar sting. Good after the titles or for time passing.
- exterior: the outside of the destination building (or street traffic for a cab/limo), then cut inside. Good for a new location.
- rewind: a half-second blurred jump with a descending sound cue. ONLY for an actual flashback or a "let me back up" correction, never an ordinary location change. Start with a short narrate beat making the time jump explicit; use cut when returning to the present.
An opening narrate beat plays over skyline/exterior footage before we cut inside. Keep it to one short sentence. No dialogue or character action happens outside. The kids' couch cutaways always remain straight cuts.

# Cutaways
A cutaway beat leaves the scene for a short sequence on any set, then the show cuts back to exactly where it left off. It's how HIMYM visualizes a joke:
- style "imagined": a fantasy or hypothetical. How Barney pictures his play going, Ted's version of what he should have said, Marshall imagining the worst case, a character's lie as they tell it. Plays with a dreamy haze and a harp run.
- style "flashback": something that really happened earlier ("Three years earlier", "College, 1998"). Future Ted can set it up with a narrate beat right before. Plays in faded sepia.
Give it a short label for the on-screen card ("How Barney imagined it", "Wesleyan, 1996"), a location and time, its own cast and marks (marks must exist at the cutaway's location), and 3-10 beats. Characters can be in both the scene and the cutaway (Barney imagining himself). Put the setup line just before the cutaway and land the punchline right after it, back in the scene. Use at most one or two per episode, never inside another cutaway, and never cut away to the 2030 couch (that happens on its own when the kids speak).

# Delivery
Most lines need no delivery. Use it when the performance is the joke:
- delivery on a say beat: ${DELIVERIES.join(', ')}. whisper for secrets and being overheard, shout for outbursts across the room, sing for a few words of made-up lyrics (never real songs), deadpan for dry understatement, fast for panicked rambling, slow for melodrama.
- interrupted: true when the next speaker cuts this line off. Write the line only up to where it's cut, ending with "—", and make the very next beat the interruption.

# Stagecraft vocabulary
characters: ${CHARACTER_IDS.filter((c) => !isGuest(c) && !isKid(c)).join(', ')}; guest1-guest3 (this episode's guests); penny, luke (couch only)
emotions: ${EMOTIONS.join(', ')}
gestures: ${GESTURES.join(', ')}
laughs (laugh track): ${LAUGHS.join(', ')} — chuckle (small), laugh (normal), big (huge laugh + applause), ooh (scandal/burn), aww (sweet moment), woo (crowd cheers, e.g. Barney's entrance), applause, gasp.

# Episode file format
One JSON file per episode: episodes/<code>-<slug>.json, e.g. episodes/s11e03-the-slap-bet-inflation.json. Episodes air in code order, then loop.

{
  "code": "S11E03",                 // unique; season 11 onward is new material
  "title": "The Slap Bet Inflation",
  "logline": "One or two sentences: the premise.",
  "coldOpen": "Kids, ...",          // Future Ted over the kids on the couch, 1-3 sentences
  "couch": [ ...beats ],            // optional: penny/luke "say" beats and Future Ted "narrate" answers
  "guests": [ ...guest stars ],     // optional, up to 3: guest1, guest2, guest3 in order
  "scenes": [ ...3-4 scenes ]
}

A guest star (every field required except under/tie/vest):
{ "id": "guest1", "name": "Nora", "role": "Ted's date, a sommelier who whispers everything",
  "gender": "female|male", "height": "short|average|tall", "build": "slim|average|broad",
  "skin": "${GUEST_SKIN.join('|')}", "hair": "${GUEST_HAIR.join('|')}",
  "hairStyle": "${GUEST_HAIR_STYLES.join('|')}",
  "topStyle": "${GUEST_TOPS.join('|')}",
  "top": <color>, "pants": <color>, "under": <color, shirt under a jacket>, "tie": <color>, "vest": <color, waistcoat>,
  "extras": [${GUEST_EXTRAS.map((x) => `"${x}"`).join(', ')}],
  "voice": { "pitch": "low|medium|high", "pace": "slow|normal|fast" } }
Colors: ${GUEST_COLORS.join(', ')}, or "#rrggbb". "denim" pants are jeans; pants are ignored under a dress.

A scene:
{ "location": "${SCENE_LOCATION_IDS.join('|')}", "time": "day|night",
  "transition": "${TRANSITIONS.join('|')}",   // optional
  "summary": "Writers' note: what happens and how it ends.",   // optional, not shown
  "cast": [ { "character": "ted", "mark": "booth_end", "outfit": "${OUTFITS.join('|')}" } ],   // outfit optional
  "beats": [ ...beats, in order ] }

Beats (optional fields in brackets):
{ "type": "say", "character": "barney", ["to": "ted"], "line": "...", ["delivery": "${DELIVERIES.join('|')}"], ["interrupted": true], ["emotion": ...], ["gesture": ...], ["laugh": ...] }
{ "type": "narrate", "line": "Kids, ...", ["laugh": ...] }          // Future Ted voice-over
{ "type": "move", "character": "ted", "to": <mark or character id> }
{ "type": "enter", "character": "robin", ["to": <mark or character id>] }   // through the door
{ "type": "exit", "character": "robin" }
{ "type": "act", "character": "marshall", "gesture": "slap", ["to": "barney"], ["emotion": ...] }
{ "type": "laugh", "laugh": "applause" }                              // a standalone laugh-track reaction
{ "type": "pause", "seconds": 1.5 }                                    // up to 5
{ "type": "cutaway", "style": "${CUTAWAY_STYLES.join('|')}", "label": "How Barney imagined it", "location": "barneys_office", "time": "day",
  "cast": [ ...cast at that location ], "beats": [ ...3-10 beats, no cutaways ] }

Staging rules (\`bun run episodes check\` enforces them):
- Everyone who speaks, acts, moves or exits is on stage: in the scene's cast, or brought on with "enter". Exited characters are gone until they enter again.
- Marks belong to the scene's (or cutaway's) location. One person per mark.
- "to" on say/act is the character being addressed or gestured at; use it on most lines so people look at each other.
- Lines are spoken aloud by text-to-speech: no stage directions, parentheses or asterisks in them. Mostly under 18 words, never over 35.
- Put a "laugh" on real punchlines (roughly every 2-4 lines, varying the kind), never on setups. A laugh on a narrate beat works too.
- At most 2 narrate beats per scene. The final scene ends with a Future Ted narrate button.
- PG-13: innuendo OK, nothing explicit, no slurs, no real-world politics. Original jokes and plots; catchphrases in moderation.`;
}
