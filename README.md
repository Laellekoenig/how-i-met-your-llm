# how i met your LLM

An endless, AI-generated *How I Met Your Mother*–style sitcom in the browser, in the spirit of *Nothing, Forever*.
Low-poly puppets perform pre-written episodes, written by AI agents, on eighteen sets (MacLaren's, the apartment,
Barney's place, the roof, Barney's office, a generic office, Metro News One, a neighborhood store, a restaurant,
Ted's lecture hall, Barney's limo, a cab, the subway, a laser-tag arena, a Wesleyan dorm, a hospital waiting room,
an elevator and a Canadian mall), framed by Future Ted telling
the story to his bored kids on the couch in 2030, with browser TTS voices,
a synthesized laugh track, multi-camera sitcom coverage, and a crunchy pixel/dither post-process.

```sh
bun install
bun dev            # http://localhost:5173
```

The show starts as soon as the page loads. By default it's just the TV: episodes play back to back, letterboxed to 16:9 with black bars,
with no controls. Browsers may hold the sound back until you first click or press a key on the page; a "click for sound" badge sits in the corner until then. Press `d` (or open `/?dev`) for **dev mode**, which brings back the transport bar and the side panel.
Add `mute` (`/?mute`, `/?dev&mute`) to play everything silently. Automated browsers (`navigator.webdriver`) and
the T3 Code preview browser are muted automatically, so agents testing the show stay quiet; `?sound` overrides that.

Every episode is a JSON file in `episodes/`; each visit starts at a random one, then they air in code order, back to back, on a loop.
Open `/?ep=S10E03` to start at a particular episode.

Keys: `d` toggle dev mode · `f` fullscreen · dev mode only: `space` pause · `→` skip scene.

## Writing episodes

Episodes are written ahead of time by agents, not live. In Claude Code, run `/write-episodes 3` (or
`/write-episodes Barney gets banned from Costco`). It pitches premises, then launches one **episode-writer** agent per
episode in parallel ([`.claude/agents/episode-writer.md`](.claude/agents/episode-writer.md), which holds the
story and joke craft guide), and reviews what they write. You can also ask for the `episode-writer` agent directly.

The writers' tools, which work just as well by hand:

```sh
bun run bible                      # the show bible: characters, every set's marks, the episode file format
bun run episodes list              # what has aired, and the next free code
bun run episodes check [file…]     # validate: staging, marks, vocabulary, line length; plus craft warnings
bun run episodes read <file>       # the episode as a screenplay, with laugh counts, for table reads
bun run episodes fmt [file…]       # canonical layout: one beat per line
```

`bun test` validates every episode and checks camera coverage for each of its scenes.

## How it works

