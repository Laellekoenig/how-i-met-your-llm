# Project instructions

When making visual changes, capture representative screenshots of the running app and include them in the final response so the user can see the changes. Show the relevant states, such as scene transitions, rather than only describing them. Save the screenshots and embed them with Markdown image links.

Whenever a scene or its set is updated, recheck every camera angle for that scene in the running app, including wide shots, close-ups, two-shots, over-the-shoulder shots, and reverse angles where applicable. Verify framing, visibility, and clipping against the updated set, and fix any issues before considering the scene update complete.

When opening the app to test or screenshot it, add `mute` to the URL (for example `/?mute` or `/?dev&mute`) so nothing plays through the user's speakers. Automated browsers (`navigator.webdriver`) and the T3 Code preview browser are muted automatically, but pass `mute` anyway.

## Episodes

Episodes are pre-written JSON files in `episodes/` (no live generation). To write new ones, use the `/write-episodes` skill or the `episode-writer` agent. Run `bun run bible` for the show bible and file format, and `bun run episodes check` to validate. Never hand-edit an episode into a state `bun run episodes check` rejects. Preview a single episode with `/?ep=<CODE>&dev&mute`.
