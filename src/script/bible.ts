import {
  CHARACTER_IDS, CHART_STYLES, CUTAWAY_STYLES, DELIVERIES, EMOTIONS, GESTURES, GUEST_COLORS, GUEST_EXTRAS, GUEST_HAIR, GUEST_HAIR_STYLES, GUEST_SKIN,
  GUEST_TOPS, INSERT_KINDS, LAUGHS, MONTAGE_MUSIC, OUTFITS, PROPS, SCENE_LOCATION_IDS, SHOTS, TRANSITIONS, isGuest, isKid,
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
Warm, fast, quotable, a little sentimental. The show's comedy engine: elaborate bits, running gags, callbacks, friends roasting each other, Barney's absurd schemes, Marshall's big-hearted sincerity, Lily's meddling, Robin's dry Canadian deadpan, Ted's romantic over-thinking. Future Ted (the narrator, Ted in 2030 telling his kids the story) adds perspective, time jumps, misdirection and wry asides. His voice-over does not require showing the kids or starting with "Kids, ...". The timeline is loose and dreamy: it's an endless show.

# Story shape and framing
Read docs/story-structure-reference.md for researched examples from the show and the encoding guide. Choose the opening, couch visits and ending independently for the premise. Open with the gang already in a scene, narration over the story, an outcome followed by an explained rewind, or a couch exchange. The kids may appear only in the middle, only at the end, more than once when earned, or not at all. Future Ted remains the retrospective storyteller when the couch is absent. A closing character joke or visual payoff is as valid as narration; don't append a moral that repeats the action. Compare recent episodes and the current batch to avoid repeating the same first image, first speaker and ending device. There is no required ratio of couch openings.

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

- loretta — Loretta Stinson, Barney and James's mother. Breezy, affectionate and unflappable; tells contradictory stories about Barney's childhood and his father. Can fluster Barney with one casual detail. Auburn updo, shimmering black-and-gold blouse. Natural sets: barneys, restaurant.
- mickey — Mickey Aldrin, Lily's unreliable dad and a failed board-game inventor. Pitches hopeless games to Marshall with total confidence; Lily's anger hides a wish that he would show up for her. Balding with a graying beard, rumpled red plaid. Natural sets: apartment, store.
- hammond — Hammond Druthers, Ted's pompous former architecture boss. Praises his own ugly buildings and treats Ted's successes as footnotes; a mirror of Ted's pretension. Brown sweater vest, checked shirt and blue tie. Natural sets: office, lecture_hall.
- stella — Stella Zinman, dermatologist, Lucy's mother and Ted's former fiancée. Warm, brisk, practical; her busy life punctures Ted's romantic overthinking. Blonde waves, blue striped cardigan and coral blouse. Give her her own goals and jokes, not just regret about Ted. Natural sets: restaurant, maclarens.
- zoey — Zoey Pierson, activist, the Captain's ex-wife and Ted's ex. Smart, stubborn and passionate about preservation; can turn choosing a table into a campaign. Burgundy knit hat, blonde waves, dark coat and scarf. Her convictions and friendships matter beyond Ted. Natural sets: restaurant, maclarens.
- nora — Nora, Robin's British coworker and Barney's former girlfriend (NOT Robin's ex or Stella's sister Nora Zinman). Warm, self-possessed, dryly funny; expects honesty and follows her own priorities. Dark hair and ivory floral dress. Give her agency and comic victories, as with Victoria and Quinn. Natural sets: restaurant, maclarens.
- virginia — Virginia Mosby, Ted's mother. Cheerfully overshares startling details of her dating life without noticing Ted's mortification. Chestnut bob, red blouse and earrings. Natural sets: restaurant, taxi.
- punchy — Adam "Punchy" Punciarello, Ted's loud high-school friend from Ohio. Friendly arm punches, "Schmosby!", and instant teenage regression from Ted; loyal underneath the noise. Short dark hair, black wedding suit, ivory tie and boutonniere. Natural sets: maclarens, limo; establish a wedding-related occasion for his formal clothes.
- robin_sparkles — Robin Sparkles is ROBIN'S Canadian teen-pop persona, not another friend. Big, earnest pop-star energy and dated mall promotions; faded denim jacket and skirt, blonde curls, red hair bow and belt, black beads, neon bangles. Use for a labeled Canadian flashback, imagined music-video cutaway, or an explicitly established adult reprise. Natural sets: canadian_mall (a mall performance), store (a small retail promotion), metro_news_one. Never cast robin and robin_sparkles as separate people in the same real scene; return to robin after the cutaway. Only original dialogue or invented short lyrics, never reproduce the real songs.

Use only a few supporting characters per episode, chosen for the story. Do not parade the whole roster through each scene. Establish romantic status in context; the loose timeline does not make every ex a current partner at once.

# Guest stars
HIMYM runs on one-off characters: Ted's date of the week, the woman Barney is running a play on, a bouncer, a rival architect, a client, a game-show host. Each episode can cast up to 3 guest stars in "guests". They take the ids guest1, guest2 and guest3, in the order listed; always refer to them by those ids in scenes (cast, character, to). Describe how they look and sound so they read instantly on screen (see the guest fields below), and give each one a specific comic hook in their role. Invent new names (not anyone above). A guest is never the kids' mother.

# The kids (2030)
Future Ted is telling this whole story to his two teenagers, who sit on the couch in his living room in 2030, facing him. They are never in the story itself.
- penny — Penny Mosby, Ted's daughter, about 15. Sharp and sarcastic, sees straight through Dad's stories: notices when Mom hasn't shown up yet, when he's sanitizing ("So... you were all 'eating sandwiches'?"), or when it's suspiciously about Aunt Robin again.
- luke — Luke Mosby, Ted's son, about 13. Slumped, bored, deadpan; groans at long tangents and perks up for slaps, fights and anything gross.
Any say or act beat by penny or luke in a scene cuts away to them on the couch. Consecutive kid beats, narrate answers, laughs and pauses stay there; the next story beat cuts back to the saved scene. A standalone narrate beat otherwise stays over the story. Use brief visits where a particular reveal, evasion or contradiction earns a reaction or question; omit them when they add nothing. The kids hear Dad's account, not our camera shots. Never put them in a scene's cast and never move/enter/exit them. Top-level "couch" is only for an opening exchange; middle and closing reactions belong at the relevant point in a scene's beats.

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
- subway: NYC subway car with orange molded benches, stainless grab poles, route maps and sliding doors. Seated conversations or standing in the aisle; use pole/center for standing, seat_* for sitting.
- laser_tag: Blacklight laser tag arena, cyan and pink team bases, low bunkers, barrels and a scoreboard. Barney takes it far too seriously. blue_cover/red_cover are behind the bunkers; center/teammate are in the open playing lane.
- wesleyan_dorm: Ted and Marshall's Wesleyan dorm, College, 1996. Metal bunks with plaid bedding, student flyers, a beige CRT, cassette stereo and pizza on the rug. Use flashback cutaways labeled "College, 1996" for college Ted, Marshall and Lily. bed_left/bed_right are seats on the lower bunk. Keep props and dialogue period-appropriate; no smartphones or modern laptops.
- hospital: Hospital waiting room with teal chairs, magazines, a coffee machine, reception and a ward door. Quiet worry, family milestones and awkward attempts to pass the time. receptionist is reserved for staff.
- elevator: Wood-paneled elevator with steel doors, brass-toned details, floor buttons and a glowing floor indicator. Awkward silences and trapped conversations; everyone stands. buttons is beside the control panel.
- maclarens_sidewalk: playable sidewalk outside the shared pub/apartment facade. Pub rail and basement stairs to the left, tall residential stoop to the right, tree, meter and bins. Use for goodbyes, cab arrivals and conversations after leaving the bar. All marks are on the sidewalk; stoop is at the foot of the stairs.
- hoser_hut: Robin’s Canadian neighbourhood bar: hockey jerseys, maple flag, mounted antlers, red stools, small tables, karaoke. Use Canadian homesickness and Robin/Marshall rivalry, not a copy of the gang’s MacLaren’s booth.
- courtroom: Marshall’s court appearances. Separate counsel and opposing_counsel tables, argument in the center aisle, witness box, judge, jury and gallery seats. Marshall automatically wears his work suit.
- atlantic_city_casino: Barney’s elaborate Chinese gaming table (Xing Hai Shi Bu Xing), upright slots, burgundy-and-gold casino. player_center is Barney’s seat; dealer is reserved. New arrivals automatically get an Atlantic City boardwalk transition.
- lusty_leopard: Barney’s recurring club, as in Karma: red carpet, leopard inlays, chrome café chairs, a small brass-railed stage, beaded entrance and back bar. Use for Barney/Quinn conversations and friends interrupting him; table_left/table_right are the intimate dialogue pair.
- canadian_mall: Canadian mall, 1990, for Robin Sparkles memories: pastel storefronts, tiled atrium, record shop, plants, benches and a low pink performance dais. Use flashback cutaways labeled "Canada, 1990". Use robin_sparkles for the performance, returning to robin after the cutaway; stage/dancer_left/dancer_right are on the dais, audience/friend watch her. Write original pop-song jokes instead of quoting song lyrics.
- limo: Barney's stretch limo with Ranjit at the wheel. Scenes on the way to (or fleeing from) something.
- taxi: a yellow cab. A cabbie drives unless Ranjit is in the scene (then put him in the driver mark).
Work clothes: Ted wears a suit and tie at office and lecture_hall, Marshall at office, barneys_office (GNB) and courtroom; everywhere else they're in their own clothes. A cast entry's "outfit" overrides that: "work" for Marshall still in his suit at MacLaren's after a day at the firm, "casual" for Ted just dropping by Marshall's office.
Wardrobe: when the clothes are the joke or the occasion (Ted's red cowboy boots, Barney in sweatpants, a wedding, a job interview), give someone a costume: the episode's "wardrobe" for the whole episode, a scene's "wardrobe" for that scene (over the episode's). Only what you mention changes, and it goes over their casual or work clothes. Not for guest stars (describe them in guests) or the kids.
In the limo and taxi everyone is seated: "move" means sliding over to another seat, "enter"/"exit" is getting in or out of the car. Keep movement within one compartment; changing between the passenger cabin and the front/driver compartment requires getting out and back in through its own door. Door marks are entrances, not seats for dialogue.

# Scene transitions
For subway, laser_tag, wesleyan_dorm, hospital, elevator, canadian_mall, hoser_hut, courtroom and lusty_leopard, use cut (or an intentional rewind); their interiors have no dedicated exterior.
Choose the incoming transition for each scene ("transition"; leave it out to choose automatically from changes in time and place). Most connections should be quick cuts; use one or two establishing shots per episode for breathing room.
- cut: straight into the scene on a short guitar sting. Best for immediate continuations and punchline reveals.
- skyline: a brief day/night New York skyline shot with a guitar sting. Good after the titles or for time passing.
- atlantic_city: the ocean, boardwalk and period casino skyline; automatic for an Atlantic City casino arrival, also usable explicitly for a limo arriving there. Day/night supported.
- exterior: the outside of the destination building (or street traffic for a cab/limo), then cut inside. Good for a new location.
  MacLaren's and the apartment share one building: location maclarens frames the sunken pub entrance; location apartment frames the raised residential stoop and doorway beside it. Use transition exterior with either location to establish that entrance.
- rewind: a half-second blurred jump with a descending sound cue. ONLY for an actual flashback or a "let me back up" correction, never an ordinary location change. Start with a short narrate beat making the time jump explicit; use cut when returning to the present.
An opening narrate beat plays over skyline/exterior/atlantic_city footage before we cut inside. Keep it to one short sentence. Establishing transitions have no actors. For outdoor dialogue, use the playable maclarens_sidewalk or rooftop location. The kids' couch cutaways always remain straight cuts.

# Cutaways
A cutaway beat leaves the scene for a short sequence on any set, then the show cuts back to exactly where it left off. It's how HIMYM visualizes a joke:
- style "imagined": a fantasy or hypothetical. How Barney pictures his play going, Ted's version of what he should have said, Marshall imagining the worst case, a character's lie as they tell it. Plays with a dreamy haze and a harp run.
- style "flashback": something that really happened earlier ("Three years earlier", "College, 1998"). Future Ted can set it up with a narrate beat right before. Plays in faded sepia.
Give it a short label for the on-screen card ("How Barney imagined it", "Wesleyan, 1996"), a location and time, its own cast and marks (marks must exist at the cutaway's location), and 3-10 beats. Characters can be in both the scene and the cutaway (Barney imagining himself). Put the setup line just before the cutaway and land the punchline right after it, back in the scene. Use at most one or two per episode, never inside another cutaway, and never cut away to the 2030 couch (that happens on its own when the kids speak).

# Delivery
Most lines need no delivery. Use it when the performance is the joke:
- delivery on a say beat: ${DELIVERIES.join(', ')}. whisper for secrets and being overheard, shout for outbursts across the room, sing for a few words of made-up lyrics (never real songs), deadpan for dry understatement, fast for panicked rambling, slow for melodrama.
- interrupted: true when the next speaker cuts this line off. Write the line only up to where it's cut, ending with "—", and make the very next beat the interruption.

# Group lines and reactions
- "chorus" on a say beat: everyone else saying the line at the same time ("ALL: What?!"). The caption reads "Ted & Marshall", or "Everyone" when it's the whole room. penny and luke can say a line together on the couch.
- "react" on a say beat (or an insert) cuts to the listeners when it lands: [{ "character": "marshall", "gesture": "spit_take" }, { "character": "lily", "emotion": "surprised" }]. One reactor gets a closeup cheated toward the camera; a cluster gets a group shot; people spread around the room get quick cuts face to face. For reveals and big punchlines, not every line.

# Props
"hold" picks something up ("none" puts it down); "give" hands what they're holding (or "prop") to "to", walking over if needed. Props: ${PROPS.join(', ')}. Plots built around objects: the ring box, the envelope, the phone with the text, the Playbook (book), the yellow umbrella, the blue French horn, the goat. One thing at a time; props carry through cutaways and montages and are dropped at the next scene.

# Camera
Leave coverage to the director, except when a shot is the joke. "shot" on a say, act, hold, give or freeze beat: closeup (a single), two (a two-shot with "to"), push_in (a slow dolly in for a realization, confession or reveal), wide (the whole room). At most a few per scene.

# Inserts, freeze frames and montages
- insert: a full-screen card of the thing itself. kind ${INSERT_KINDS.join('|')}: text (a thread on "character"'s phone: "messages" [{ "from", "text" }], theirs on the right; "title" is who it's with), chart (an easel chart in marker: "title", up to 6 "items" [{ "label", "value" }], "chart" ${CHART_STYLES.join('|')}), slides (a slide: "title" and up to 6 bullet "lines"), sign (a taped-up note: "title" and a couple of "lines"), playbook (a Playbook page: the play as "title", steps as "lines"). "character" is whose it is and reads "line" over it (Future Ted reads it without a character). The card is the punchline or the setup. 0-2 per episode.
- freeze: Future Ted narrates "line" over a frozen frame. A "character" (with an optional gesture, "to" and emotion) freezes on them mid-action: Marshall mid-slap, a face mid-realization. 0-1 per episode.
- montage (top-level only): "and that's how it went for three weeks". A "label" for the first card, "music" ${MONTAGE_MUSIC.join('|')}, and 2-6 "shots", each a location, time, its own cast, an optional little card ("Day 3") and 0-2 beats (gestures, props, very short lines). A narrate beat can set it up before and land it after. 0-1 per episode.

# Stagecraft vocabulary
characters: ${CHARACTER_IDS.filter((c) => !isGuest(c) && !isKid(c)).join(', ')}; guest1-guest3 (this episode's guests); penny, luke (couch only)
emotions: ${EMOTIONS.join(', ')}. An emotion shows in the face and the whole body (sad slumps, angry clenches fists, smug and proud stand hands on hips, scared hunches up, bored shifts from foot to foot, embarrassed and flirty blush, crying has tears) and holds for a few seconds before they relax back to their usual selves, so put it on the line where it lands; drunk lasts the scene. Listeners nod along and pick up a little of the speaker's mood on their own.
gestures: ${GESTURES.join(', ')}. Done to someone ("to"): high_five, hug, slap, kiss and fist_bump (the bro fist) bring the other person in; a kiss without "to" is blown. sit/stand: into the nearest free seat, or up out of it. phone_call holds a phone to their ear for the whole line. lean_in for secrets and flirting, jaw_drop for disbelief, spit_take (a sip sprayed across the room) works best as a reaction. double_take (looks, looks away, snaps back wide-eyed; best with "to" or as a reaction), eye_roll, crack_up (doubled over laughing), sob, slow_clap (sarcastic or sincere), hands_on_hips, head_in_hands, air_quotes, fist_pump, cover_mouth (a gasp). crack_up, sob, eye_roll, cover_mouth, fist_pump, head_in_hands and double_take bring their own face (laughing, crying, bored, surprised, excited, sad, surprised) unless the beat sets an emotion; hands_on_hips, head_in_hands and sob last the whole line they're on.
props: ${PROPS.join(', ')}
shots: ${SHOTS.join(', ')}
laughs (laugh track): ${LAUGHS.join(', ')} — chuckle (small), laugh (normal), big (huge laugh + applause), ooh (scandal/burn), aww (sweet moment), woo (crowd cheers, e.g. Barney's entrance), applause, gasp.

# Episode file format
One JSON file per episode: episodes/<code>-<slug>.json, e.g. episodes/s11e03-the-slap-bet-inflation.json. Episodes air in code order, then loop.

{
  "code": "S11E03",                 // unique; season 11 onward is new material
  "title": "The Slap Bet Inflation",
  "logline": "One or two sentences: the premise.",
  "coldOpen": "That winter, ...",   // optional: Future Ted over the couch, 1-3 sentences
  "couch": [ ...beats ],            // optional opening: penny/luke "say" and Future Ted "narrate"; may stand alone
  "guests": [ ...guest stars ],     // optional, up to 3: guest1, guest2, guest3 in order
  "wardrobe": [ ...costumes ],      // optional: worn all episode
  "scenes": [ ...3-4 scenes ]
}

Omit both coldOpen and couch to open on scenes[0], which plays once before the main titles; the remaining scenes follow them. Start that scene with dialogue/action or a narrate beat over the set (or skyline/exterior transition). Use transition "cut" for an immediate interior opening. When coldOpen or a nonempty couch is present, that couch opening precedes the titles and all scenes follow. Do not use an empty coldOpen string to opt out: omit the field. Existing couch-opening files still play as written.

A costume (only "character" is required; anything left out stays as it is):
{ "character": "ted", "topStyle": "${GUEST_TOPS.join('|')}", "top": <color>, "under": <color>, "tie": <color>, "vest": <color>,
  "pants": <color>, "shoes": <color>, "boots": true, "hairStyle": <hair style>, "extras": [...] }

A guest star (every field required except under/tie/vest):
{ "id": "guest1", "name": "Elodie", "role": "Ted's date, a sommelier who whispers everything",
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
  "wardrobe": [ ...costumes ],   // optional: this scene only, over the episode's
  "cast": [ { "character": "ted", "mark": "booth_end", "outfit": "${OUTFITS.join('|')}" } ],   // outfit optional
  "beats": [ ...beats, in order ] }

Beats (optional fields in brackets):
{ "type": "say", "character": "barney", ["to": "ted"], "line": "...", ["delivery": "${DELIVERIES.join('|')}"], ["interrupted": true], ["emotion": ...], ["gesture": ...], ["laugh": ...],
  ["chorus": ["ted", "marshall"]], ["react": [{ "character": "lily", ["emotion": ...], ["gesture": ...] }]], ["shot": "${SHOTS.join('|')}"] }
{ "type": "narrate", "line": "Kids, ...", ["laugh": ...] }          // Future Ted voice-over
{ "type": "move", "character": "ted", "to": <mark or character id> }
{ "type": "enter", "character": "robin", ["to": <mark or character id>] }   // through the door
{ "type": "exit", "character": "robin" }
{ "type": "act", "character": "marshall", "gesture": "slap", ["to": "barney"], ["emotion": ...], ["shot": ...] }
{ "type": "hold", "character": "ted", "prop": "ring"|"none", ["shot": ...] }
{ "type": "give", "character": "ted", "to": "robin", ["prop": "ring"], ["shot": ...] }
{ "type": "freeze", "line": "Kids, ...", ["character": "marshall"], ["gesture": ...], ["to": ...], ["emotion": ...], ["laugh": ...], ["shot": ...] }
{ "type": "insert", "kind": "${INSERT_KINDS.join('|')}", ["title": "..."], ["lines": [...]], ["messages": [{ "from": "barney", "text": "..." }]],
  ["items": [{ "label": "Hot", "value": 9 }]], ["chart": "${CHART_STYLES.join('|')}"], ["character": "barney"], ["line": "..."], ["laugh": ...], ["react": [...]] }
{ "type": "laugh", "laugh": "applause" }                              // a standalone laugh-track reaction
{ "type": "pause", "seconds": 1.5 }                                    // up to 5
{ "type": "cutaway", "style": "${CUTAWAY_STYLES.join('|')}", "label": "How Barney imagined it", "location": "barneys_office", "time": "day",
  "cast": [ ...cast at that location ], "beats": [ ...3-10 beats, no cutaways or montages ] }
{ "type": "montage", ["label": "Three weeks of canoe lessons"], "music": "${MONTAGE_MUSIC.join('|')}",
  "shots": [ { "location": ..., "time": ..., ["label": "Day 3"], "cast": [...], "beats": [ ...0-2 beats ] }, ...2-6 shots ] }

Staging rules (\`bun run episodes check\` enforces them):
- Everyone who speaks, acts, moves or exits is on stage: in the scene's cast, or brought on with "enter". Exited characters are gone until they enter again.
- Marks belong to the scene's (or cutaway's) location. One person per mark.
- "to" on say/act is the character being addressed or gestured at; use it on most lines so people look at each other.
- Lines are spoken aloud by text-to-speech: no stage directions, parentheses or asterisks in them. Mostly under 18 words, never over 35.
- Put a "laugh" on real punchlines (roughly every 2-4 lines, varying the kind), never on setups. A laugh on a narrate beat works too.
- Keep narration purposeful: a time jump, reveal, correction, withheld detail or couch answer. Avoid explaining what we already see. End with the strongest earned button, whether dialogue, a visual payoff, kids or narration.
- PG-13: innuendo OK, nothing explicit, no slurs, no real-world politics. Original jokes and plots; catchphrases in moderation.`;
}
