# how i met your LLM

An endless, AI-generated *How I Met Your Mother*–style sitcom in the browser, in the spirit of *Nothing, Forever*.
Low-poly puppets perform scripts written live by an LLM (via OpenRouter) on eight sets (MacLaren's, the apartment,
Barney's place, the roof, Barney's office, a generic office, Barney's limo and a cab), framed by Future Ted telling
the story to his bored kids on the couch in 2030, with browser TTS voices,
a synthesized laugh track, multi-camera sitcom coverage, and a crunchy pixel/dither post-process.

```sh
bun install
bun dev            # http://localhost:5173
```

Click **tune in**. By default it's just the TV: episodes play back to back, letterboxed to 16:9 with black bars,
with no controls. Press `d` (or open `/?dev`) for **dev mode**, which brings back the transport bar and the side panel.

With no API key it plays two hand-written "reruns". In dev mode, paste an OpenRouter key in the **writers' room** panel,
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
- **The sound** (`src/audio/`): every laugh is ~10–40 formant-filtered synthetic "ha-ha" voices in a reverb;
  applause, slaps, the guitar stings (Karplus–Strong) and bar ambience are synthesized too. Voices use the browser's
  speech synthesis; Chrome/Edge on macOS or Windows have the best voice selection.

Your OpenRouter key is only sent to OpenRouter, directly from your browser, and is stored in localStorage only if
"remember key" is checked.

Debug handle in the console: `himyllm` (`stage`, `director`, `player`, `writer`, …).
