---
name: write-episodes
description: >-
  Write new episodes of How I Met Your LLM. Runs a quick pitch session, then launches episode-writer agents in
  parallel, one per episode, and checks their work. Use when asked to write, generate or add episodes.
  Args: a count ("3"), pitches ("Barney gets banned from Costco; Robin's hockey team"), or both.
---

# Write episodes

Episodes are pre-written JSON files in `episodes/` that air in code order on a loop. Each one is written by an
`episode-writer` agent (`.claude/agents/episode-writer.md`), which holds the craft guide. Your job is showrunner:
pick the stories, hand them out, and hold the bar.

## 1. Pitch session

Run `bun run episodes list` to see what has aired and the next free code, and `bun run episodes ledger` for the
continuity so far (open bets and promises are good story seeds). Work out how many episodes to write: the
number in the args, one per pitch given, or 1 if the args say neither.
Read [the story-structure reference](../../../docs/story-structure-reference.md) for researched examples and
the supported ways to open on the story, use narration, and cut to the kids.

For each episode you'll write, settle on a premise. Use the user's pitches as given. For any others, brainstorm
about twice as many as you need and keep the strongest and most varied set. Vary which character leads the A-story,
the sets, the guest stars and the kind of comic engine (a scheme, a rule, a bet, a secret, a misunderstanding).
Favor characters and sets the catalog has used least. Assign consecutive codes starting at the next free one.
Read the openings and endings of a few recent episodes. For each pitch, choose an opening image/first speaker,
where (if anywhere) the kids interrupt, and an ending device. Compare these across the batch: vary repeated
defaults without a quota or rotation. A couch-free episode and an episode with only a middle couch interruption
are both valid; Future Ted's voice-over does not require showing the kids.

## 2. Writers' room

Launch one `episode-writer` agent per episode, all in the same message so they run in parallel. Give each one:
- its code, and the exact file name pattern `episodes/<code lowercased>-<slug>.json`
- its premise (the pitch, a logline, or just a lead character and an engine; leave the writer room to find the story)
- any characters or sets to feature
- the proposed opening, couch placement and ending, with the story reason (the writer may improve them)
- one line on each of the *other* episodes being written now, including their framing choices, so they don't overlap

## 3. Notes and sign-off

When the writers report back:
1. Run `bun run episodes check` (all episodes) and `bun test`. Every episode must have 0 errors and the tests must pass.
2. Read each new episode with `bun run episodes read <file>`. Hold it to the bar: a real story, character-specific
   jokes, scenes that end where they should (a button or a deliberate quiet ending), a heart beat that isn't
   explained away, and an earned ending (dialogue, visual payoff, kids or narration). Cues, cards and looks should
   be choices, not decoration; the laugh track should be restrained (no cheering, rare `aww`/`ooh`/`gasp`).
   Check scene length (`read` prints each scene's line count): most scenes 5-20 lines, none over 25; send long
   ones back to be cut or split by intercutting. Check that the opening hooks us, that every couch visit has a story trigger, and that narration adds something
   beyond what we just saw. Compare the batch's first images and last beats; don't accept identical framing with
   different nouns. If an episode falls short,
   send its writer specific notes with SendMessage, for example "scene 2 sags in the middle; Robin has nothing to
   play; the runner never pays off". Then re-check.
3. Watch at least one new episode in the running app (`bun dev`, then open `/?ep=<CODE>&dev&mute`) and take
   screenshots of a couple of scenes. Per the project rules, check the framing in each scene.
4. Report each new episode to the user: code, title, logline and a favorite line. Don't commit unless asked.