- **The script language** (`src/script/types.ts`): a scene is a cast placement plus a list of beats:
  `say`, `narrate` (Future Ted), `move`, `enter`, `exit`, `act` (gestures like `high_five`, `slap`, `suit_up`),
  `hold` / `give` (props), `laugh` (chuckle / laugh / big / ooh / aww / woo / applause / gasp), `pause`, `freeze`,
  `insert`, `cutaway` and `montage`. A `say` can carry a `delivery` (whisper / shout / sing / deadpan / fast / slow),
  be `interrupted`, have a `chorus` saying it with them, and carry listener `react`ions; most beats take a `shot`.
  See [Staging devices](#staging-devices).
- **The kids** (`src/world/sets/future.ts`): every episode opens on Penny and Luke on the black Chesterfield in Ted's
  2030 living room while Future Ted narrates the cold open. Penny and Luke never appear in the story: any `say`/`act`
  beat of theirs hard-cuts to the couch (along with Future Ted's answer) and then straight back to the scene.
- **The main titles** (`src/show/mainTitles.ts`): a twelve-second edit of six candid bar photographs, with close-ups,
  pairs and the whole gang. The white, loosely stacked serif name appears over the second photo; made-up creators
  (sound-alikes of the real ones) appear over the last group portrait. Gentle pans and quick blurred changes follow an original synthesized power-pop
  theme. Photos are captured from the procedural cast at higher resolution with a warm film grade; no show footage is
  bundled. Pausing freezes the edit, skipping clears the photos and music, and reduced motion uses stationary cuts.
  Made-up cast names (`src/show/credits.ts`), each a sound-alike of the original billing, roll over the first scene.
  See [the visual references](docs/intro-reference.md).
- **Closing credits** (`src/show/credits.ts`): four short, lowercase white-on-black crew cards over a twelve-second
  reprise of the original theme. Fictional crew names echo the show's billing; the creator aliases match the opening.
  There is no episode title, number or closing slogan. The cards pause and skip with playback.
  See [the closing-credit references](docs/closing-credits-reference.md).
- **The episodes** (`episodes/`, `src/script/`): each file holds a title, logline, Future Ted cold open, the kids'
  reaction, guest stars and 3–4 staged scenes. The show bible (`bible.ts`) holds the characters, catchphrases, every
  set's marks and the stagecraft vocabulary. The validator (`validate.ts`) replays each scene's blocking to check that
  everyone who speaks is on stage, marks exist and aren't double-booked, and that nobody slides through a limo partition.
  The app bundles the files at build time (`catalog.ts`).
- **The stage** (`src/world/`, `src/show/`): procedural low-poly characters (no model files) with walk/sit/talk
  animation (including sitting cross-legged or slouched), facial expressions and gestures; sets with named marks and a tiny nav graph; a director that cuts between
  wides, close-ups, two-shots and over-the-shoulders while avoiding occluded angles. The limo and the cab are `seated`
  sets: the city scrolls past outside, and people slide between seats and climb in and out instead of walking.
- **The look** (`src/engine/renderer.ts`): renders at ~270p, then applies depth-based ink outlines, posterize + Bayer
  dithering, chromatic aberration, scanlines, grain and vignette. Toggle/tune under *picture & sound*.
- **Scene transitions**: quick cuts, moving day/night Manhattan skyline shots, destination exteriors with passing
  cabs, and an optional short rewind cue for narrated flashbacks. An opening Future Ted line can play over the city.
  Each scene can choose `cut`, `skyline`, `exterior`, or `rewind`; unannotated scenes
  choose automatically from changes in time and location. Transitions pause and skip with playback; reduced-motion
  preferences disable camera drift and the rewind blur. All scenery and sounds are procedural.
  The pacing and musical punctuation draw on [Pamela Fryman's DGA interview](https://www.dga.org/craft/dgaq/issues/1001-spring-2010/profile-pamela-fryman)
  and [composer John Swihart's interview](https://goseetalk.com/interview-film-and-tv-composer-john-swihart/);
  these are original stylized interpretations, not recreations of specific shots or cues.
- **The sound** (`src/audio/`): every laugh is ~10–40 formant-filtered synthetic "ha-ha" voices in a reverb;
  applause, slaps, the guitar stings (Karplus–Strong) and bar ambience are synthesized too. Voices use the browser's
  speech synthesis; Chrome/Edge on macOS or Windows have the best voice selection.

Debug handle in the console: `himyllm` (`stage`, `director`, `player`, `audio`, …).

## Guest stars, cutaways and delivery

Episodes use all of these through the episode file format (see `bun run bible`):

- **Guest stars**: an episode can cast up to three one-off characters (Ted's date, a mark, a bouncer) in plain
  words: gender, height, build, skin, hair, clothes, accessories, voice pitch and pace. They take the slots `guest1`–`guest3`
  for that episode only (`src/world/guests.ts` turns the description into a procedural look and voice); scenes can
  also refer to them by name.
- **Cutaways**: a `cutaway` beat leaves the scene for a few beats on any set, with its own cast and an on-screen card,
  then returns to exactly where the scene left off. `imagined` (a fantasy or hypothetical) dissolves in on a harp run
  with a soft, hazy look; `flashback` uses the rewind smear and a faded sepia grade.
- **Delivery**: whispers, shouts, sung lines (with a little guitar), deadpan, fast and slow lines change the voice, the
  caption and the coverage (a whisper favors the two-shot, a shout the close-up). An `interrupted` line is cut off
  mid-word and the next speaker jumps straight in.

The four original episodes (S10E01–S10E04) each cast their own guest stars and cut away at least once. Three more
(S10E05–S10E07) feature the expanded recurring cast. **The High Score** (S10E08) visits the six new city and period sets.

| Episode | Guest stars | Cutaways | Sets |
| --- | --- | --- | --- |
| **The Understudy** | Gordon, the actor Barney hires to be Barney | How Barney imagined it (Barney's office) | MacLaren's, Barney's office |
| **The Silent Auction** | Delphine, the PTA president; Rusty, the auctioneer | How Marshall imagined it; St. Cloud, 1985 | store, restaurant, apartment |
| **The Correction** | Margo, the producer; Hector, the silent camera operator | How Kevin pictured it (lecture hall) | Metro News One, Barney's limo (with a rewind) |
| **The Guest Lecture** | Ingrid Solberg, Ted's hero; Wade, his keenest student | College, 1996 (Wesleyan dorm) | roof, lecture hall, limo |
| **The Family Fine Print** | Mickey, Loretta and Virginia | Earlier that afternoon at Barney's | apartment, restaurant |
| **The Committee** | Stella, Zoey and Nora | Ted imagines a seating lecture | restaurant, MacLaren's |
| **The Reunion Tape** | Hammond, Punchy and Robin Sparkles | Canada, 1993 — a retail promotion | lecture hall, MacLaren's, store |
| **The High Score** | Denise, a laser-tag referee | College, 1996; Canada, 1990 | subway, laser tag, Wesleyan dorm, Canadian mall, hospital, elevator |

In dev mode, skip episodes to reach the others, or open `/?ep=S10E02`.

## Staging devices

The show's signature visual gags, all part of the episode file format (`bun run bible` documents them, `bun run episodes check` validates them):

- **Inserts**: a full-screen card of the thing itself. `text` (a thread on someone's phone, theirs on the right),
  `chart` (an easel chart in marker: bar, line or pie), `slides` (a slideshow slide), `sign` (a taped-up note) and
  `playbook` (a page of the Playbook). Bubbles, bars and bullets come in one at a time; the owner (or Future Ted)
  can read a `line` over it, and a `react` cuts back to the room.
- **Group lines and reactions**: `chorus: [...]` on a `say` has everyone else in it say the line at once (Penny and
  Luke can too, on the couch), captioned "Ted & Marshall" or "Everyone". `react` on a line or insert cuts to the listeners when it lands:
  one face cheated toward the lens, a two-shot, the whole booth, or quick cuts face to face when they're spread
  around the room. A reaction can be a gesture, so a whole table can do a spit take.
- **Freeze frames**: Future Ted narrates over a held, slightly drained frame, optionally caught mid-gesture.
- **Montages**: two to six one- or two-beat shots on any sets, each with a small yellow card ("Day 2"), over an
  upbeat or tender music bed; then back to the scene exactly as it was.
- **Props**: `hold` / `give` with a phone, ring box, envelope, beer, scotch, flowers, book, yellow umbrella,
  pineapple, goat, gift, sword, briefcase, microphone or blue French horn (`src/world/props.ts`). Small ones are held
  up in the hand, a briefcase or umbrella hangs at the side, big ones are cradled in both arms. Handing one over
  walks over first if needed; props survive cutaways and montages.
- **Camera intent**: `shot: closeup | two | push_in | wide` on a beat overrides the director's pick. A push-in starts
  from a medium shot and dollies in for several seconds.
- **Gestures**: on top of the originals, `kiss` (with someone, or blown), `phone_call` (held for the whole line),
  `sit` / `stand` (into the nearest free seat, or up into the aisle), `lean_in`, `jaw_drop`, `fist_bump` and
  `spit_take` (with a spray of droplets).
- **Wardrobe**: `wardrobe` on an episode (all episode) or a scene (over the episode's), in the guest-star
  vocabulary: top style and colors, tie, waistcoat, pants, shoes, boots, hair and extras. Costumes go over casual
  or work clothes, so Ted's red cowboy boots stay on when he suits up at the lecture hall.

The first four episodes use all of it: **The Understudy** a Playbook page, a group line, a jaw drop, a hand-off, Barney in
sweatpants, a spit take and a freeze frame; **The Silent Auction** a text thread, a montage, a bar chart and the
kids' line in unison; **The Correction** a push-in, a kiss in the limo, a sign, a phone call, a line chart and a fist
bump; **The Guest Lecture** Ted's red boots, a slideshow, a fist bump, standing up and the room's reaction.

## Recurring cast and wardrobe references

Loretta Stinson, Mickey Aldrin, Hammond Druthers, Stella Zinman, Zoey Pierson, Nora, Virginia Mosby,
Punchy and Robin Sparkles are also fully cast, with characteristic clothing, voices and writer guidance.
They appear in S10E05–S10E07. See [their inspected references and wardrobe notes](docs/cast-reference.md).


Sandy Rivers, Arthur Hobbs, Brad, Victoria, Quinn, Kevin, Judy Eriksen and Scooter are available to the
show bible and director. Each has a distinct procedural model,
voice profile, caption color and show-bible entry. Between them, the Season 10 episodes
give all eight a scene: Arthur and Quinn in **The Understudy**, Judy, Scooter and Victoria in **The Silent Auction**,
Sandy and Kevin in **The Correction**, and Brad in **The Guest Lecture**.

Their default outfits are stylized interpretations of these inspected episode stills. Heights and facial
proportions are artistic approximations; voices use browser TTS. No photographs are bundled or loaded at runtime.

| Character | Visual reference and modeled outfit |
| --- | --- |
| Sandy Rivers / Alexis Denisof | [“Come On” news-desk still](https://www.imdb.com/title/tt0774239/characters/nm0219206): swept brown hair, gray suit, pink shirt with white collar, patterned lavender tie and pocket square. |
| Arthur Hobbs / Bob Odenkirk | [Conference-room still](https://animatedtimes.com/lesser-known-connection-between-how-i-met-your-mother-and-breaking-bad/): receding brown hair, charcoal suit, lavender shirt and purple patterned tie. |
| Brad Morris / Joe Manganiello | [“Twelve Horny Women” courtroom still](https://www.imdb.com/media/rm1477947136/tt0460649): tall, broad build, dark hair and beard, dark suit, gray shirt and striped tie. |
| Victoria / Ashley Williams | [Architect’s Ball still](https://www.looper.com/1243957/himym-theory-suggests-ted-victoria-run-in-no-coincidence/): brunette updo, plum sleeveless dress with shoulder ruffles and drop earrings. |
| Quinn Garvey / Becki Newton | [“The Pre-Nup” conference-room still](https://www.looper.com/753737/its-time-to-talk-about-quinn-from-how-i-met-your-mother/): long blonde waves, burgundy leather jacket, black top and dark jeans. |
| Kevin / Kal Penn | [“Mystery vs. History” painting still](https://www.imdb.com/title/tt2072524/): short black hair, purple V-neck over a white crew-neck tee and gray jeans. |
| Judy Eriksen / Suzie Plakson | [HIMYM still on Plakson’s own acting page](https://suzieplakson.com/acting/) ([photo](https://suzieplakson.com/wp-content/uploads/2018/01/plakson3-2.jpg)): tall build, full auburn curls, pale yellow turtleneck and cream printed kitchen apron. The procedural print uses original kitchenware and fruit motifs. |
| Scooter / David Burtka | [“Something Borrowed” episode still](https://www.apps.disneyplus.com/ph/shows/how-i-met-your-mother/8323/something-borrowed/1770001357/watch): tousled brown hair, brown suit, ivory shirt and red diamond-pattern tie. |

## Public sets and visual references

`metro_news_one`, `store`, `restaurant`, and `lecture_hall` are available to every episode,
with named marks, navigation, camera coverage, background occupants, day/night lighting, and their own exteriors.
The Season 10 episodes visit all four: **The Silent Auction** the store and restaurant, **The Correction** Metro News One
(and the lecture hall in a cutaway), and **The Guest Lecture** the lecture hall.

The show-specific sets use these online visual references:

- **MacLaren's / apartment exterior**: the [on-screen pub facade](https://media.decorsed.com/file/decorsed/howimetyourmother/maclarens-pub-exterior.jpg)
  and [“Come On” episode still](https://www.imdb.com/title/tt0774239/mediaindex/).
  One shared pale-brick building has the sunken pub entrance, green railing and illuminated sign,
  with the apartment's tall stone stoop and paneled doorway beside it. An `exterior` transition to
  `maclarens` frames the pub; one to `apartment` frames the residential entrance.
  See [reference details](docs/maclarens-reference.md#shared-pub-and-apartment-exterior).
- **Metro News One**: [Robin at the anchor desk in “Come On” (S01E22)](https://www.imdb.com/title/tt0774239/)
  ([reference still](https://m.media-amazon.com/images/M/MV5BZDM2MDFhY2MtZDUzMi00NTE4LWFmNzQtMTE5YmRmNjQ3ZmQ4XkEyXkFqcGc%40._V1_.jpg)).
  Dusk Manhattan backdrop, warm wood trim, dark desk, red mugs, and blue/yellow station branding.
- **Ted's lecture hall**: [“Definitions” classroom still in TVLine's episode gallery](https://www.tvline.com/gallery/farewell-how-i-met-your-mother-13-clue-filled-episodes-to-watch-before-the-final-season/)
  ([tiered seating](https://www.tvline.com/tvline/gallery/farewell-how-i-met-your-mother-13-clue-filled-episodes-to-watch-before-the-final-season/how-i-met-your-mother-episodes-21.jpg))
  and [Prime Video's Season 5 imagery](https://www.primevideo.com/detail/How-I-Met-Your-Mother/0P557GI6F8MMATTJJ6RFJMCRWP)
  ([chalkboard still](https://m.media-amazon.com/images/S/pv-target-images/6454f55bb1ecf5d61dc284c210a45d996a20cd9dbf223027815bfe058a434c0f.jpg)).
  Dark chalkboards, cream walls, wood paneling, a lectern, and banked student seating.
- **Lecture-hall exterior**: Columbia's Low Memorial Library, viewed from South Lawn, based on the
  supplied photograph and [Columbia's architectural reference](https://news.columbia.edu/news/six-secrets-low-library)
  and [campus photograph](https://president.columbia.edu/news/sharing-update-our-leadership-structure).
  A shallow granite dome, semicircular window, ten-column portico, Low Steps, Alma Mater, campus lamps,
  trees and students on the lawn replace the generic street frontage. The dedicated campus establishing
  shot has a gentle forward drift and day/night lighting, without the avenue's traffic or neighboring towers.

These are original procedural interpretations. Reference images are not bundled or fetched by the app;
the store, restaurant, and other destination exteriors are generic original designs.

## City interiors and period flashbacks

Six more procedural sets are available in the show bible, episode validator and player:

| Location ID | Set details |
| --- | --- |
| `subway` | NYC subway car: orange/yellow molded benches, steel grab poles, route map and sliding doors. |
| `laser_tag` | Blacklight arena: cyan/pink bases, low cover, barrels, vest rack and scoreboard. |
| `wesleyan_dorm` | **College, 1996**: Wesleyan bunks, plaid blankets, CRT computer, cassette stereo, posters, records and pizza. |
| `hospital` | Waiting room: teal chairs, magazines, reception, ward door and coffee machine. |
| `elevator` | Wood-paneled cabin: steel doors, floor buttons, indicator and handrails. |
| `canadian_mall` | **Canada, 1990**: pastel storefronts, record shop, tiled atrium, planters, Canadian flag and Robin Sparkles performance dais. |

All have named marks, connected walking routes and authored wide shots, with one-sided reverse backdrops
for dialogue coverage. Their master cameras sit near eye level with tighter framing; the subway adds
bench-and-aisle group angles, and the elevator has a compact cabin. Generated two-shots have distance
limits so conversations across a room cut to singles instead of shrinking the actors into the set.
These interiors default to direct cuts instead of an unrelated Manhattan exterior.
The eighth episode, **The High Score** (S10E08), visits the subway, arena, hospital and elevator and cuts away
to both period sets. **The Guest Lecture** now uses the actual Wesleyan dorm for its college memory.
The mall flashback uses the `robin_sparkles` persona and wardrobe from the expanded cast, returning to `robin`
after the cutaway. The mall follows the requested 1990 art direction.

Visual references used for the original geometry (no reference photos are loaded by the app):

- [Ted and Marshall's college gaming still](https://whatculture.com/tv/how-i-met-your-mother-how-well-do-you-know-ted-and-marshalls-friendship?page=4): metal bunks, plaid bedding and student-room clutter.
- [College dorm still with Karen](https://www.looper.com/2037563/how-i-met-your-mother-worst-characters-ranked/): wall posters and the lower bunk as seating.
- [CBS's Robin Sparkles video](https://www.youtube.com/watch?v=9mJAsgIIfNM) and [Pamela Fryman's scene gallery](https://www.tvline.com/gallery/farewell-himym-director-pamela-fryman-relives-robin-sparkles-stinging-slaps-and-more/): pastel shops, tiled atrium and performance area.
- [R62 subway interior](https://commons.wikimedia.org/wiki/File:Interior_of_R62_Subway.jpg): orange/yellow seats, metal handrails, maps and signage.
- [“Zip, Zip, Zip” laser-tag scene](https://www.imdb.com/title/tt0606119/): fluorescent arena colors and industrial barrels.

The hospital and elevator are original generic interiors.
