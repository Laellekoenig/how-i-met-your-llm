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

Click **tune in**. By default it's just the TV: episodes play back to back, letterboxed to 16:9 with black bars,
with no controls. Press `d` (or open `/?dev`) for **dev mode**, which brings back the transport bar and the side panel.

With no API key it plays three hand-written "reruns". In dev mode, paste an OpenRouter key in the **writers' room** panel,
pick a model, and press **start writing**: new episodes (Season 11+) air as soon as they're written. Once a key is
remembered, regular mode starts the writers on its own when you tune in.
You can also **pitch an episode** idea; the writers use the next pitch for the next episode.

Keys: `d` toggle dev mode · `f` fullscreen · dev mode only: `space` pause · `→` skip scene.

## How it works

- **The script language** (`src/script/types.ts`): a scene is a cast placement plus a list of beats:
  `say`, `narrate` (Future Ted), `move`, `enter`, `exit`, `act` (gestures like `high_five`, `slap`, `suit_up`),
  `laugh` (chuckle / laugh / big / ooh / aww / woo / applause / gasp) and `pause`.
- **The kids** (`src/world/sets/future.ts`): every episode opens on Penny and Luke on the black Chesterfield in Ted's
  2030 living room while Future Ted narrates the cold open. Penny and Luke never appear in the story: any `say`/`act`
  beat of theirs hard-cuts to the couch (along with Future Ted's answer) and then straight back to the scene.
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

## Public sets and visual references

`metro_news_one`, `store`, `restaurant`, and `lecture_hall` are available to the episode planner and scene writer,
with named marks, navigation, camera coverage, background occupants, day/night lighting, and their own exteriors.
The third offline rerun, **The Expert**, visits all four. In dev mode, skip two episodes to reach it.

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
