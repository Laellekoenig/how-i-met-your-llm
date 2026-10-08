# how i met your LLM

An endless, AI-generated *How I Met Your Mother*–style sitcom in the browser, in the spirit of *Nothing, Forever*.
Low-poly puppets perform pre-written episodes, written by AI agents, on twenty-three sets (MacLaren's, the apartment,
Barney's place, the roof, Barney's office, a generic office, Metro News One, a neighborhood store, a restaurant,
Ted's lecture hall, an ordinary car, Barney's limo, a cab, the subway, a laser-tag arena, a Wesleyan dorm, a hospital waiting room,
an elevator, a Canadian mall, MacLaren’s sidewalk, the Hoser Hut, a courtroom, an Atlantic City casino,
and the Lusty Leopard), framed by Future Ted telling
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
The [story-structure reference](docs/story-structure-reference.md) documents how the original show varies its
openings and narration. Writers choose the opening, any kid reaction and the ending for each story, then compare
those choices across a batch. A couch appearance or final Future Ted moral is optional.

The writers' tools, which work just as well by hand:

```sh
bun run bible                      # the show bible: characters, every set's marks, the episode file format
bun run episodes list              # what has aired, and the next free code
bun run episodes check [file…]     # validate: staging, marks, vocabulary, line length; plus craft warnings
bun run episodes read <file>       # the episode as a screenplay, with laugh counts, for table reads
bun run episodes fmt [file…]       # canonical layout: one beat per line
bun run episodes ledger            # continuity: eras, what's true now, bets and promises still open
```

`bun test` validates every episode and checks camera coverage for each of its scenes.
`episodes check` also reports spoken beats under music and the longest continuous run. Heavy coverage gets
a craft warning, not an error. `episodes read` lists each cue's entry, exit and scene span, expanding replays
and following scene carryover. These are static line counts, not percentages of playback time.

## How it works

