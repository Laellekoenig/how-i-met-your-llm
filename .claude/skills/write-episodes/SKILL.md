---
name: write-episodes
description: Write new episodes of How I Met Your LLM. Runs a quick pitch session, then launches episode-writer agents in parallel, one per episode, and checks their work. Use when asked to write, generate or add episodes. Args: a count ("3"), pitches ("Barney gets banned from Costco; Robin's hockey team"), or both.
---

# Write episodes

Episodes are pre-written JSON files in `episodes/` that air in code order on a loop. Each one is written by an
`episode-writer` agent (`.claude/agents/episode-writer.md`), which holds the craft guide. Your job is showrunner:
pick the stories, hand them out, and hold the bar.

## 1. Pitch session

Run `bun run episodes list` to see what has aired and the next free code. Work out how many episodes to write: the
number in the args, one per pitch given, or 1 if the args say neither.

For each episode you'll write, settle on a premise. Use the user's pitches as given. For any others, brainstorm
about twice as many as you need and keep the strongest and most varied set. Vary which character leads the A-story,
the sets, the guest stars and the kind of comic engine (a scheme, a rule, a bet, a secret, a misunderstanding).
Favor characters and sets the catalog has used least. Assign consecutive codes starting at the next free one.

## 2. Writers' room

Launch one `episode-writer` agent per episode, all in the same message so they run in parallel. Give each one:
- its code, and the exact file name pattern `episodes/<code lowercased>-<slug>.json`
- its premise (the pitch, a logline, or just a lead character and an engine; leave the writer room to find the story)
- any characters or sets to feature
- one line on each of the *other* episodes being written now, so they don't overlap

## 3. Notes and sign-off

When the writers report back:
1. Run `bun run episodes check` (all episodes) and `bun test`. Every episode must have 0 errors and the tests must pass.
2. Read each new episode with `bun run episodes read <file>`. Hold it to the bar: a real story, character-specific
   jokes, every scene ending on a button, a heart beat, and a strong final Future Ted line. If an episode falls short,
   send its writer specific notes with SendMessage, for example "scene 2 sags in the middle; Robin has nothing to
   play; the runner never pays off". Then re-check.
3. Watch at least one new episode in the running app (`bun dev`, then open `/?ep=<CODE>&dev&mute`) and take
   screenshots of a couple of scenes. Per the project rules, check the framing in each scene.
4. Report each new episode to the user: code, title, logline and a favorite line. Don't commit unless asked.
