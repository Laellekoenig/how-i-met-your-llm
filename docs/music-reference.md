# Music in How I Met Your Mother

Research checked 7 October 2026. These production interviews and examples explain musical choices; they are
not a survey of scored screen time. The restraint below is our writing policy, informed by those choices and
the request to reduce music. It is not a claim that the original had a fixed cue limit or avoided underscore.

## What the production describes

| Use | Evidence | Writing implication |
| --- | --- | --- |
| Original score and transitions | Composer John Swihart distinguishes HIMYM from sitcoms scored only at transitions. He describes specific dramatic needs, endings that were almost always scored, frequent cues over a minute, and no four-minute cues. [GoSeeTalk interview, 23 September 2013](https://goseetalk.com/interview-film-and-tv-composer-john-swihart/) | Give a cue a defined story span. An earned ending can sustain music; this does not justify a bed running through unrelated conversations. |
| Songs at revelations and turning points | Craig Thomas recalls the pilot's Aunt Robin reveal with “Back on the Chain Gang,” the season-one finale's collision of Ted's happiness and Marshall's loss with “This Modern Love,” and the Mother's reveal with “Simple Song.” [OK! interview, 7 October 2013](https://okmagazine.com/news/ok-exclusive-the-producers-of-how-i-met-your-mother-made-a-playlist-for-the-mother/) | Save a prominent musical entrance for a change in what the audience understands or feels. A bittersweet contrast can do more than simply label a scene “sad.” |
| Music that characters perform or react to | Thomas points to Barney and Robin's wedding dance to “Groove Is in the Heart” as a demonstration of their chemistry. [Same interview](https://okmagazine.com/news/ok-exclusive-the-producers-of-how-i-met-your-mother-made-a-playlist-for-the-mother/) | A song or dance should reveal character or deliver the joke; being in a bar or on a date is not enough reason for background music. |
| A musical set piece | “Nothing Suits Me Like a Suit” was a specially produced number for the 100th episode, with orchestral sections, choir and choreography. [ScoringSessions production report, 11 January 2010](https://scoringsessions.com/2010/01/11/how-i-met-your-mother-celebrates-its-100th-episode-with-a-big-musical-number) | Treat an elaborate musical sequence as a story event. Do not turn every comic scheme into a scored production number. |

## Apply this to new episodes

- **Start unscored.** Ordinary bar banter, apartment conversations, exposition, arguments and most scenes should
  play with dialogue, pauses, reactions and room ambience. A whole episode without authored music is valid;
  the player already supplies main-title and closing-credit music.
- **Choose the reason before the mood.** Keep music for an earned emotional turn, a montage that compresses
  time, a deliberately heightened fantasy/parody, or a performance where music is part of the action or joke.
  “This is funny,” “Barney has a scheme,” “Ted is narrating,” and “this is the ending” are not sufficient reasons.
- **Enter late and leave deliberately.** Let the setup and performance establish the feeling. Bring music in
  where it adds a new layer; take it out when that passage resolves, before ordinary dialogue resumes. Crossing
  a cut is fine when the same musical sequence continues. Avoid covering an entire scene merely to support its
  final line, and avoid cycling through moods as a substitute for returning to an unscored scene.
- **Protect contrast.** A confession, uncomfortable pause or final look can land without music. Do not append
  a tender cue to every heart beat or closing narration. Brief transition stings and sound effects are optional
  punctuation too; reducing underscore should not produce a sting on every cut or punchline.
- **Review the audible span.** For each cue, identify its story purpose, entry and exit. Follow it through scene
  changes and nested beats, counting the dialogue it actually covers. Remove or shorten music that merely
  repeats the acting. Compare recent episodes and the batch for the same automatic scored opening or ending.
  There is no required cue count, music percentage or rotation of moods.

## Encoding and playback details

The available cues are original synthesized beds, not the licensed recordings named above. Borrow the
dramatic function; use only the music IDs from `bun run bible` and original invented lyrics.

- A `score` beat loops across dialogue, cutaways, returns and scene changes. It does **not** stop just because
  its scene or cutaway ends. Pair each start with a planned exit; normally use
  `{ "type": "score", "music": "none" }` at the end of the intended passage.
- Main titles clear the cold-open score before the theme; closing credits clear the final score. Music ducks
  automatically under all speech and recovers gently afterward. This helps intelligibility; it does not justify
  additional cues or longer coverage.
- `none` stops music while keeping/restoring room ambience. `silence` stops music **and** suppresses room tone
  until the next score beat or scene. Use `silence` only when that extra hush is the intended effect; it is not
  the normal way to leave dialogue unscored.
- A `montage` requires a music mood and stops its own bed on return, but any previously active `score` resumes.
  Stop unwanted underscore before the montage. For an unscored series of cuts, use scenes/cutaways instead of
  inventing `montage.music: "none"`.
- Sung lines are a cappella by default. Add `accompanied: true` only when guitar accompaniment serves the bit.
  Ordinary scene cuts are already silent; omit their `sound`, or use `sound: "none"` to suppress a rewind cue.

For example, with Lily and Marshall already in the scene, a short earned passage can return to room tone
before the next exchange:

```json
[
  { "type": "say", "character": "lily", "to": "marshall", "line": "You kept the spare key?" },
  { "type": "score", "music": "tender" },
  { "type": "say", "character": "marshall", "to": "lily", "line": "I wanted you to have somewhere to come back to." },
  { "type": "pause", "seconds": 1 },
  { "type": "score", "music": "none" }
]
```

The exchange may also work better with both score beats omitted. Decide from the scene, not from a need to
demonstrate the audio tools.

Use `bun run episodes check` for total spoken-beat coverage and the longest continuous run, and
`bun run episodes read <file>` for each cue's entry, exit and scene span. Replays are counted as performed,
and montage returns restore the earlier score. A warning when music covers most of a substantial episode's
dialogue is a review prompt, not a validity limit. The counts exclude titles/credits and count overlapping
narration at its entry; they do not estimate seconds or replace listening to the episode.
