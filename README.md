# how i met your LLM

An endless, AI-generated *How I Met Your Mother*–style sitcom in the browser, in the spirit of *Nothing, Forever*.
Low-poly puppets perform scripts written live by an LLM (via OpenRouter) on twelve sets (MacLaren's, the apartment,
Barney's place, the roof, Barney's office, a generic office, Metro News One, a neighborhood store, a restaurant,
Ted's lecture hall, Barney's limo and a cab), framed by Future Ted telling
the story to his bored kids on the couch in 2030, with browser TTS voices,
a synthesized laugh track, multi-camera sitcom coverage, and a crunchy pixel/dither post-process.

```sh
bun install
bun dev            # http://localhost:5173
```

The show starts as soon as the page loads. By default it's just the TV: episodes play back to back, letterboxed to 16:9 with black bars,
with no controls. Browsers may hold the sound back until you first click or press a key on the page. Press `d` (or open `/?dev`) for **dev mode**, which brings back the transport bar and the side panel.
Add `mute` (`/?mute`, `/?dev&mute`) to play everything silently. Automated browsers (`navigator.webdriver`) and
the T3 Code preview browser are muted automatically, so agents testing the show stay quiet; `?sound` overrides that.

With no API key it plays seven hand-written "reruns". In dev mode, paste an OpenRouter key in the **writers' room** panel,
pick a model, and press **start writing**: new episodes (Season 11+) air as soon as they're written. Once a key is
remembered, regular mode starts the writers on its own when the page loads.

Keys: `d` toggle dev mode · `f` fullscreen · dev mode only: `space` pause · `→` skip scene.

## How it works

- **The script language** (`src/script/types.ts`): a scene is a cast placement plus a list of beats:
  `say`, `narrate` (Future Ted), `move`, `enter`, `exit`, `act` (gestures like `high_five`, `slap`, `suit_up`),
  `laugh` (chuckle / laugh / big / ooh / aww / woo / applause / gasp), `pause` and `cutaway`.
  A `say` can carry a `delivery` (whisper / shout / sing / deadpan / fast / slow) and be `interrupted`.
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
- **The writers' room** (`src/llm/`): two tool calls. `plan_episode` pitches a title, logline, Future Ted cold open and
  3–4 scene outlines; `write_scene` stages one scene at a time with the episode so far as context. The system prompt
  (`prompts.ts`) is the show bible: characters, catchphrases, every set's marks, and the stagecraft vocabulary.
  LLM output is coerced into valid beats by `normalize.ts`. The writer stays ~2 scenes ahead of playback, so spend is
  bounded by how fast the show airs. Recent episode titles are kept in localStorage to avoid repeats.
- **The stage** (`src/world/`, `src/show/`): procedural low-poly characters (no model files) with walk/sit/talk
  animation (including sitting cross-legged or slouched), facial expressions and gestures; sets with named marks and a tiny nav graph; a director that cuts between
  wides, close-ups, two-shots and over-the-shoulders while avoiding occluded angles. The limo and the cab are `seated`
  sets: the city scrolls past outside, and people slide between seats and climb in and out instead of walking.
- **The look** (`src/engine/renderer.ts`): renders at ~270p, then applies depth-based ink outlines, posterize + Bayer
  dithering, chromatic aberration, scanlines, grain and vignette. Toggle/tune under *picture & sound*.
