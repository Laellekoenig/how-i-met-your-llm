# how i met your LLM

An endless, AI-generated *How I Met Your Mother*–style sitcom in the browser, in the spirit of *Nothing, Forever*.
Low-poly puppets perform scripts written live by an LLM (via OpenRouter) on three sets, with browser TTS voices,
a synthesized laugh track, multi-camera sitcom coverage, and a crunchy pixel/dither post-process.

```sh
npm install
npm run dev        # http://localhost:5173
```

Click **tune in**. With no API key it plays two hand-written "reruns". Paste an OpenRouter key in the
**writers' room** panel, pick a model, and press **start writing**: new episodes (Season 11+) air as soon as they're written.
You can also **pitch an episode** idea; the writers use the next pitch for the next episode.

Keys: `space` pause · `→` skip scene · `f` fullscreen.

## How it works

- **The script language** (`src/script/types.ts`): a scene is a cast placement plus a list of beats:
  `say`, `narrate` (Future Ted), `move`, `enter`, `exit`, `act` (gestures like `high_five`, `slap`, `suit_up`),
  `laugh` (chuckle / laugh / big / ooh / aww / woo / applause / gasp) and `pause`.
- **The writers' room** (`src/llm/`): two tool calls. `plan_episode` pitches a title, logline, Future Ted cold open and
  3–4 scene outlines; `write_scene` stages one scene at a time with the episode so far as context. The system prompt
  (`prompts.ts`) is the show bible: characters, catchphrases, every set's marks, and the stagecraft vocabulary.
  LLM output is coerced into valid beats by `normalize.ts`. The writer stays ~2 scenes ahead of playback, so spend is
  bounded by how fast the show airs. Recent episode titles are kept in localStorage to avoid repeats.
- **The stage** (`src/world/`, `src/show/`): procedural low-poly characters (no model files) with walk/sit/talk
  animation, facial expressions and gestures; sets with named marks and a tiny nav graph; a director that cuts between
  wides, close-ups, two-shots and over-the-shoulders while avoiding occluded angles.
- **The look** (`src/engine/renderer.ts`): renders at ~270p, then applies depth-based ink outlines, posterize + Bayer
  dithering, chromatic aberration, scanlines, grain and vignette. Toggle/tune under *picture & sound*.
- **The sound** (`src/audio/`): every laugh is ~10–40 formant-filtered synthetic "ha-ha" voices in a reverb;
  applause, slaps, the guitar stings (Karplus–Strong) and bar ambience are synthesized too. Voices use the browser's
  speech synthesis; Chrome/Edge on macOS or Windows have the best voice selection.

Your OpenRouter key is only sent to OpenRouter, directly from your browser, and is stored in localStorage only if
"remember key" is checked.

Debug handle in the console: `himyllm` (`stage`, `director`, `player`, `writer`, …).
