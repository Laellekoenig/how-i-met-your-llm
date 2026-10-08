# Project instructions

When making visual changes, capture representative screenshots of the running app and include them in the final response so the user can see the changes. Show the relevant states, such as scene transitions, rather than only describing them. Save the screenshots and embed them with Markdown image links.

Whenever a scene or its set is updated, recheck every camera angle for that scene in the running app, including wide shots, close-ups, two-shots, over-the-shoulder shots, and reverse angles where applicable. Verify framing, visibility, and clipping against the updated set, and fix any issues before considering the scene update complete.

When opening the app to test or screenshot it, add `mute` to the URL (for example `/?mute` or `/?dev&mute`) so nothing plays through the user's speakers. Automated browsers (`navigator.webdriver`) and the T3 Code preview browser are muted automatically, but pass `mute` anyway.

## Episodes

Episodes are pre-written JSON files in `episodes/` (no live generation). To write new ones, use the `/write-episodes` skill or the `episode-writer` agent. Run `bun run bible` for the show bible and file format, and `bun run episodes check` to validate. Never hand-edit an episode into a state `bun run episodes check` rejects. Preview a single episode with `/?ep=<CODE>&dev&mute`.

## README

Keep `README.md` short and plain. Put details that only agents need here or in `docs/`. When a change alters what the gang looks like at MacLaren's (characters, faces, gestures, the set, lighting, the picture style), run `bun run screenshot` to refresh `docs/screenshot.png` and commit it. The script (`scripts/screenshot.ts`) needs a local Chrome; set `CHROME` if it isn't at the macOS default path.

## Running and debugging

- URL options: `ep=<CODE>` start an episode (skips the TV guide) · `dev` dev mode · `mute` / `sound` force silence or sound · `playground` the dev workbench · `set=<id>&time=day|night` silent set tour with every camera angle (MacLaren's, restaurant, the vehicles, the newer locations, `atlantic_city` and the NYC landmarks; see `src/ui/setPreview.ts`).
- Keys: `d` dev mode · `f` fullscreen · `esc` TV guide · dev mode only: `space` pause, `←`/`→` previous/next scene, with `shift` for episodes.
- Console handle: `himyllm` (`stage`, `director`, `renderer`, `player`, `audio`). Setting `himyllm.player.paused = true` freezes the stage and director; `director.fresh()` before a cut makes it go in immediately.
- Episode tools: `bun run episodes list | check | read <file> | fmt | ledger` (`scripts/episodes.ts`). `bun test` validates every episode and checks camera coverage.

## References

`docs/` holds the research behind the show: story structure, music, cast and set references, intro and credits, and camera audits. Set and transition sources are in `docs/set-reference.md`; character sources in `docs/cast-reference.md`. Reference photos are never bundled or fetched by the app.