- **Scene transitions**: quick cuts, moving day/night Manhattan skyline shots, destination exteriors with passing
  cabs, and an optional short rewind cue for narrated flashbacks. An opening Future Ted line can play over the city.
  Both the episode planner and scene writer can choose `cut`, `skyline`, `exterior`, or `rewind`; unannotated scripts
  choose automatically from changes in time and location. Transitions pause and skip with playback; reduced-motion
  preferences disable camera drift and the rewind blur. All scenery and sounds are procedural.
  The pacing and musical punctuation draw on [Pamela Fryman's DGA interview](https://www.dga.org/craft/dgaq/issues/1001-spring-2010/profile-pamela-fryman)
  and [composer John Swihart's interview](https://goseetalk.com/interview-film-and-tv-composer-john-swihart/);
  these are original stylized interpretations, not recreations of specific shots or cues.
- **The sound** (`src/audio/`): every laugh is ~10–40 formant-filtered synthetic "ha-ha" voices in a reverb;
  applause, slaps, the guitar stings (Karplus–Strong) and bar ambience are synthesized too. Voices use the browser's
  speech synthesis; Chrome/Edge on macOS or Windows have the best voice selection.

Your OpenRouter key is only sent to OpenRouter, directly from your browser, and is stored in localStorage only if
"remember key" is checked.

Debug handle in the console: `himyllm` (`stage`, `director`, `player`, `writer`, …).

## Guest stars, cutaways and delivery

Everything here is written by the model through the same two tool calls, and is coerced by `normalize.ts`:

- **Guest stars**: `plan_episode` can cast up to three one-off characters (Ted's date, a mark, a bouncer) in plain
  words: gender, height, build, skin, hair, clothes, accessories, voice pitch and pace. They take the slots `guest1`–`guest3`
  for that episode only (`src/world/guests.ts` turns the description into a procedural look and voice); scenes can
  also refer to them by name.
- **Cutaways**: a `cutaway` beat leaves the scene for a few beats on any set, with its own cast and an on-screen card,
  then returns to exactly where the scene left off. `imagined` (a fantasy or hypothetical) dissolves in on a harp run
  with a soft, hazy look; `flashback` uses the rewind smear and a faded sepia grade.
- **Delivery**: whispers, shouts, sung lines (with a little guitar), deadpan, fast and slow lines change the voice, the
  caption and the coverage (a whisper favors the two-shot, a shout the close-up). An `interrupted` line is cut off
  mid-word and the next speaker jumps straight in.

The original four offline reruns each cast one-off guests and cut away at least once. Three more feature the expanded recurring cast.

| Rerun | Guest stars | Cutaways | Sets |
| --- | --- | --- | --- |
| **The Understudy** | Gordon, the actor Barney hires to be Barney | How Barney imagined it (Barney's office) | MacLaren's, Barney's office |
| **The Silent Auction** | Delphine, the PTA president; Rusty, the auctioneer | How Marshall imagined it; St. Cloud, 1985 | store, restaurant, apartment |
| **The Correction** | Margo, the producer; Hector, the silent camera operator | How Kevin pictured it (lecture hall) | Metro News One, Barney's limo (with a rewind) |
| **The Guest Lecture** | Ingrid Solberg, Ted's hero; Wade, his keenest student | Wesleyan, 1997 | roof, lecture hall, limo |
| **The Family Fine Print** | Mickey, Loretta and Virginia | Earlier that afternoon at Barney's | apartment, restaurant |
| **The Committee** | Stella, Zoey and Nora | Ted imagines a seating lecture | restaurant, MacLaren's |
| **The Reunion Tape** | Hammond, Punchy and Robin Sparkles | Canada, 1993 — a retail promotion | lecture hall, MacLaren's, store |

In dev mode, skip episodes from the first rerun to reach the others.

## Recurring cast and wardrobe references

Loretta Stinson, Mickey Aldrin, Hammond Druthers, Stella Zinman, Zoey Pierson, Nora, Virginia Mosby,
Punchy and Robin Sparkles are also fully cast, with characteristic clothing, voice auditions and writer guidance.
They appear in three additional offline reruns. See [their inspected references and wardrobe notes](docs/cast-reference.md).


Sandy Rivers, Arthur Hobbs, Brad, Victoria, Quinn, Kevin, Judy Eriksen and Scooter are available to the
episode planner, scene writer, director and voice-casting panel. Each has a distinct procedural model,
voice profile, caption color and show-bible entry. Between them, the offline reruns
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

`metro_news_one`, `store`, `restaurant`, and `lecture_hall` are available to the episode planner and scene writer,
with named marks, navigation, camera coverage, background occupants, day/night lighting, and their own exteriors.
The offline reruns visit all four: **The Silent Auction** the store and restaurant, **The Correction** Metro News One
(and the lecture hall in a cutaway), and **The Guest Lecture** the lecture hall.

The two show-specific interiors use these online visual references:

- **Metro News One**: [Robin at the anchor desk in “Come On” (S01E22)](https://www.imdb.com/title/tt0774239/)
  ([reference still](https://m.media-amazon.com/images/M/MV5BZDM2MDFhY2MtZDUzMi00NTE4LWFmNzQtMTE5YmRmNjQ3ZmQ4XkEyXkFqcGc%40._V1_.jpg)).
  Dusk Manhattan backdrop, warm wood trim, dark desk, red mugs, and blue/yellow station branding.
- **Ted's lecture hall**: [“Definitions” classroom still in TVLine's episode gallery](https://www.tvline.com/gallery/farewell-how-i-met-your-mother-13-clue-filled-episodes-to-watch-before-the-final-season/)
  ([tiered seating](https://www.tvline.com/tvline/gallery/farewell-how-i-met-your-mother-13-clue-filled-episodes-to-watch-before-the-final-season/how-i-met-your-mother-episodes-21.jpg))
  and [Prime Video's Season 5 imagery](https://www.primevideo.com/detail/How-I-Met-Your-Mother/0P557GI6F8MMATTJJ6RFJMCRWP)
  ([chalkboard still](https://m.media-amazon.com/images/S/pv-target-images/6454f55bb1ecf5d61dc284c210a45d996a20cd9dbf223027815bfe058a434c0f.jpg)).
  Dark chalkboards, cream walls, wood paneling, a lectern, and banked student seating.

These are original procedural interpretations. Reference images are not bundled or fetched by the app;
the store, restaurant, and destination exteriors are generic original designs.
