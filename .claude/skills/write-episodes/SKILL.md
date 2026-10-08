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
the supported ways to open on the story and use narration. The kids barely talk: their couch scenes were recorded
before the series, so they only have the stock takes in `bun run bible`, and Future Ted does the talking.
Read [the music reference](../../../docs/music-reference.md) for the musical approach: most scenes and ordinary
dialogue stay unscored; music needs a specific story purpose and a planned entry and exit. Zero authored music is valid.
Read [the location reference](../../../docs/location-reference.md) for home-base storytelling and restrained
use of special destinations such as laser tag and the Hoser Hut.

For each episode you'll write, settle on a premise. Use the user's pitches as given. For any others, brainstorm
about twice as many as you need and keep the strongest and most varied set. Vary which character leads the A-story,
the sets, the guest stars and the kind of comic engine (a scheme, a rule, a bet, a secret, a misunderstanding).
Give underused characters a turn when the story suits them; choose sets for the story, never to fill a catalog quota.
MacLaren's and the apartment remain home base. Special locations such as `laser_tag` and `hoser_hut` must not be
an episode's main location: keep special-location material to one or two brief, motivated scenes in total when
needed, with the main story developing in the regular settings. An episode with no special visit is normal.
Check recent episodes and the current batch for repeated destinations; avoid consecutive returns by default and
don't substitute a different novelty venue in every episode. Assign consecutive codes starting at the next free one.
Read the openings and endings of a few recent episodes. For each pitch, choose an opening image/first speaker,
whether a stock kid take earns a spot (usually not), and an ending device. Keep the opening short: everything before the
main titles is a quick hook of roughly 3-8 lines (never more than 10) that ends on a button, and the setup
continues after the titles. Compare these across the batch: vary repeated defaults without a quota or rotation. A couch-free episode
is the norm; Future Ted's voice-over does not require showing the kids, and a couch opening is Ted talking, not the kids.

## 2. Writers' room

Launch one `episode-writer` agent per episode, all in the same message so they run in parallel. Give each one:
- its code, and the exact file name pattern `episodes/<code lowercased>-<slug>.json`
- its premise (the pitch, a logline, or just a lead character and an engine; leave the writer room to find the story)
- any characters or sets to feature
- the main location and any special visit's story purpose and brief scope; a requested set can feature in a short scene
- the proposed opening, any kid take and ending, with the story reason (the writer may improve them)
- any story reason for music, otherwise an unscored default; the writer should plan both ends of any cue
- one line on each of the *other* episodes being written now, including their framing choices and special locations, so they don't overlap

## 3. Notes and sign-off

When the writers report back:
1. Run `bun run episodes check` (all episodes) and `bun test`. Every episode must have 0 errors and the tests must pass.
2. Read each new episode with `bun run episodes read <file>`. Hold it to the bar: a real story, character-specific
   jokes, scenes that end where they should (a button or a deliberate quiet ending), a heart beat that isn't
   explained away, and an earned ending (dialogue, visual payoff, a stock kid reaction or narration). Cues, cards and looks should
   be choices, not decoration; the laugh track should be restrained (no cheering, rare `aww`/`ooh`/`gasp`).
   Check scene length (`read` prints each scene's line count): most scenes 5-20 lines, none over 25; send long
   ones back to be cut or split by intercutting. Check that the opening hooks us and gets to the titles fast:
   the pre-titles material (`coldOpen` + `couch`, or `scenes[0]` in a story opening) should be about 3-8 lines
   and never over 10; send longer ones back to be trimmed or to move the setup after the titles. Check that
   the kids have at most one or two recorded takes, each with a setup that makes the stock line land, and that
   narration adds something beyond what we just saw. Compare the
   batch's first images and last beats; don't accept identical framing with different nouns. Check music coverage as well: most dialogue should be unscored, each cue needs a purpose
   and an exit, and music must not leak through scene/cutaway returns or resume unexpectedly after a montage.
   Cut routine tender endings, scene-long mood beds and decorative stings; compare the batch for repeated music
   habits without imposing a cue quota. Check location balance: special visits stay brief and supporting, never
   the main setting. Count their full presence through resumed scenes, cutaways, replays and montages; two long
   scenes or many tiny returns can still dominate. Compare recent episodes and the batch for overuse, and move
   generic conversations back to the regular settings. If an episode falls short,
   send its writer specific notes with SendMessage, for example "scene 2 sags in the middle; Robin has nothing to
   play; the runner never pays off". Then re-check.
3. Watch at least one new episode in the running app (`bun dev`, then open `/?ep=<CODE>&dev&mute`) and take
   screenshots of a couple of scenes. Per the project rules, check the framing in each scene.
4. Report each new episode to the user: code, title, logline and a favorite line. Don't commit unless asked.