- **The script language** (`src/script/types.ts`): a scene is a cast placement plus a list of beats:
  `say`, `narrate` (Future Ted), `move`, `enter`, `exit`, `act` (gestures like `high_five`, `slap`, `suit_up`),
  `hold` / `give` (props), `laugh` (chuckle / laugh / big / ooh / aww / applause / gasp), `pause`, `freeze`,
  `insert`, `cutaway`, `replay`, `split`, `montage`, `sound` and `score`. A `say` can carry a `delivery`
  (whisper / shout / sing / deadpan / fast / slow), be `interrupted` or `offscreen`, have a `chorus` saying it with
  them, and carry listener `react`ions; most beats take a `shot`. Scenes can be named and `resume`d (intercutting).
  See [Staging devices](#staging-devices) and [Time, memory and the edit](#time-memory-and-the-edit).
- **The kids** (`src/world/sets/future.ts`): episodes can open on Penny and Luke on the black Chesterfield in Ted's
  2030 living room, or directly on the story. Their couch scenes were recorded before the series was filmed, so
  they barely talk: Future Ted does, and the kids only have a fixed reel of stock reactions (`KID_TAKES` in
  `src/script/types.ts`: "What?!", "Ew!", "Is this going to take long?", an eye roll...), each played the same way
  every time. Penny and Luke never appear in the story: any `say`/`act`
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
- **The episodes** (`episodes/`, `src/script/`): each file holds a title, logline, optional couch opening (`coldOpen`
  and/or `couch`), guest stars and as many staged scenes as the story needs. Without a couch opening, the first scene plays before
  the main titles. Ordinary `narrate` beats play over the story; a recorded kids' reaction can be placed within scene beats.
  The show bible (`bible.ts`) holds the characters, catchphrases, every
  set's marks and the stagecraft vocabulary. The validator (`validate.ts`) replays each scene's blocking to check that
  everyone who speaks is on stage, marks exist and aren't double-booked, and that nobody slides through a limo partition.
  The app bundles the files at build time (`catalog.ts`).
- **The stage** (`src/world/`, `src/show/`): procedural low-poly characters (no model files) with walk/sit/talk
  animation (including sitting cross-legged or slouched), facial expressions and gestures; sets with named marks and a tiny nav graph; a director that cuts between
  wides, close-ups, two-shots and over-the-shoulders while avoiding occluded angles. The car, limo and cab are `seated`
  sets: the city scrolls past outside, and people slide between seats and climb in and out instead of walking.
- **The look** (`src/engine/renderer.ts`): renders at ~270p, then applies depth-based ink outlines, posterize + Bayer
  dithering, chromatic aberration, scanlines, grain and vignette. Toggle/tune under *picture & sound*.
- **Scene transitions**: quick cuts, moving day/night NYC landmark and Manhattan skyline shots, destination exteriors with passing
  cabs, and an optional short rewind cue for narrated flashbacks. An opening Future Ted line can play over the city.
  Each scene can choose `cut`, `skyline`, `exterior`, `atlantic_city`, `flatiron`, `washington_square`, `central_park`, `brooklyn_bridge`, or `rewind`; unannotated scenes
  choose automatically from changes in time and location. Transitions pause and skip with playback; reduced-motion
  preferences disable camera drift and the rewind blur. All scenery and sounds are procedural.
  The pacing and musical punctuation draw on [Pamela Fryman's DGA interview](https://www.dga.org/craft/dgaq/issues/1001-spring-2010/profile-pamela-fryman)
  and [composer John Swihart's interview](https://goseetalk.com/interview-film-and-tv-composer-john-swihart/);
  these are original stylized interpretations, not recreations of specific shots or cues.
- **The sound** (`src/audio/`): every laugh is ~10–40 formant-filtered synthetic "ha-ha" voices in a reverb;
  applause, slaps, wooden door knocks, guitar music (Karplus–Strong) and bar ambience are synthesized too. Voices use the browser's
  speech synthesis; Chrome/Edge on macOS or Windows have the best voice selection.

Debug handle in the console: `himyllm` (`stage`, `director`, `player`, `audio`, …).

## Guest stars, cutaways and delivery

Episodes use all of these through the episode file format (see `bun run bible`):

- **Guest stars**: an episode can cast up to three one-off characters (Ted's date, a mark, a bouncer) in plain
  words: gender, height, build, skin, hair, clothes, accessories, voice pitch and pace. They take the slots `guest1`–`guest3`
  for that episode only (`src/world/guests.ts` turns the description into a procedural look and voice); scenes can
  also refer to them by name.
- **Cutaways**: a `cutaway` beat leaves the scene for a sequence on any set, with its own cast, then returns to exactly
  where the scene left off. What it is (`imagined`, `prediction`, `flashback`, `flash_forward`, `meanwhile`,
  `misremembered`, `sanitized`) is separate from how it's shown: by default a clean, silent cut in normal color with no
  card; a `label`, a `look` (`dream` haze, `memory` sepia, `video` tape), a `transition` (`whip`, `ripple`, `rewind`)
  and a `sound` are each the writer's choice. Cutaways nest up to three deep.
- **Delivery**: whispers, shouts, sung lines (a cappella unless `accompanied`), deadpan, fast and slow lines change the
  voice, the caption and the coverage (a whisper favors the two-shot, a shout the close-up). An `interrupted` line is
  cut off mid-word and the next speaker jumps straight in.

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

- **Playbook inserts**: a brief full-screen card with just the play name, in script on cream inside a stepped
  double border. The explanation and reactions play back in the scene. Earlier phone, chart, slide and sign
  inserts now keep only their dialogue and reactions in the room. See [the visual reference](docs/playbook-reference.md).
- **Group lines and reactions**: `chorus: [...]` on a `say` has everyone else in it say the line at once (Penny and
  Luke can too, on the couch), captioned "Ted & Marshall" or "Everyone". `react` on a line or insert cuts to the listeners when it lands:
  one face cheated toward the lens, a two-shot, the whole booth, or quick cuts face to face when they're spread
  around the room. A reaction can be a gesture, so a whole table can do a spit take.
- **Freeze frames**: Future Ted narrates over a held, slightly drained frame, optionally caught mid-gesture.
- **Time and location labels**: large white serif lettering centered low in the picture, with a dark offset
  shadow, following the show's ["the year 2030" reference still](https://cloudfront-eu-central-1.images.arcpublishing.com/prisaradiolos40/R4HIAYJCIRMIVOMDVSQ76RV6P4.jpg).
  Scenes, flashbacks and montages share the treatment; labels lift to clear tall subtitles and scale with the picture.
- **Montages**: two to six one- or two-beat shots on any sets, each with a time/place label ("Day 2"), over an
  original music bed; then back to the scene exactly as it was. Scores and montages share ten moods:
  `upbeat`, `tender`, `tense`, `playful`, `romantic`, `melancholy`, `mysterious`, `jazzy`, `triumphant` and `dreamy`.
  They range from strummed and fingerpicked guitar to pizzicato, piano, bells, soft pads, walking bass and brass-like chords;
  each has its own harmony and rhythm. The playground's music picker and `bun run bible` describe when to use each.
- **Props**: `hold` / `give` with a phone, ring box, envelope, beer, scotch, flowers, book, yellow umbrella,
  pineapple, goat, gift, sword, briefcase, microphone, blue French horn, sandwich, laptop or videotape (`src/world/props.ts`). Small ones are held
  up in the hand, a briefcase or umbrella hangs at the side, big ones are cradled in both arms. Handing one over
  walks over first if needed; props survive cutaways and montages.
- **Camera intent**: `shot: closeup | two | push_in | wide` on a beat overrides the director's pick. A push-in starts
  from a medium shot and dollies in for several seconds.
- **Gestures**: on top of the originals, `salute`, `kiss` (with someone, or blown), `phone_call` (held for the whole line),
  `sit` / `stand` (into the nearest free seat, or up into the aisle), `lean_in`, `jaw_drop`, `fist_bump` and
  `spit_take` (with a spray of droplets).
- **Expressions**: nineteen emotions (`embarrassed`, `disgusted`, `scared`, `suspicious`, `proud`, `laughing`,
  `crying` and `drunk` on top of the originals) that show in narrowed or wide eyes, teeth, blushes, flushes and tears, and in
  the whole body: a slump, a lean, hands on hips, shoulders up round the ears. A look holds a few seconds, then
  they relax back into their own resting face (Barney's is a smirk). Eyes follow whoever they look at, mouths
  follow each line's syllables, listeners nod, and everyone has their own talking hands and habits while they
  wait (Ted's professor finger, Barney's lapels, Robin's crossed arms). Gestures `double_take`, `eye_roll`,
  `crack_up`, `sob`, `slow_clap`, `hands_on_hips`, `head_in_hands`, `air_quotes`, `fist_pump` and `cover_mouth`.
- **Wardrobe**: `wardrobe` on an episode (all episode), a scene (over the episode's), a cutaway, replay or montage
  shot (another year's look, without touching the scene around it), in the guest-star vocabulary: top style and
  colors, tie, waistcoat, pants, shoes, boots, hair and extras. Costumes go over casual or work clothes, so Ted's red
  cowboy boots stay on when he suits up at the lecture hall. A scene costume with `keep` lasts the rest of the
  episode (the lost bet).

## Time, memory and the edit

The show's rhythm comes from its edit and its unreliable narrator, so these are writer controls, not defaults:

- **Replays**: `replay` shows an earlier scene or cutaway again (by `id`), with the same blocking and camera coverage,
  and `changes` that replace, cut or insert beats, plus people revealed to have been there all along (`add`).
- **Intercutting**: a scene with `resume` picks up an earlier scene exactly as it was left (people, marks, props),
  so a story can cut between strands and come back.
- **Split screens and phone calls**: `split` puts two or three sets side by side, each framed once and held; an
  `offscreen` line is heard down the phone or from out of shot.
- **Narration over action**: `narrate` with `over` keeps Future Ted talking while the next beats (and scenes) play.
- **Sound and music**: ordinary scene changes have no automatic cue. Apartment entrances use a wooden knock;
  other doors retain their own sounds. `sound` places a cue (a knock, a shatter, a record scratch, a harp) exactly;
  `"sound": "none"` also silences a rewind transition. `score` starts underscore that carries across scenes, stops it,
  or drops to silence. Main titles clear any cold-open score before the theme. Music automatically drops by
  about 12 dB during dialogue, narration and offscreen speech, then returns smoothly after a short hold.
  Most dialogue should still be unscored; see [the music reference](docs/music-reference.md).
- **The laugh track** is restrained: no cheering or clapping at jokes, and it never changes anyone's face.
- **Continuity**: optional `continuity` notes (era, facts, threads opened and closed) feed `bun run episodes ledger`,
  which flags a fact that quietly changes between episodes.

The first four episodes use all of it: **The Understudy** a Playbook page, a group line, a jaw drop, a hand-off, Barney in
sweatpants, a spit take and a freeze frame; **The Silent Auction** a text thread, a montage, a bar chart and the
kids' line in unison; **The Correction** a push-in, a kiss in the limo, a sign, a phone call, a line chart and a fist
bump; **The Guest Lecture** Ted's red boots, a slideshow, a fist bump, standing up and the room's reaction.

## Recurring cast and wardrobe references

Ted has a tousled dark hairstyle and revised facial proportions, a navy sweater over a
checked shirt with jeans for everyday scenes, and a charcoal-navy suit with a striped red tie.
He suits up automatically at the office and lecture hall; `"outfit": "work"` on his cast entry
selects the suit anywhere. See [Ted's inspected show references](docs/cast-reference.md#ted-mosby).

Robin wears the fitted black blazer, white buttoned blouse, cuffed dark jeans and
two-tone pumps from “The Locket,” with shoulder-length side-parted waves and revised
facial proportions. See [Robin's inspected outfit reference](docs/cast-reference.md#robin-scherbatsky).

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

## More locations from the show

[Location screenshots](docs/screenshots/new-locations.jpg) · [Atlantic City transition frames](docs/screenshots/atlantic-city-transition.jpg)

Open `/?set=maclarens_sidewalk&mute` for a silent location tour. The selector visits all five additions
and the Atlantic City arrival; the camera menu includes master/conversation/reverse wides, close-ups,
two-shots and both shoulder angles. `&time=day` switches exterior lighting. These sets are available
to episode JSON through the IDs below; this addition does not change the existing episode stories.

| Location ID | References inspected | Modeled details |
| --- | --- | --- |
| `maclarens_sidewalk` | [On-screen facade](https://media.decorsed.com/file/decorsed/howimetyourmother/maclarens-pub-exterior.jpg), [“Come On” gallery](https://www.imdb.com/title/tt0774239/mediaindex/) | Reuses the existing pale-brick facade: recessed pub entrance, green rail, frosted window, raised apartment stoop, galvanized bins, autumn tree and parking meter. Actor marks stay on the sidewalk. Opposite buildings support street-facing coverage. |
| `hoser_hut` | [“Duel Citizenship” still and context](https://www.thecurlingnews.com/news/blog/how-i-met-your-mother), [location/episode guide](https://how-i-met-your-mother.fandom.com/wiki/Hoser_Hut) | Rust brick, dark timber, left-hand bar, round red stools, hockey sweaters, maple flag, mounted antlers, small tables and karaoke corner. |
| `courtroom` | [“Twelve Horny Women” gallery](https://www.imdb.com/title/tt2445770/mediaindex/), [episode synopsis](https://tv.apple.com/gb/episode/twelve-horny-women/umc.cmc.5lencmwg6xz25i3rmf2587wjd) | Tall diamond-lattice windows, square wood paneling, brass sconces, raised judge’s bench, witness box, separate counsel tables, jury box and railed gallery. Marshall wears his work suit. |
| `atlantic_city_casino` | [CBS photo of the casino scene in “The Bro Mitzvah”](https://www.cbsnews.com/news/himym-cast-opens-up-about-the-final-season/), [“Atlantic City” episode](https://www.imdb.com/title/tt0885871/) | Burgundy patterned walls, gold pilasters and marquee bulbs, upright slots, red chairs, green Xing Hai Shi Bu Xing table, chip stacks, tiles, dealer rack and peg towers. |
| `lusty_leopard` | [“Karma” episode gallery](https://www.imdb.com/title/tt2247489/mediaindex/), [episode synopsis](https://tv.apple.com/us/episode/karma/umc.cmc.5dbvr1cv8ay01icw5pwbxybzi) | Red carpet and walls, black trim with leopard-print inlays, chrome café chairs, small round tables, brass stage rail and pole, round “Girls” neon, green-backed bar shelves, sunburst mirror and beaded curtain. |

The `atlantic_city` transition establishes the ocean, boardwalk, period casino towers and Taj Mahal-style
domes. It is automatic for new casino arrivals and time changes; repeated scenes at the same time cut directly.
An explicit `transition: "atlantic_city"` also works for a limo arriving there. Existing `skyline` and `exterior`
requests for the casino use Atlantic City geography. Opening narration plays over the arrival once, with the
same pause, skip and reduced-motion handling as other establishing shots.

The coastal composition is an original interpretation, supplemented by [Gensler’s period House of Blues / Taj Mahal
architecture photographs](https://www.gensler.com/projects/house-of-blues-atlantic-city), rather than an identified
frame-for-frame episode establishing shot. Interior dimensions and unseen reverse walls are adapted for the
puppets and camera system. All geometry and textures are procedural; reference photographs are not shipped.

## NYC transition footage

`skyline` now rotates through the existing Manhattan view and four new city cutaways, so existing episodes
gain variety automatically. Destination `exterior` shots still establish the actual building. Each landmark
has two slow camera moves, day/night lighting and animated traffic, fountain spray or water where applicable.
Layered background blocks, occasional rooftop water tanks and setbacks add city detail; slightly tighter
framing reduces empty sky while keeping the landmarks prominent.
An explicit landmark transition uses the normal narration, pause, skip and reduced-motion behavior.

Preview silently with `/?set=flatiron&time=day&mute`, changing the landmark, camera angle and lighting with
the tour controls. The playground's camera panel and scene transition selector expose the same additions.

| Transition | Visual references | Procedural interpretation |
| --- | --- | --- |
| `flatiron` | The HIMYM chapter in [The Routledge Companion to Media and the City](https://dokumen.pub/the-routledge-companion-to-media-and-the-city.html) identifies Flatiron and Washington Square in “We're Not From Here”; [NYC photograph from Baruch College](https://presidentsblog.baruch.cuny.edu/appreciate-the-complexity-around-us/) | Rounded limestone wedge, cornice bands, window rows on both faces, Broadway/23rd Street signs, crosswalk and passing yellow cabs. |
| `washington_square` | Same HIMYM chapter; [NYU's park photograph](https://www.law.nyu.edu/leadershipprogram) | White triumphal arch, circular fountain, Fifth Avenue beyond, benches, globe lamps and autumn trees. |
| `central_park` | [Bow Bridge, Central Park Conservancy](https://www.centralparknyc.org/locations/bow-bridge) | Curved cream bridge and ornamental railings, lake, rowboat, autumn banks and San Remo twin towers. A broader NYC atmosphere addition, not a claimed replica of a HIMYM frame. |
| `brooklyn_bridge` | [NYC DOT's bridge reference](https://www.nyc.gov/html/dot/html/infrastructure/brooklyn-bridge.shtml), [photograph from NYU Tandon](https://engineering.nyu.edu/academics/programs/nyu-tandon-bridge/enrolled-bridge-students) | Twin Gothic tower openings, suspension and diagonal stay cables, waterfront promenade and lit skyline. A broader NYC atmosphere addition. |

The show's street-set context also comes from production designer [Stephan Olson's HIMYM portfolio](https://www.stephanolson.com/himym).
These are original stylized sets; online photographs are reference only and are not bundled.
Both camera moves for every new landmark were checked in the muted running app, in daylight and at night.
The raycast audit checks frame coverage at 0, 2 and 4 seconds; playback tests cover opening narration for all establishing transitions.
[Saved camera audit frames](docs/screenshots/nyc-transitions/) include both angles and lighting states.

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


### Car scenes

`car` is an unbranded sedan with front bucket seats and a three-person rear bench. Cast the
`driver` explicitly (there is no automatic chauffeur), then use `front_passenger`, `back_left`,
`back_middle` and `back_right`. Each row has its own entry door; everyone stays seated.

Vehicle coverage follows [the series references and episode audit](docs/car-reference.md):
locked windshield front-seat two-shots, rear-seat coverage, matching singles and separate driver
reactions. The limo uses dark leather and warm cabin light. Shoulder requests resolve to matching
singles from the vehicle's fixed mounts. Existing cab/limo stories keep their original locations.

Silent previews, including every camera and the day/night switch:
- [Ordinary car](http://localhost:5173/?set=car&time=day&mute)
- [Taxi](http://localhost:5173/?set=taxi&mute)
- [Limo](http://localhost:5173/?set=limo&mute)
